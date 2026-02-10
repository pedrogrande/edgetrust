/**
 * File Retrieval API Endpoint
 * GET /api/trust-builder/proofs/[id]/file
 *
 * Story: S2-03 - File Upload Proofs with SHA-256 Hashing
 *
 * Security:
 * - Authenticated access required
 * - Role-based authorization (claim submitter, reviewers, guardians)
 * - Files served with correct Content-Type header
 * - No public file URLs (access controlled via API)
 */

import type { APIRoute } from 'astro';
import { sql } from '@/lib/db/connection';
import { getCurrentUser } from '@/lib/auth';

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const { id } = params;

    if (!id) {
      return new Response('File ID is required', { status: 400 });
    }

    // Auth check
    const user = await getCurrentUser(request, sql);
    if (!user) {
      return new Response(
        'Unauthorized - You must be signed in to view files',
        {
          status: 401,
        }
      );
    }

    // First, check if this is an uploaded file (temporary staging)
    const [uploadedFile] = await sql`
      SELECT 
        file_data,
        file_hash,
        file_size,
        mime_type,
        member_id,
        original_filename
      FROM uploaded_files
      WHERE id = ${id}
    `;

    if (uploadedFile) {
      // Check if user owns this file
      if (uploadedFile.member_id !== user.id) {
        return new Response(
          'Forbidden - You can only access your own uploaded files',
          {
            status: 403,
          }
        );
      }

      // Serve file
      return new Response(uploadedFile.file_data, {
        status: 200,
        headers: {
          'Content-Type': uploadedFile.mime_type,
          'Content-Length': uploadedFile.file_size.toString(),
          'Content-Disposition': `inline; filename="${uploadedFile.original_filename || 'file'}"`,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    // If not in uploaded_files, check proofs table
    const [proof] = await sql`
      SELECT 
        p.file_data,
        p.file_hash,
        p.file_size,
        p.mime_type,
        c.member_id as claim_submitter_id,
        c.task_id,
        c.reviewer_id
      FROM proofs p
      JOIN claims c ON p.claim_id = c.id
      WHERE p.id = ${id}
    `;

    if (!proof) {
      return new Response('File not found', { status: 404 });
    }

    // Check authorization: user must be claim submitter, reviewer, or guardian
    const isClaimSubmitter = proof.claim_submitter_id === user.id;
    const isReviewer = proof.reviewer_id === user.id;
    const isGuardian = user.role === 'guardian';

    if (!isClaimSubmitter && !isReviewer && !isGuardian) {
      return new Response(
        'Forbidden - You do not have permission to view this file',
        { status: 403 }
      );
    }

    // Serve file
    return new Response(proof.file_data, {
      status: 200,
      headers: {
        'Content-Type': proof.mime_type,
        'Content-Length': proof.file_size.toString(),
        'Content-Disposition': `inline; filename="proof-${id}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('File retrieval error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
