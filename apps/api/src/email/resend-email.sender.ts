import { Resend } from "resend";
import type { SendEmail } from "./email.types.js";

/** Real delivery via Resend — selected only when RESEND_API_KEY is set, see select-email-sender.ts. */
export function sendEmailViaResend(apiKey: string, from: string): SendEmail {
  const resend = new Resend(apiKey);
  return async (message) => {
    await resend.emails.send({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
    });
  };
}
