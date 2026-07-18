import { isProduction } from '../config/env.js';
import { sendEmail, isEmailConfigured } from './email/transport.js';
import { passwordResetEmail } from './email/templates.js';

/**
 * Out-of-band delivery for password reset codes.
 *
 * The reset code must never travel back in the HTTP response — whoever can
 * call `/auth/forgot-password` for an address would otherwise be able to reset
 * that account. It goes to the user's own inbox instead.
 *
 * When no SMTP transport is configured the code is written to the server log,
 * where an operator can reach it but a caller cannot. In production that is a
 * misconfiguration, so it is warned about loudly rather than failing silently.
 */
export async function deliverResetOtp(user, otp) {
  if (isEmailConfigured()) {
    const { subject, html, text } = passwordResetEmail({ otp });
    await sendEmail({ to: user.email, subject, html, text });
    return { delivered: true, channel: 'email' };
  }

  if (isProduction) {
    console.warn(
      `[auth] Password reset requested for user ${user._id} but no email transport is configured. ` +
        'The code was not sent. Set the EMAIL_* variables.',
    );
    return { delivered: false, channel: 'none' };
  }

  console.info(`[auth][dev] Password reset code for ${user.email}: ${otp}`);
  return { delivered: true, channel: 'console' };
}
