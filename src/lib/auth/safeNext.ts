// docs/AUTHENTICATED_APP_SHELL_ROUTING.md §10: "Validate `next` to prevent
// open redirects." Only a same-origin relative path is ever honored.
export function resolveSafeNext(next: string | string[] | undefined, fallback = "/app"): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value) return fallback;
  // Must be a relative path ("/x"), never protocol-relative ("//evil.com")
  // or an absolute URL with a scheme.
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return fallback;
  }
  return value;
}
