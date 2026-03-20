"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { RootProvider } from "fumadocs-ui/provider/next";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <SessionProvider>
        <RootProvider
          theme={{ enabled: false }}
        >
          {children}
        </RootProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
