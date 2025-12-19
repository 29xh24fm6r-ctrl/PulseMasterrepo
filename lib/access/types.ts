export type UserRole = "user" | "admin" | "ops" | "internal";

export type UserPlan = "free" | "pro" | "enterprise";

export type AccessContext = {
  isAuthed: boolean;
  userId?: string | null;
  plan?: UserPlan;     // resolved from DB
  roles?: UserRole[];  // resolved from DB/claims
  flags?: Record<string, boolean>; // resolved from DB/remote config
};

