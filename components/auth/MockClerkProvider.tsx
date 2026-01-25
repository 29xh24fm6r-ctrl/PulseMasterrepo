"use client";

import React, { createContext, useContext } from "react";

// ✅ Mock Clerk Provider for build/CI environments
// Provides stub implementations of all Clerk hooks to prevent build failures

type Props = { children: React.ReactNode };

// Create contexts that match Clerk's hook structure
const AuthContext = createContext({
  userId: null as string | null,
  sessionId: null as string | null,
  actor: null,
  orgId: null as string | null,
  orgRole: null as string | null,
  orgSlug: null as string | null,
  has: () => false,
  isLoaded: true,
  isSignedIn: false,
});

const UserContext = createContext({
  isLoaded: true,
  isSignedIn: false,
  user: null,
});

const SessionContext = createContext({
  isLoaded: true,
  isSignedIn: false,
  session: null,
});

const OrganizationContext = createContext({
  isLoaded: true,
  organization: null,
  membership: null,
});

export function MockClerkProvider({ children }: Props) {
  return (
    <AuthContext.Provider value={{
      userId: null,
      sessionId: null,
      actor: null,
      orgId: null,
      orgRole: null,
      orgSlug: null,
      has: () => false,
      isLoaded: true,
      isSignedIn: false,
    }}>
      <UserContext.Provider value={{
        isLoaded: true,
        isSignedIn: false,
        user: null,
      }}>
        <SessionContext.Provider value={{
          isLoaded: true,
          isSignedIn: false,
          session: null,
        }}>
          <OrganizationContext.Provider value={{
            isLoaded: true,
            organization: null,
            membership: null,
          }}>
            {children}
          </OrganizationContext.Provider>
        </SessionContext.Provider>
      </UserContext.Provider>
    </AuthContext.Provider>
  );
}

// Export mock hooks that components can use
export const useAuth = () => useContext(AuthContext);
export const useUser = () => useContext(UserContext);
export const useSession = () => useContext(SessionContext);
export const useOrganization = () => useContext(OrganizationContext);
