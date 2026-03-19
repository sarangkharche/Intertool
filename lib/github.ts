/**
 * Fetch the GitHub organizations the authenticated user belongs to.
 * Requires `read:org` scope on the access token.
 */
export async function getGitHubUserOrgs(accessToken: string): Promise<string[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  const res = await fetch("https://api.github.com/user/orgs?per_page=100", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (!res.ok) {
    console.error(`GitHub orgs API failed: ${res.status} ${res.statusText}`);
    return [];
  }

  let orgs: { login: string }[];
  try {
    orgs = await res.json();
  } catch {
    console.error("[github] Failed to parse orgs response as JSON");
    return [];
  }
  return orgs.map((o) => o.login.toLowerCase());
}
