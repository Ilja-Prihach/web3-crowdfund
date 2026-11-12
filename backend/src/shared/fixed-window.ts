// Счётчик с фиксированным окном: не больше max разрешений за windowMs. Живёт в памяти одного процесса.
export function createFixedWindowLimiter(max: number, windowMs: number, now = Date.now) {
  let windowStart = Number.NEGATIVE_INFINITY;
  let used = 0;
  return () => {
    const time = now();
    if (time - windowStart >= windowMs) {
      windowStart = time;
      used = 0;
    }
    if (used >= max) return false;
    used++;
    return true;
  };
}
