import type { ApiEnv } from "@wire/config";
import { sendEmailViaConsole } from "./console-email.sender.js";
import { sendEmailViaResend } from "./resend-email.sender.js";
import type { SendEmail } from "./email.types.js";

/**
 * Zero-config default: no RESEND_API_KEY means every email-sending code path still
 * works end-to-end (logged, not delivered). Set RESEND_API_KEY to switch to real
 * delivery — callers never change, only the sender this returns.
 */
export function selectEmailSender(env: ApiEnv): SendEmail {
  if (env.RESEND_API_KEY) {
    return sendEmailViaResend(env.RESEND_API_KEY, env.EMAIL_FROM_ADDRESS);
  }
  return sendEmailViaConsole;
}
