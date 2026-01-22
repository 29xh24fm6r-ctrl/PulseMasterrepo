import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.clerk.com https://clerk.pulselifeos.com https://*.clerk.accounts.dev https://*.clerk.accounts https://apis.google.com https://accounts.google.com https://www.gstatic.com;
              script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.clerk.com https://clerk.pulselifeos.com https://*.clerk.accounts.dev https://*.clerk.accounts https://apis.google.com https://accounts.google.com https://www.gstatic.com;
              connect-src 'self' https://challenges.cloudflare.com https://*.clerk.com https://clerk.pulselifeos.com https://*.clerk.accounts.dev https://*.clerk.accounts https://accounts.google.com https://oauth2.googleapis.com;
              frame-src 'self' https://challenges.cloudflare.com https://*.clerk.com https://clerk.pulselifeos.com https://accounts.google.com;
              img-src 'self' data: blob: https://*.clerk.com https://*.googleusercontent.com;
              style-src 'self' 'unsafe-inline';
              worker-src 'self' blob:;
              child-src 'self' blob: https://challenges.cloudflare.com https://*.clerk.com https://clerk.pulselifeos.com https://accounts.google.com;
            `.replace(/\s{2,}/g, ' ').trim(),

          },
        ],
      },
    ];
  },
};

export default withSentryConfig(
  nextConfig,
  {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    tunnelRoute: "/monitoring",
    silent: true,
  }
);
