import { OAuth2Client, GoogleAuth } from "google-auth-library";
import { isBuildPhase } from "@/lib/env/guard";

let _client: OAuth2Client | null = null;

function validateEnv() {
    if (isBuildPhase()) {
        throw new Error("[RUNTIME VIOLATION] Google OAuth accessed during build phase");
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret) {
        throw new Error(
            "Missing env vars: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET"
        );
    }

    return { clientId, clientSecret, redirectUri };
}

export function getGoogleOAuthClient(): OAuth2Client {
    const { clientId, clientSecret, redirectUri } = validateEnv();

    if (_client) return _client;

    _client = new OAuth2Client({
        clientId,
        clientSecret,
        redirectUri,
    });

    return _client;
}

export function createGoogleOAuthClient(): OAuth2Client {
    const { clientId, clientSecret, redirectUri } = validateEnv();

    return new OAuth2Client({
        clientId,
        clientSecret,
        redirectUri,
    });
}

export function createGoogleCloudPlatformAuth(): GoogleAuth {
    if (isBuildPhase()) {
        throw new Error("[RUNTIME VIOLATION] Google Cloud Auth accessed during build phase");
    }

    return new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
}
