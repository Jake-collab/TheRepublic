import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!resend) resend = new Resend(key);
  return resend;
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendTicketReplyEmail({
  to,
  subject,
  userMessage,
  adminReply,
  ticketId,
}: {
  to: string;
  subject: string;
  userMessage: string;
  adminReply: string;
  ticketId: number;
}): Promise<{ sent: boolean; message: string }> {
  const client = getResend();
  if (!client) {
    return { sent: false, message: "RESEND_API_KEY is not configured. Add it to send email replies." };
  }

  const fromDomain = process.env.RESEND_FROM_EMAIL ?? "support@therepublic.app";

  try {
    await client.emails.send({
      from: `The Republic Support <${fromDomain}>`,
      to,
      subject: `Re: [Ticket #${ticketId}] ${subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0f0f0f; padding: 24px 32px; border-radius: 12px 12px 0 0;">
            <h2 style="color: #fff; margin: 0; font-size: 18px;">The Republic — Support</h2>
          </div>
          <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <p style="color: #374151; line-height: 1.6;">Hello,</p>
            <p style="color: #374151; line-height: 1.6;">Our support team has replied to your ticket: <strong>${subject}</strong></p>
            <div style="background: #f9fafb; border-left: 4px solid #6366f1; padding: 16px 20px; border-radius: 4px; margin: 20px 0;">
              <p style="color: #374151; line-height: 1.6; margin: 0; white-space: pre-wrap;">${adminReply}</p>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #9ca3af; font-size: 13px; line-height: 1.5;">
              Your original message:<br/>
              <em style="color: #6b7280;">"${userMessage.slice(0, 200)}${userMessage.length > 200 ? "…" : ""}"</em>
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
              Ticket #${ticketId} · The Republic Support
            </p>
          </div>
        </div>
      `,
    });
    return { sent: true, message: `Reply sent to ${to}` };
  } catch (err: any) {
    return { sent: false, message: err?.message ?? "Failed to send email" };
  }
}
