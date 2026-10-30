/**
 * Whether the value is an IANA timezone known to the runtime.
 */
export const isTimezone = (value: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
};
