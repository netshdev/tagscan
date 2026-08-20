import type { ImageProbe } from "./types";

/** Stop reading a social image past this point - nothing legitimate is bigger. */
const MAX_READ_BYTES = 12 * 1024 * 1024;
const TIMEOUT_MS = 12_000;

/* ---------------------------------------------------------------------------
   Dimension sniffing

   Parsing the header ourselves avoids both an image-decoding dependency and a
   second browser round trip. Covers the formats platforms actually accept.
--------------------------------------------------------------------------- */

interface Size {
  width: number;
  height: number;
}

function pngSize(b: Buffer): Size | null {
  // 8-byte signature, then IHDR whose width/height are big-endian uint32s.
  if (b.length < 24) return null;
  if (b.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function gifSize(b: Buffer): Size | null {
  if (b.length < 10) return null;
  if (b.toString("ascii", 0, 3) !== "GIF") return null;
  return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
}

function jpegSize(b: Buffer): Size | null {
  if (b.length < 4 || b.readUInt16BE(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset < b.length - 9) {
    if (b[offset] !== 0xff) {
      offset++; // resync past padding
      continue;
    }
    const marker = b[offset + 1];
    // SOFn frame headers carry the dimensions; SOF4/8/12 are not frame headers.
    const isFrameHeader =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isFrameHeader) {
      return { height: b.readUInt16BE(offset + 5), width: b.readUInt16BE(offset + 7) };
    }
    // Standalone markers have no length field.
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    offset += 2 + b.readUInt16BE(offset + 2);
  }
  return null;
}

function webpSize(b: Buffer): Size | null {
  if (b.length < 30) return null;
  if (b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }

  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8 ") {
    // Lossy: 14-bit dimensions after the 3-byte start code at offset 23.
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    // Lossless: 14 bits each, packed across 4 bytes little-endian.
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    // Extended: 24-bit canvas dimensions minus one.
    const width = 1 + (b[24] | (b[25] << 8) | (b[26] << 16));
    const height = 1 + (b[27] | (b[28] << 8) | (b[29] << 16));
    return { width, height };
  }
  return null;
}

/** SVG has no intrinsic pixel size worth reporting, and no platform renders it. */
function sniffSize(buffer: Buffer): Size | null {
  return (
    pngSize(buffer) ?? jpegSize(buffer) ?? gifSize(buffer) ?? webpSize(buffer) ?? null
  );
}

/* --------------------------------------------------------------------------- */

/**
 * Fetches a social image the way a platform crawler would and reports what it
 * found. Never throws - a failed probe is itself a finding, so every outcome
 * comes back as a populated `ImageProbe`.
 */
export async function probeImage(url: string): Promise<ImageProbe> {
  const base: ImageProbe = {
    url,
    ok: false,
    status: null,
    contentType: null,
    bytes: null,
    width: null,
    height: null,
    error: null,
  };

  if (!/^https?:\/\//i.test(url)) {
    return { ...base, error: "Not an absolute http(s) URL" };
  }

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        // Identify as a crawler: some CDNs serve different bytes to browsers.
        "User-Agent": "Mozilla/5.0 (compatible; TagScanBot/1.0; +link-preview-audit)",
        Accept: "image/*,*/*;q=0.8",
      },
    });

    const contentType = response.headers.get("content-type");
    if (!response.ok) {
      return { ...base, status: response.status, contentType, error: response.statusText };
    }

    // Stream so a mislabelled multi-hundred-megabyte response can't exhaust memory.
    const chunks: Buffer[] = [];
    let bytes = 0;
    if (response.body) {
      for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
        bytes += chunk.byteLength;
        // Header parsing only needs the first chunks; keep a bounded prefix.
        if (chunks.length < 8) chunks.push(Buffer.from(chunk));
        if (bytes > MAX_READ_BYTES) break;
      }
    }

    const prefix = Buffer.concat(chunks);
    const size = sniffSize(prefix);

    return {
      url,
      ok: true,
      status: response.status,
      contentType: contentType?.split(";")[0]?.trim() ?? null,
      bytes,
      width: size?.width ?? null,
      height: size?.height ?? null,
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ...base,
      error: /timeout|aborted/i.test(message) ? "Request timed out" : message,
    };
  }
}

/** Probes every candidate image concurrently - they're independent requests. */
export async function probeImages(urls: string[]): Promise<ImageProbe[]> {
  if (urls.length === 0) return [];
  return Promise.all(urls.map(probeImage));
}
