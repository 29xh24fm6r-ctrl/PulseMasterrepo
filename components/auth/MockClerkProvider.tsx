"use client";

import React from "react";

// ✅ Mock Clerk Provider for build/CI environments
// Provides stub implementations of all Clerk hooks to prevent build failures
// when using dummy/test keys

type Props = { children: React.ReactNode };

// Mock context that provides all Clerk hooks with safe defaults
const MockClerkContext = React.createContext({
  user: null,
  isSignedIn: false,
  isLoaded: true,
  userId: null,
  sessionId: null,
  orgId: null,
});

export function MockClerkProvider({ children }: Props) {
  return (
    <MockClerkContext.Provider value={{
      user: null,
      isSignedIn: false,
      isLoaded: true,
      userId: null,
      sessionId: null,
      orgId: null,
    }}>
      {children}
    </MockClerkContext.Provider>
  );
}
