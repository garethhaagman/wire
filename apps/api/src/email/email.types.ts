export interface EmailMessage {
  html?: string;
  subject: string;
  text: string;
  to: string;
}

export type SendEmail = (message: EmailMessage) => Promise<void>;
