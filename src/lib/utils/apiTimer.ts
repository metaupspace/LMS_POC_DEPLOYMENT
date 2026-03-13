/**
 * Wrap an API handler with execution time logging.
 * Logs slow APIs (>500ms) as warnings.
 */
export function withTiming<T extends (..._a: unknown[]) => Promise<unknown>>(
  handler: T,
  routeName: string
): T {
  return (async (..._a: unknown[]) => {
    const start = Date.now();
    try {
      const result = await handler(..._a);
      const duration = Date.now() - start;

      if (duration > 500) {
        console.warn(`[API:SLOW] ${routeName}: ${duration}ms`);
      } else if (duration > 200) {
        console.info(`[API] ${routeName}: ${duration}ms`);
      }

      return result;
    } catch (err) {
      const duration = Date.now() - start;
      console.error(`[API:ERROR] ${routeName}: ${duration}ms`, err);
      throw err;
    }
  }) as T;
}
