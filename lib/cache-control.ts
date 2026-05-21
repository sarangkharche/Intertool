export const PRIVATE_NO_STORE =
  "private, no-store, no-cache, max-age=0, must-revalidate";

export function noStoreHeaders(
  headers: Record<string, string> = {}
): Record<string, string> {
  return {
    ...headers,
    "Cache-Control": PRIVATE_NO_STORE,
  };
}
