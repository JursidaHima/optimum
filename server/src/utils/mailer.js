import nodemailer from "nodemailer";

export async function sendResetEmail(to, link) {
  // Development : no SMTP settings, so print the link in the server terminal
//   if (!process.env.SMTP_HOST) {
//     console.log(`[DEV] Password reset link for ${to}:\n${link}`);
//     return;
//   }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM || "Optimum <no-reply@optimum.local>",
    to,
    subject: "Reset your Optimum password",
    text:
      `Use this link to choose a new password (valid for 30 minutes):\n\n${link}\n\n` +
      "If you didn't ask for this, you can ignore this email.",
  });
}

