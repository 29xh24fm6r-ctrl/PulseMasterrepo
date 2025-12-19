/**
 * Central route helper to prevent routing bugs
 * All routes should use these helpers instead of hardcoded strings
 */

export const routes = {
  people: {
    list: () => "/people",
    detail: (personId: string) => `/people/${personId}`,
  },
  crm: {
    people: {
      list: () => "/crm/people",
      detail: (personId: string) => `/crm/people/${personId}`,
    },
  },
};

