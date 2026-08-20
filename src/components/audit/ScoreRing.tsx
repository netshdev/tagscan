import { gradeColor } from "@/lib/tone";

interface Props {
  score: number;
  grade: string;
  size?: number;
  stroke?: number;
  label?: string;
}

/**
 * Progress ring for the audit score.
 *
 * This animates `stroke-dashoffset`, which is a paint-only property rather than a
 * compositor one. That is a deliberate exception to the transform/opacity rule:
 * it runs once per result on a single small element, and it is the only technique
 * that actually draws an arc. The global `prefers-reduced-motion` rule collapses
 * it for anyone who has asked for less movement.
 */
export function ScoreRing({ score, grade, size = 148, stroke = 10, label }: Props) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);
  const color = gradeColor(grade);

  return (
    <div
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms var(--ease-out-quint)" }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[2.5rem] font-bold leading-none" style={{ color }}>
          {grade}
        </span>
        <span className="tnum mt-1 text-sm text-muted">{score}/100</span>
        {label ? (
          <span className="mt-0.5 text-[0.625rem] font-medium uppercase tracking-widest text-subtle">
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}
