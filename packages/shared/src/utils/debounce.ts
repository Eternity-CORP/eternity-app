/**
 * Debounce utility — delays invoking `func` until `wait` ms have elapsed
 * since the last invocation.
 */
export function debounce<T extends (...args: string[]) => void>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
