// Reads the non-httpOnly `csrfToken` cookie the backend sets on every response
// (see backend/src/middleware/csrf.middleware.ts) so it can be echoed back as the
// X-CSRF-Token header on mutating requests — the standard double-submit-cookie pattern.
export const getCsrfToken = (): string | null => {
  const match = document.cookie.match(/(?:^|;\s*)csrfToken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};
