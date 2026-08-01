import { Resend } from "resend";

function resendClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendInviteEmail(opts: {
  to: string;
  inviterName: string;
  workspaceName: string;
  token: string;
}) {
  const resend = resendClient();
  const url = `${process.env.NEXTAUTH_URL}/invite/${opts.token}`;

  if (!resend) {
    console.warn(`[email] RESEND_API_KEY not set — invite link: ${url}`);
    return { url };
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "noreply@panelflo.com",
    to: opts.to,
    subject: `${opts.inviterName} invited you to ${opts.workspaceName} on Panelflo`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#0A3728">You're invited to Panelflo</h2>
        <p><strong>${opts.inviterName}</strong> invited you to join
        <strong>${opts.workspaceName}</strong>.</p>
        <p>
          <a href="${url}"
             style="display:inline-block;background:#1D9E75;color:#fff;
                    padding:12px 24px;border-radius:8px;text-decoration:none">
            Accept invite
          </a>
        </p>
        <p style="color:#6b7280;font-size:13px">This link expires in 24 hours.</p>
      </div>
    `,
  });
  return { url };
}
