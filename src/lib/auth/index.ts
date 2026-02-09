/**
 * Auth Utilities for Trust Builder
 *
 * Handles email-based authentication with magic codes,
 * session management, and member identity.
 */

import { Resend } from 'resend';

import type { Member } from '@/types/trust-builder';

/**
 * Generate a 6-digit numeric verification code
 */
export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send verification email with code
 * For S1: Log to console (stub for production email service)
 *
 * @param email - Recipient email address
 * @param code - 6-digit verification code
 */
export async function sendVerificationEmail(
  email: string,
  code: string
): Promise<void> {
  const apiKey = import.meta.env.RESEND_API_KEY;
  const fromAddress =
    import.meta.env.RESEND_FROM || 'Trust Builder <noreply@yourdomain.com>';

  if (!apiKey) {
    if (import.meta.env.DEV) {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║          Trust Builder Verification Code                  ║
╠═══════════════════════════════════════════════════════════╣
║  Email: ${email.padEnd(46)}  ║
║  Code:  ${code.padEnd(46)}  ║
╠═══════════════════════════════════════════════════════════╣
║  This code expires in 15 minutes                          ║
╚═══════════════════════════════════════════════════════════╝
  `);
      return;
    }

    throw new Error('Email delivery is not configured');
  }

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: fromAddress,
    to: email,
    subject: 'Your Trust Builder Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Your Trust Builder verification code</h2>
        <p>Your code is:</p>
        <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">
          ${code}
        </p>
        <p>This code expires in 15 minutes.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

/**
 * Session cookie configuration
 */
const SESSION_COOKIE_NAME = 'tb_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 days in seconds

/**
 * Create a session cookie for authenticated member
 *
 * @param memberId - UUID of the authenticated member
 * @returns Cookie header value
 */
export function createSessionCookie(memberId: string): string {
  // S1: Simple base64-encoded member ID
  // S2 enhancement: Use signed JWT with secret
  const sessionData = btoa(JSON.stringify({ memberId, createdAt: Date.now() }));

  return `${SESSION_COOKIE_NAME}=${sessionData}; HttpOnly; Path=/; Max-Age=${SESSION_MAX_AGE}; SameSite=Lax`;
}

/**
 * Parse session from cookie header
 *
 * @param cookieHeader - Request cookie header
 * @returns Member ID if valid session, null otherwise
 */
export function parseSession(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const sessionCookie = cookies.find((c) =>
    c.startsWith(`${SESSION_COOKIE_NAME}=`)
  );

  if (!sessionCookie) return null;

  try {
    const sessionData = sessionCookie.substring(SESSION_COOKIE_NAME.length + 1);
    const decoded = JSON.parse(atob(sessionData));

    // Check expiration (14 days)
    const age = Date.now() - decoded.createdAt;
    if (age > SESSION_MAX_AGE * 1000) {
      return null;
    }

    return decoded.memberId;
  } catch (error) {
    console.error('Session parse error:', error);
    return null;
  }
}

/**
 * Clear session cookie
 *
 * @returns Cookie header value to clear session
 */
export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

/**
 * Get current authenticated member from request
 *
 * @param request - Astro/API request object
 * @param sql - NeonDB query function
 * @returns Member if authenticated, null otherwise
 */
export async function getCurrentUser(
  request: Request,
  sql: any
): Promise<Member | null> {
  const cookieHeader = request.headers.get('cookie');
  const memberId = parseSession(cookieHeader);

  if (!memberId) return null;

  try {
    const result = await sql`
      SELECT * FROM members WHERE id = ${memberId}
    `;

    if (result.length === 0) return null;

    return result[0] as Member;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

/**
 * Require authentication middleware
 * Returns member or throws 401 error response
 *
 * @param request - API request
 * @param sql - NeonDB query function
 * @returns Authenticated member
 * @throws Response with 401 if not authenticated
 */
export async function requireAuth(request: Request, sql: any): Promise<Member> {
  const member = await getCurrentUser(request, sql);

  if (!member) {
    throw new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return member;
}
