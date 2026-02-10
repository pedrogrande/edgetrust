/**
 * Cryptographic hashing utilities for file integrity verification
 *
 * Story: S2-03 File Upload Proofs
 * Purpose: Compute SHA-256 hashes for migration-ready file verification
 *
 * Migration Readiness:
 * - SHA-256 hashes enable IPFS CIDv1 verification
 * - Hashes stored in events log for tamper detection
 * - Compatible with blockchain merkle tree derivation
 */

/**
 * Compute SHA-256 hash from a File object (client-side)
 *
 * @param file - File object from file input
 * @returns Hexadecimal SHA-256 hash string (64 characters)
 *
 * @example
 * ```typescript
 * const file = document.querySelector('input[type="file"]').files[0];
 * const hash = await computeSHA256(file);
 * console.log(hash); // "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
 * ```
 */
export async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}

/**
 * Compute SHA-256 hash from a Buffer (server-side)
 *
 * @param buffer - ArrayBuffer or Buffer from uploaded file
 * @returns Hexadecimal SHA-256 hash string (64 characters)
 *
 * @example
 * ```typescript
 * const fileBuffer = await request.arrayBuffer();
 * const hash = await computeSHA256FromBuffer(fileBuffer);
 * ```
 */
export async function computeSHA256FromBuffer(
  buffer: ArrayBuffer | Buffer
): Promise<string> {
  const arrayBuffer = buffer instanceof Buffer ? buffer.buffer : buffer;
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}

/**
 * Verify file integrity by comparing computed hash against stored hash
 *
 * @param file - File to verify
 * @param expectedHash - SHA-256 hash from database
 * @returns true if hashes match, false otherwise
 *
 * @example
 * ```typescript
 * const isValid = await verifyFileIntegrity(file, storedHash);
 * if (!isValid) {
 *   throw new Error('File has been tampered with');
 * }
 * ```
 */
export async function verifyFileIntegrity(
  file: File,
  expectedHash: string
): Promise<boolean> {
  const computedHash = await computeSHA256(file);
  return computedHash === expectedHash;
}

/**
 * Format hash for display (truncate with ellipsis)
 *
 * @param hash - Full 64-character SHA-256 hash
 * @param length - Number of characters to display (default: 12)
 * @returns Truncated hash with ellipsis
 *
 * @example
 * ```typescript
 * formatHashForDisplay("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
 * // Returns: "e3b0c44298fc..."
 * ```
 */
export function formatHashForDisplay(
  hash: string,
  length: number = 12
): string {
  if (hash.length <= length) return hash;
  return `${hash.slice(0, length)}...`;
}
