// Email Service using Resend
import { Resend } from "resend";

const FROM_EMAIL = "Pulse OS <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://pulselifeos.com";

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY missing - email service disabled");
    return null;
  }
  return new Resend(apiKey);
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.log("Email skipped (no API key/client):", subject);
      return false;
    }
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    console.log("Email sent:", subject);
    return true;
  } catch (error) {
    console.error("Email error:", error);
    return false;
  }
}

export async function sendLowBalanceAlert(email: string, name: string, tokensRemaining: number, percentUsed: number): Promise<boolean> {
  const color = percentUsed >= 90 ? "#ef4444" : "#f59e0b";
  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h1 style="color:#a78bfa;">Pulse OS</h1><div style="background:${color}22;border:1px solid ${color}44;border-radius:12px;padding:20px;margin:20px 0;"><h2 style="color:${color};">Token Balance Low</h2><p>You have used <strong>${percentUsed}%</strong> of your monthly tokens. ${tokensRemaining} remaining.</p></div><a href="${APP_URL}/settings/billing" style="background:linear-gradient(135deg,#8b5cf6,#ec4899);color:white;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;">Get More Tokens</a></div>`;
  return sendEmail(email, `Pulse: ${percentUsed}% of your tokens used`, html);
}

export async function sendPaymentFailedEmail(email: string, name: string, amount: number): Promise<boolean> {
  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h1 style="color:#a78bfa;">Pulse OS</h1><div style="background:#ef444422;border:1px solid #ef444444;border-radius:12px;padding:20px;margin:20px 0;"><h2 style="color:#ef4444;">Payment Failed</h2><p>We could not process your payment of <strong>$${(amount / 100).toFixed(2)}</strong>.</p></div><a href="${APP_URL}/settings/billing" style="background:linear-gradient(135deg,#8b5cf6,#ec4899);color:white;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;">Update Payment Method</a></div>`;
  return sendEmail(email, "Pulse: Payment failed - action required", html);
}

export async function sendReferralCreditedEmail(email: string, name: string, referredName: string, tokensEarned: number): Promise<boolean> {
  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h1 style="color:#a78bfa;">Congratulations!</h1><div style="background:#10b98122;border:1px solid #10b98144;border-radius:12px;padding:20px;margin:20px 0;"><h2 style="color:#10b981;">+${tokensEarned} tokens earned!</h2><p><strong>${referredName}</strong> upgraded to Pulse+</p></div><a href="${APP_URL}/settings/billing" style="background:linear-gradient(135deg,#8b5cf6,#ec4899);color:white;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;">View Your Balance</a></div>`;
  return sendEmail(email, "Pulse: You earned free tokens!", html);
}

export async function sendWelcomePlusEmail(email: string, name: string): Promise<boolean> {
  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h1 style="color:#a78bfa;">Welcome to Pulse+</h1><p>Hi ${name}, you now have 300 tokens/month, voice coaching, and all premium features!</p><a href="${APP_URL}" style="background:linear-gradient(135deg,#8b5cf6,#ec4899);color:white;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;">Open Dashboard</a></div>`;
  return sendEmail(email, "Welcome to Pulse+!", html);
}

export async function sendTokensDepletedEmail(email: string, name: string): Promise<boolean> {
  const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h1 style="color:#a78bfa;">Pulse OS</h1><div style="background:#ef444422;border:1px solid #ef444444;border-radius:12px;padding:20px;margin:20px 0;"><h2 style="color:#ef4444;">Tokens Depleted</h2><p>Your AI token balance has reached zero.</p></div><a href="${APP_URL}/settings/billing" style="background:linear-gradient(135deg,#8b5cf6,#ec4899);color:white;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;">Get More Tokens</a></div>`;
  return sendEmail(email, "Pulse: Token balance depleted", html);
}