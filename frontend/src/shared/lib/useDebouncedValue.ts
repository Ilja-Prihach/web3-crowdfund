import { useEffect, useState } from "react";

// Значение, которое догоняет исходное только после паузы: поиск уходит в сеть, когда пользователь
// перестал печатать, а не на каждую букву.
export function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    // Новая буква до истечения паузы отменяет прошлый таймер.
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
