import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { betaMiddleware } from './app/middleware-beta'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/comm/call/(.*)',
  '/api/comm/sms/(.*)',
  '/api/stripe/webhook',
  '/api/admin/(.*)',
])

export default clerkMiddleware(async (auth, request) => {
  // Apply beta mode restrictions first
  const betaResponse = betaMiddleware(request);
  if (betaResponse) {
    return betaResponse;
  }

  // Then check authentication
  if (!isPublicRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|json)).*)',
    '/(api|trpc)(.*)',
  ],
}