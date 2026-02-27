/**
 * Extract a human-readable error message from RTK Query errors or unknown error types.
 */
export function getErrorMessage(error: unknown): string {
  if (!error) return 'Something went wrong';

  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;

    // RTK Query error format: { data: { message: '...' } }
    if (err.data && typeof err.data === 'object') {
      const data = err.data as Record<string, unknown>;
      if (typeof data.message === 'string') return data.message;
      if (typeof data.error === 'string') return data.error;
    }

    // Standard error format
    if (typeof err.message === 'string') return err.message;

    // { error: 'string' } format
    if (typeof err.error === 'string') return err.error;
  }

  if (typeof error === 'string') return error;

  return 'Something went wrong';
}
