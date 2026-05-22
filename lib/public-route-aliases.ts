export const PUBLIC_ROUTE_ALIASES = ["landing-exp"] as const;

export function isPublicRouteAliasSegment(segment: string): boolean {
  return (PUBLIC_ROUTE_ALIASES as readonly string[]).includes(segment);
}

export function normalizePublicRouteAliasCallbackUrl(
  callbackUrl: string | null
): string {
  const value = callbackUrl || "/";

  for (const alias of PUBLIC_ROUTE_ALIASES) {
    const prefix = `/${alias}`;
    if (value === prefix) return "/";
    if (value.startsWith(`${prefix}/`)) {
      return value.slice(prefix.length) || "/";
    }
  }

  return value;
}
