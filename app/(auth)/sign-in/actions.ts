"use server";

import { signIn } from "@/lib/auth";

function safeRedirect(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/dashboard";
  return value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

export async function developmentSignIn(formData: FormData) {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.DEV_AUTH_BYPASS !== "true"
  ) {
    throw new Error("Development login is disabled");
  }

  const user = String(formData.get("user") ?? "")
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9-]{3,40}$/.test(user)) {
    throw new Error("Enter a valid local username");
  }

  await signIn("development", {
    user,
    redirectTo: safeRedirect(formData.get("callbackUrl")),
  });
}
