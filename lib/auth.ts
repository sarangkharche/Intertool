import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";

const providers: Provider[] = [];
const githubClientId = process.env.GITHUB_CLIENT_ID ?? process.env.GITHUB_ID;
const githubClientSecret =
  process.env.GITHUB_CLIENT_SECRET ?? process.env.GITHUB_SECRET;

if (githubClientId && githubClientSecret) {
  providers.push(
    GitHub({
      clientId: githubClientId,
      clientSecret: githubClientSecret,
      authorization: { params: { scope: "read:user user:email" } },
    })
  );
}

if (
  process.env.NODE_ENV !== "production" &&
  process.env.DEV_AUTH_BYPASS === "true"
) {
  providers.push(
    Credentials({
      id: "development",
      name: "Development login",
      credentials: { user: { label: "User", type: "text" } },
      authorize(credentials) {
        const username = String(credentials?.user ?? "")
          .trim()
          .toLowerCase();
        const identities: Record<string, { email: string; name: string }> = {
          alice: { email: "alice@acme.test", name: "Alice" },
          bob: { email: "bob@acme.test", name: "Bob" },
          mallory: { email: "mallory@other.test", name: "Mallory" },
        };
        const identity =
          identities[username] ??
          (/^[a-z0-9-]{3,40}$/.test(username)
            ? { email: `${username}@local.invalid`, name: username }
            : null);
        return identity ? { id: username, username, ...identity } : null;
      },
    })
  );
}

const isDevelopment = process.env.NODE_ENV === "development";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  pages: { signIn: "/sign-in" },
  cookies: {
    sessionToken: {
      name: isDevelopment
        ? "authjs.session-token"
        : "__Secure-authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: !isDevelopment,
      },
    },
  },
  callbacks: {
    async jwt({ token, account, profile, user }) {
      if (account?.access_token) token.accessToken = account.access_token;
      if (account?.provider === "development" && user) {
        token.username = (user as { username?: string }).username ?? user.id;
        token.provider = "development";
      } else if (account?.provider === "github") {
        token.username = (profile as { login?: string })?.login ?? user?.id;
        token.provider = "github";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { username?: string }).username =
          token.username as string;
        (session.user as { provider?: string }).provider =
          token.provider as string;
      }
      return session;
    },
  },
});
