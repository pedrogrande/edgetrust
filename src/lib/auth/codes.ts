/**
 * Verification Code Storage
 *
 * S1: In-memory store (lost on server restart)
 * S2 enhancement: Move to database table or Redis
 */

interface VerificationCodeEntry {
  email: string;
  code: string;
  expiresAt: number;
  attempts: number;
}

// In-memory store (S1 only)
const codeStore = new Map<string, VerificationCodeEntry>();

// Cleanup expired codes every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [email, entry] of codeStore.entries()) {
      if (entry.expiresAt < now) {
        codeStore.delete(email);
      }
    }
  },
  5 * 60 * 1000
);

/**
 * Store a verification code
 *
 * @param email - Email address
 * @param code - 6-digit code
 * @param expiresInMinutes - Expiration time (default: 15 minutes)
 */
export function storeVerificationCode(
  email: string,
  code: string,
  expiresInMinutes: number = 15
): void {
  const expiresAt = Date.now() + expiresInMinutes * 60 * 1000;

  codeStore.set(email.toLowerCase(), {
    email,
    code,
    expiresAt,
    attempts: 0,
  });
}

/**
 * Verify a code for an email address
 *
 * @param email - Email address
 * @param code - 6-digit code to verify
 * @returns true if valid, false otherwise
 */
export function verifyCode(email: string, code: string): boolean {
  const entry = codeStore.get(email.toLowerCase());

  if (!entry) {
    return false;
  }

  // Check expiration
  if (entry.expiresAt < Date.now()) {
    codeStore.delete(email.toLowerCase());
    return false;
  }

  // Check attempts (max 5)
  entry.attempts++;
  if (entry.attempts > 5) {
    codeStore.delete(email.toLowerCase());
    return false;
  }

  // Verify code
  if (entry.code === code) {
    codeStore.delete(email.toLowerCase()); // One-time use
    return true;
  }

  return false;
}

/**
 * Check if a code exists for an email (for testing/debugging)
 *
 * @param email - Email address
 * @returns true if code exists and not expired
 */
export function hasValidCode(email: string): boolean {
  const entry = codeStore.get(email.toLowerCase());
  return entry !== undefined && entry.expiresAt > Date.now();
}
