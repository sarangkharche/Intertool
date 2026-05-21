"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { RootProvider } from "fumadocs-ui/provider/next";
import { MotionConfig } from "motion/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <SessionProvider>
        <MotionConfig reducedMotion="user">
          <RootProvider theme={{ enabled: false }}>{children}</RootProvider>
        </MotionConfig>
      </SessionProvider>
    </ThemeProvider>
  );
}
