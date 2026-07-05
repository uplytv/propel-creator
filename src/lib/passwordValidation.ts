/**
 * Platform-wide password rules — shared by /auth signup and the
 * 14-day-trial signup modal. Returns an error message, or null when valid.
 */
export const validatePassword = (pw: string): string | null => {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must contain at least one number.";
  return null;
};
