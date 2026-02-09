/**
 * Sign-Out API Endpoint
 * POST /api/trust-builder/auth/signout
 *
 * Clears the session cookie, effectively signing out the user.
 */

import type { APIRoute } from 'astro';
import { clearSessionCookie } from '@/lib/auth';

export const POST: APIRoute = async () => {
  try {
    // Clear session cookie
    const clearCookie = clearSessionCookie();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Signed out successfully',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': clearCookie,
        },
      }
    );
  } catch (error) {
    console.error('Sign-out error:', error);
    return new Response(JSON.stringify({ error: 'Failed to sign out' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
