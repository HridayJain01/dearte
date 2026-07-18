import { isProduction } from '../config/env.js';

/**
 * Out-of-band delivery for password reset codes.
 *
 * The reset code must never travel back in the HTTP response — whoever can
 * call `/auth/forgot-password` for an address would otherwise be able to reset
 * that account. Until a real transport is wired up, the code is written to the
 * server log only, where it is reachable by an operator but not by a caller.
 *
 * TODO(deploy): implement an actual transport (SMTP/nodemailer or the existing
 * WhatsApp Cloud API service) before buyers use self-service password reset.
 * The EMAIL_* variables in .env.example are reserved for this and are not yet
 * consumed anywhere.
 */
export async function deliverResetOtp(user, otp) {
  if (isProduction) {
    console.warn(
      `[auth] Password reset requested for user ${user._id} but no delivery transport is configured. ` +
        'The code was not sent. Configure SMTP or WhatsApp delivery.',
    );
    return { delivered: false, channel: 'none' };
  }

  console.info(`[auth][dev] Password reset code for ${user.email}: ${otp}`);
  return { delivered: true, channel: 'console' };
}
