/**
 * Sign-In API Endpoint
 * POST /api/trust-builder/auth/signin
 *
 * Initiates email-based authentication by generating
 * and sending a 6-digit verification code.
 */

import type { APIRoute } from 'astro';
import { generateCode, sendVerificationEmail } from '@/lib/auth';
import { storeVerificationCode } from '@/lib/auth/codes';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate 6-digit code
    const code = generateCode();

    // Store code with 15-minute expiration
    storeVerificationCode(email, code, 15);

    // Send verification email (S1: console log, S2: actual email)
    await sendVerificationEmail(email, code);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification code sent to your email',
        email: email.toLowerCase(),
        // S1 development aid: include expiration info
        expiresIn: '15 minutes',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Sign-in error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isEmailConfigError = message === 'Email delivery is not configured';

    return new Response(
      JSON.stringify({
        error: isEmailConfigError
          ? 'Email delivery is not configured'
          : 'Failed to send verification code',
        details: import.meta.env.DEV ? message : undefined,
      }),
      {
        status: isEmailConfigError ? 503 : 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
