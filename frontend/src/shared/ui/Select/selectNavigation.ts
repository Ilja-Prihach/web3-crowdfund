export function getNextOptionIndex(currentIndex: number, optionCount: number, direction: 1 | -1) {
  if (optionCount <= 0) return -1;
  return (currentIndex + direction + optionCount) % optionCount;
}
