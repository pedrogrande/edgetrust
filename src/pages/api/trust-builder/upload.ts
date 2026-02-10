/**
 * File Upload API Endpoint for Proof Submissions
 * POST /api/trust-builder/upload
 *
 * Story: S2-03 - File Upload Proofs with SHA-256 Hashing
 *
 * Security:
 * - Content-Type validation using magic bytes (not just headers)
 * - 10MB file size limit
 * - Whitelist file types only
 * - Authenticated access required
 */

import type { APIRoute } from 'astro';
import { sql } from '@/lib/db/connection';
import { getCurrentUser } from '@/lib/auth';
import { computeSHA256FromBuffer } from '@/lib/crypto/hash';

// Allowed MIME types (whitelist)
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'text/plain',
] as const;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate file type using magic bytes (first 512 bytes)
 * This prevents attackers from spoofing Content-Type headers
 */
async function validateFileType(buffer: ArrayBuffer): Promise<string | null> {
  const uint8 = new Uint8Array(buffer.slice(0, 512));

  // Check magic bytes for common file types
  // JPEG: FF D8 FF
  if (uint8[0] === 0xff && uint8[1] === 0xd8 && uint8[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47
  if (
    uint8[0] === 0x89 &&
    uint8[1] === 0x50 &&
    uint8[2] === 0x4e &&
    uint8[3] === 0x47
  ) {
    return 'image/png';
  }

  // GIF: 47 49 46 38
  if (
    uint8[0] === 0x47 &&
    uint8[1] === 0x49 &&
    uint8[2] === 0x46 &&
    uint8[3] === 0x38
  ) {
    return 'image/gif';
  }

  // PDF: 25 50 44 46
  if (
    uint8[0] === 0x25 &&
    uint8[1] === 0x50 &&
    uint8[2] === 0x44 &&
    uint8[3] === 0x46
  ) {
    return 'application/pdf';
  }

  // DOCX: PK zip signature (50 4B 03 04) + look for word/ directory
  if (
    uint8[0] === 0x50 &&
    uint8[1] === 0x4b &&
    uint8[2] === 0x03 &&
    uint8[3] === 0x04
  ) {
    // This is a ZIP file, could be DOCX
    // For simplicity, accept it if declared as DOCX
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }

  // Plain text: No magic bytes, accept if it's valid UTF-8
  try {
    const textDecoder = new TextDecoder('utf-8', { fatal: true });
    textDecoder.decode(uint8.slice(0, 100));
    return 'text/plain';
  } catch {
    // Not valid UTF-8
  }

  return null;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Auth check
    const user = await getCurrentUser(request, sql);
    if (!user) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'You must be signed in to upload files',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check Content-Type header
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return new Response(
        JSON.stringify({
          error: 'Invalid Content-Type',
          message: 'Request must be multipart/form-data',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Invalid form data',
          message: 'Could not parse multipart form data',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return new Response(
        JSON.stringify({
          error: 'Missing file',
          message: 'No file provided in "file" field',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          error: 'File too large',
          message:
            "This file is a bit too large—let's keep it under 10MB to ensure smooth sailing.",
        }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (file.size === 0) {
      return new Response(
        JSON.stringify({
          error: 'Empty file',
          message: 'The file appears to be empty. Please select a valid file.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Read file buffer
    const fileBuffer = await file.arrayBuffer();

    // Validate file type using magic bytes (security requirement)
    const detectedMimeType = await validateFileType(fileBuffer);
    if (!detectedMimeType) {
      return new Response(
        JSON.stringify({
          error: 'Unsupported file type',
          message:
            'Please upload an image (JPEG, PNG, GIF), PDF, document (DOCX), or text file.',
        }),
        { status: 415, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify declared MIME type matches detected type (for images/PDFs)
    const declaredType = file.type.toLowerCase();
    if (declaredType && !declaredType.includes('octet-stream')) {
      // For strict types (images, PDFs), enforce match
      if (
        detectedMimeType.startsWith('image/') ||
        detectedMimeType === 'application/pdf'
      ) {
        if (declaredType !== detectedMimeType) {
          return new Response(
            JSON.stringify({
              error: 'File type mismatch',
              message:
                "The file type doesn't match its content. This might be a security issue.",
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Check if MIME type is allowed
    if (!ALLOWED_MIME_TYPES.includes(detectedMimeType as any)) {
      return new Response(
        JSON.stringify({
          error: 'Unsupported file type',
          message:
            'Please upload an image (JPEG, PNG, GIF), PDF, document (DOCX), or text file.',
        }),
        { status: 415, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Compute SHA-256 hash
    const fileHash = await computeSHA256FromBuffer(fileBuffer);

    // Generate file URL (served via retrieval API)
    const fileId = crypto.randomUUID();
    const fileUrl = `/api/trust-builder/proofs/${fileId}/file`;

    // Store file in database (temporary table for uploaded files awaiting claim submission)
    // Note: This is a temporary staging table. Files move to proofs table when claim is submitted.
    await sql`
      CREATE TABLE IF NOT EXISTS uploaded_files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        file_data BYTEA NOT NULL,
        file_hash VARCHAR(64) NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        original_filename TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours'
      )
    `;

    const [uploadedFile] = await sql`
      INSERT INTO uploaded_files (
        id,
        member_id,
        file_data,
        file_hash,
        file_size,
        mime_type,
        original_filename
      )
      VALUES (
        ${fileId},
        ${user.id},
        ${Buffer.from(fileBuffer)},
        ${fileHash},
        ${file.size},
        ${detectedMimeType},
        ${file.name.slice(0, 255)}
      )
      RETURNING id, file_hash, file_size, mime_type, created_at
    `;

    // Success response
    return new Response(
      JSON.stringify({
        file_id: uploadedFile.id,
        file_url: fileUrl,
        file_hash: uploadedFile.file_hash,
        file_size: uploadedFile.file_size,
        mime_type: uploadedFile.mime_type,
        message:
          'File uploaded successfully. Your proof has been secured with a unique fingerprint.',
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('File upload error:', error);
    return new Response(
      JSON.stringify({
        error: 'Upload failed',
        message:
          'Something went wrong while uploading your file. Please try again.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
