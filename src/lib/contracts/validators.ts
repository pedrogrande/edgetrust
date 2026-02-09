/**
 * Validation utilities for quasi-smart contracts
 * Centralizes validation logic for reuse across API endpoints
 */

/**
 * UUID v4 validation pattern
 * Learned from S1-03: Return 400 (not 500) for malformed UUIDs
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate if a string is a valid UUID v4
 * @param uuid - String to validate
 * @returns true if valid UUID v4
 */
export function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

/**
 * Validate UUID and throw descriptive error if invalid
 * @param uuid - UUID to validate
 * @param fieldName - Name of the field for error message
 * @throws Error with 400-appropriate message
 */
export function validateUUID(uuid: string, fieldName: string): void {
  if (!isValidUUID(uuid)) {
    throw new Error(`Invalid ${fieldName}: must be a valid UUID v4 format`);
  }
}

/**
 * Validate proof text meets minimum requirements
 * @param text - Proof text content
 * @param minLength - Minimum character length (default 10)
 * @throws Error if validation fails
 */
export function validateProofText(text: string, minLength = 10): void {
  if (!text || text.trim().length === 0) {
    throw new Error('Proof text cannot be empty');
  }
  if (text.trim().length < minLength) {
    throw new Error(`Proof text must be at least ${minLength} characters`);
  }
}

/**
 * Sanitize user input to prevent XSS
 * Basic implementation for S1 — enhanced in S2
 */
export function sanitizeText(text: string): string {
  return text
    .trim()
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
