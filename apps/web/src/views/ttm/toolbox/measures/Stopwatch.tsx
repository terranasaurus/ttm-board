import { useEffect, useRef, useState } from "react";

const fmt = (ms: number) => {
  const s = ms / 1000;
  if (s < 60) return s.toFixed(1);
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

const btn =
  "rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-40";

/**
 * Stopwatch for timed tests. Each "Stop" records a trial; onTrials receives
 * all recorded times in seconds. With countdownMs it counts down instead and
 * stops itself at zero (used for the 6-minute walk), counting laps.
 */
export function Stopwatch({
  onTrials,
  countdownMs,
  onLaps,
}: {
  onTrials?: (seconds: number[]) => void;
  countdownMs?: number;
  onLaps?: (laps: number) => void;
}) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [trials, setTrials] = useState<number[]>([]);
  const [laps, setLaps] = useState(0);
  const start = useRef(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const e = performance.now() - start.current;
      if (countdownMs && e >= countdownMs) {
        setElapsed(countdownMs);
        setRunning(false);
        // iOS Safari has no vibrate().
        if ("vibrate" in navigator) navigator.vibrate(400);
        return;
      }
      setElapsed(e);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [running, countdownMs]);

  const go = () => {
    start.current = performance.now() - (countdownMs ? elapsed : 0);
    if (!countdownMs) setElapsed(0);
    setRunning(true);
  };
  const stop = () => {
    setRunning(false);
    if (!countdownMs) {
      const t = Math.round(elapsed / 100) / 10;
      const next = [...trials, t];
      setTrials(next);
      onTrials?.(next);
    }
  };
  const reset = () => {
    setRunning(false);
    setElapsed(0);
    setTrials([]);
    setLaps(0);
    onTrials?.([]);
    onLaps?.(0);
  };
  const lap = () => {
    const n = laps + 1;
    setLaps(n);
    onLaps?.(n);
  };

  const shown = countdownMs ? Math.max(0, countdownMs - elapsed) : elapsed;
  const done = countdownMs !== undefined && elapsed >= countdownMs;

  return (
    <div className="rounded-md border border-light-500 p-3 dark:border-dark-400">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[5.5rem] text-3xl font-extrabold tabular-nums text-light-1000 dark:text-dark-1000" aria-live="off">
          {fmt(shown)}
          {!countdownMs && <span className="ml-1 text-sm font-semibold text-light-900 dark:text-dark-900">s</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {running ? (
            <button type="button" onClick={stop} className={`${btn} bg-ttm-orange text-white hover:bg-ttm-orange-hover`}>
              Stop
            </button>
          ) : (
            <button type="button" onClick={go} disabled={done} className={`${btn} bg-ttm-green text-white hover:opacity-90`}>
              {countdownMs && elapsed > 0 ? "Resume" : "Start"}
            </button>
          )}
          {countdownMs && (
            <button
              type="button"
              onClick={lap}
              disabled={!running}
              className={`${btn} border border-ttm-green text-ttm-green dark:border-ttm-gold dark:text-ttm-gold`}
            >
              Lap ({laps})
            </button>
          )}
          <button type="button" onClick={reset} className={`${btn} text-light-900 hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-200`}>
            Reset
          </button>
        </div>
      </div>
      {!countdownMs && trials.length > 0 && (
        <p className="mt-2 text-xs text-light-900 dark:text-dark-900">
          Trials: {trials.map((t) => `${t.toFixed(1)} s`).join(" · ")}
        </p>
      )}
      {done && <p className="mt-2 text-sm font-semibold text-ttm-orange">Time. Mark where the child stopped.</p>}
    </div>
  );
}
