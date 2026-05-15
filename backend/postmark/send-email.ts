// ============================================
// POSTMARK EMAIL HELPER
// ============================================
// backend/postmark/send-email.ts
// Helper functions for sending transactional emails through Postmark

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  tag?: string;
  metadata?: Record<string, string>;
}

// Send email using Postmark API
async function sendEmail(options: EmailOptions): Promise<boolean> {
  const postmarkServerToken = Deno.env.get("POSTMARK_SERVER_TOKEN");
  const fromEmail = Deno.env.get("FROM_EMAIL") || "contact@therepublic.it.com";
  
  if (!postmarkServerToken) {
    console.error("POSTMARK_SERVER_TOKEN not configured");
    return false;
  }

  try {
    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": postmarkServerToken,
      },
      body: JSON.stringify({
        From: fromEmail,
        To: options.to,
        Subject: options.subject,
        TextBody: options.text,
        HtmlBody: options.html,
        Tag: options.tag,
        Metadata: options.metadata,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Postmark error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

// Send support ticket confirmation
async function sendSupportConfirmation(
  toEmail: string,
  ticketId: string,
  subject: string
): Promise<boolean> {
  return sendEmail({
    to: toEmail,
    subject: `Support Request #${ticketId.substring(0, 8)} - ${subject}`,
    text: `Your support request has been received.\n\nTicket ID: ${ticketId}\nSubject: ${subject}\n\nWe will respond within 24-48 hours.\n\nThank you,\nThe Republic Team`,
    html: `
      <h2>Support Request Received</h2>
      <p>Your support request has been received.</p>
      <p><strong>Ticket ID:</strong> ${ticketId.substring(0, 8)}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p>We will respond within 24-48 hours.</p>
      <p>Thank you,<br>The Republic Team</p>
    `,
    tag: "support_confirmation",
  });
}

// Send admin reply to support ticket
async function sendSupportReply(
  toEmail: string,
  ticketId: string,
  replyMessage: string
): Promise<boolean> {
  return sendEmail({
    to: toEmail,
    subject: `Re: Support Request #${ticketId.substring(0, 8)}`,
    text: `You have a new reply to your support request.\n\n${replyMessage}\n\n-The Republic Team`,
    html: `
      <h2>New Reply to Your Support Request</h2>
      <p>You have a new reply to your support request:</p>
      <blockquote>${replyMessage}</blockquote>
      <p>-The Republic Team</p>
    `,
    tag: "support_reply",
  });
}

// Send membership confirmation
async function sendMembershipConfirmation(
  toEmail: string,
  customerId: string
): Promise<boolean> {
  return sendEmail({
    to: toEmail,
    subject: "Welcome to The Republic Pro!",
    text: `Welcome to Pro!\n\nYour Pro membership is now active. Enjoy full access to all websites and premium features.\n\nManage your subscription: therepublic://\n\nThank you,\nThe Republic Team`,
    html: `
      <h2>Welcome to Pro! 🎉</h2>
      <p>Your Pro membership is now active.</p>
      <h3>What's Included:</h3>
      <ul>
        <li>Access to all websites in the directory</li>
        <li>Customize category pill colors</li>
        <li>Reorder categories to your preference</li>
        <li>Full access to premium features</li>
      </ul>
      <p>Thank you for supporting The Republic!</p>
      <p>-The Republic Team</p>
    `,
    tag: "membership_confirmation",
  });
}

// Send cancellation notice
async function sendCancellationNotice(
  toEmail: string
): Promise<boolean> {
  return sendEmail({
    to: toEmail,
    subject: "Your Pro Membership Has Been Cancelled",
    text: `Your Pro membership has been cancelled.\n\nYou will continue to have access until the end of your billing period.\n\nWe hope to see you again!\n\n-The Republic Team`,
    html: `
      <h2>Membership Cancelled</h2>
      <p>Your Pro membership has been cancelled.</p>
      <p>You will continue to have access until the end of your billing period.</p>
      <p>We hope to see you again!</p>
      <p>-The Republic Team</p>
    `,
    tag: "cancellation",
  });
}

// Send contact form notification to admin
async function sendAdminContactNotification(
  ticketId: string,
  category: string,
  subject: string,
  message: string,
  userEmail: string
): Promise<boolean> {
  const adminEmail = Deno.env.get("ADMIN_EMAIL") || "admin@therepublic.it.com";
  
  return sendEmail({
    to: adminEmail,
    subject: `[${category.toUpperCase()}] ${subject} - ${userEmail}`,
    text: `New support ticket\n\nUser: ${userEmail}\nCategory: ${category}\nSubject: ${subject}\n\nMessage:\n${message}\n\nTicket ID: ${ticketId}`,
    html: `
      <h2>New Support Ticket</h2>
      <p><strong>User:</strong> ${userEmail}</p>
      <p><strong>Category:</strong> ${category}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p>${message}</p>
      <p><a href="https://therepublic.it/admin">View in Admin</a></p>
    `,
    tag: "admin_notification",
  });
}

// Export for use in edge functions
export {
  sendEmail,
  sendSupportConfirmation,
  sendSupportReply,
  sendMembershipConfirmation,
  sendCancellationNotice,
  sendAdminContactNotification,
};