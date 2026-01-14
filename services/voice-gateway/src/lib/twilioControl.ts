import twilio from "twilio";
import { env } from "./env.js";

const client = twilio(env("TWILIO_ACCOUNT_SID"), env("TWILIO_AUTH_TOKEN"));

function twimlResponse(xmlInner: string) {
    return `<?xml version="1.0" encoding="UTF-8"?><Response>${xmlInner}</Response>`;
}

export async function sendDtmf(callSid: string, digits: string, redirectUrl?: string) {
    const body = twimlResponse(
        [
            `<Play digits="${escapeXmlAttr(digits)}"/>`,
            `<Pause length="1"/>`,
            redirectUrl ? `<Redirect method="POST">${escapeXmlText(redirectUrl)}</Redirect>` : ""
        ].join("")
    );

    await client.calls(callSid).update({ twiml: body });
}

export async function sayText(callSid: string, text: string, redirectUrl?: string) {
    const body = twimlResponse(
        [
            `<Say>${escapeXmlText(text)}</Say>`,
            `<Pause length="1"/>`,
            redirectUrl ? `<Redirect method="POST">${escapeXmlText(redirectUrl)}</Redirect>` : ""
        ].join("")
    );

    await client.calls(callSid).update({ twiml: body });
}

export async function hangup(callSid: string) {
    const body = twimlResponse(`<Hangup/>`);
    await client.calls(callSid).update({ twiml: body });
}

// minimal XML escaping helpers
function escapeXmlText(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escapeXmlAttr(s: string) {
    return escapeXmlText(s).replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
