import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { getSettings, addOrgMember, getOAuthCredentialsSync } from "./settings";
import { getOrgSlug, isSaasMode } from "./org";
import { getGitHubUserOrgs } from "./github";
import { ensureUserRecord, setUserRole } from "./rbac";
import { getInvitationByEmail, acceptInvitation } from "./invitations";

// Resolve OAuth credentials from admin settings → env vars
const oauthCreds = getOAuthCredentialsSync();

const providers: Provider[] = [];

if (oauthCreds.github) {
  providers.push(
    GitHub({
      clientId: oauthCreds.github.clientId,
      clientSecret: oauthCreds.github.clientSecret,
      authorization: { params: { scope: "read:user user:email read:org" } },
    })
  );
}

if (oauthCreds.google) {
  providers.push(
    Google({
      clientId: oauthCreds.google.clientId,
      clientSecret: oauthCreds.google.clientSecret,
      authorization: {
        params: {
          scope: "openid email profile",
        },
      },
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        const googleProfile = profile as {
          email?: string;
          email_verified?: boolean;
          hd?: string;
        };

        // Must have verified email
        if (!googleProfile.email_verified) {
          return "/sign-in?error=unverified";
        }

        // Load settings and check domain restrictions
        const orgSlug = await getOrgSlug();
        const settings = await getSettings(orgSlug);

        if (!settings?.google_auth_enabled) {
          return "/sign-in?error=google_disabled";
        }

        const allowedDomains = settings.google_allowed_domains ?? [];
        if (allowedDomains.length === 0) {
          return "/sign-in?error=no_domains";
        }

        // Check hd claim (Workspace domain)
        const hdDomain = googleProfile.hd?.toLowerCase();
        const emailDomain = googleProfile.email?.split("@")[1]?.toLowerCase();

        const domainMatch = allowedDomains.some(
          (d) => d.toLowerCase() === hdDomain || d.toLowerCase() === emailDomain
        );

        if (!domainMatch) {
          return "/sign-in?error=domain";
        }
      }

      // GitHub org membership check
      if (account?.provider === "github" && account.access_token) {
        const orgSlug = await getOrgSlug();
        const settings = await getSettings(orgSlug);

        if (settings?.github_org_required && settings.github_org) {
          const userOrgs = await getGitHubUserOrgs(account.access_token);
          const requiredOrg = settings.github_org.toLowerCase();

          if (!userOrgs.includes(requiredOrg)) {
            return "/sign-in?error=github_org";
          }

          // Cache membership in SaaS mode
          const githubLogin = (profile as { login?: string })?.login;
          if (isSaasMode() && orgSlug && githubLogin) {
            await addOrgMember(orgSlug, githubLogin);
          }
        }
      }

      // Upsert user record for RBAC
      try {
        const orgSlugForRecord = await getOrgSlug();
        if (account?.provider === "google") {
          const email = (profile as { email?: string })?.email;
          if (email) {
            await ensureUserRecord(email, {
              display_name: (profile as { name?: string })?.name ?? email,
              provider: "google",
              avatar_url: (profile as { picture?: string })?.picture,
            }, orgSlugForRecord);
          }
        } else if (account?.provider === "github") {
          const login = (profile as { login?: string })?.login;
          if (login) {
            await ensureUserRecord(login, {
              display_name: (profile as { name?: string })?.name ?? login,
              provider: "github",
              avatar_url: (profile as { avatar_url?: string })?.avatar_url,
            }, orgSlugForRecord);
          }
        }
      } catch {
        // Non-fatal: don't block sign-in if RBAC record fails
      }

      // Auto-accept pending invitation if email matches
      try {
        const invOrgSlug = await getOrgSlug();
        let userEmail: string | undefined;
        if (account?.provider === "google") {
          userEmail = (profile as { email?: string })?.email?.toLowerCase();
        } else if (account?.provider === "github") {
          // GitHub profile may include email
          userEmail = (profile as { email?: string })?.email?.toLowerCase();
        }
        if (userEmail) {
          const pendingInvite = await getInvitationByEmail(userEmail, invOrgSlug);
          if (pendingInvite) {
            const identifier = account?.provider === "github"
              ? (profile as { login?: string })?.login ?? userEmail
              : userEmail;
            await acceptInvitation(pendingInvite.token, {
              display_name: (profile as { name?: string })?.name ?? identifier,
              provider: account?.provider as "github" | "google",
              avatar_url: (profile as { avatar_url?: string; picture?: string })?.avatar_url
                ?? (profile as { picture?: string })?.picture,
            });
            // Set the invited role on the user record
            await setUserRole(identifier, pendingInvite.role, invOrgSlug);
          }
        }
      } catch {
        // Non-fatal: don't block sign-in if invitation auto-accept fails
      }

      return true;
    },

    async jwt({ token, account, profile }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      if (account && profile) {
        if (account.provider === "google") {
          token.username = (profile as { email?: string }).email;
          token.provider = "google";
        } else {
          token.username = (profile as { login?: string }).login;
          token.provider = "github";

          // Store GitHub org memberships in the JWT
          if (account.access_token) {
            token.githubOrgs = await getGitHubUserOrgs(account.access_token);
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as { username?: string; accessToken?: string; provider?: string; githubOrgs?: string[] }).username =
          token.username as string;
        (session.user as { accessToken?: string }).accessToken =
          token.accessToken as string;
        (session.user as { provider?: string }).provider =
          token.provider as string;
        (session.user as { githubOrgs?: string[] }).githubOrgs =
          (token.githubOrgs as string[]) ?? [];
      }
      return session;
    },
  },
});
