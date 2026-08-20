"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

type Handler = () => void;

interface AppResetValue {
  /** Called by the app to publish its reset; pass null on unmount. */
  register: (handler: Handler | null) => void;
  /** Runs the registered reset. Returns false when nothing is registered. */
  reset: () => boolean;
}

const AppResetContext = createContext<AppResetValue | null>(null);

/**
 * Lets the site header reach into the app's state without owning it.
 *
 * The header lives in the root layout and the app lives in the page, so they have
 * no props relationship - but clicking the logo has to abandon an in-flight scan,
 * which only the app can do. The app registers a reset here and the header calls
 * it; a plain link would leave the scan running, and its result would then land on
 * a user who had already navigated away.
 *
 * The handler sits in a ref so publishing it never triggers a re-render of the
 * subtree, which would otherwise be a render loop.
 */
export function AppResetProvider({ children }: { children: ReactNode }) {
  const handler = useRef<Handler | null>(null);

  const register = useCallback((next: Handler | null) => {
    handler.current = next;
  }, []);

  const reset = useCallback(() => {
    if (!handler.current) return false;
    handler.current();
    return true;
  }, []);

  const value = useMemo(() => ({ register, reset }), [register, reset]);

  return <AppResetContext.Provider value={value}>{children}</AppResetContext.Provider>;
}

/** Null outside the provider, so consumers must handle its absence. */
export function useAppReset(): AppResetValue | null {
  return useContext(AppResetContext);
}
