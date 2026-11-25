import { Logger } from "@nestjs/common";
import type { SendEmail } from "./email.types.js";

const logger = new Logger("EmailSender");

/**
 * Zero-config default — no RESEND_API_KEY means every email-sending code path
 * still runs end-to-end, logged instead of delivered. See select-email-sender.ts.
 */
// biome-ignore lint/suspicious/useAwait: SendEmail's contract is always async
export const sendEmailViaConsole: SendEmail = async (message) => {
  logger.log(
    `[EMAIL] To: ${message.to} | Subject: ${message.subject}\n${message.text}`
  );
};
