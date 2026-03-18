/**
 * Fetch the GitHub organizations the authenticated user belongs to.
 * Requires `read:org` scope on the access token.
 */
export async function getGitHubUserOrgs(accessToken: string): Promise<string[]> {
  const res = await fetch("https://api.github.com/user/orgs?per_page=100", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  if (!res.ok) {
    console.error(`GitHub orgs API failed: ${res.status} ${res.statusText}`);
    return [];
  }

  const orgs: { login: string }[] = await res.json();
  return orgs.map((o) => o.login.toLowerCase());
}
