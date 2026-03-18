"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Package, Plus, LogOut, LayoutDashboard, Sun, Moon, Search, Settings } from "lucide-react";
import { CommandPalette } from "./command-palette";
import { GITHUB_URL } from "@/lib/constants";

export function Header() {
  const router = useRouter();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const user = session?.user;

  const initials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : user?.email
      ? user.email.slice(0, 2).toUpperCase()
      : "?";

  return (
    <>
      <CommandPalette />
      <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-12 max-w-5xl items-center gap-6 px-4">
          <Link href="/" className="flex items-center gap-2 text-sm font-medium tracking-tight">
            <Package className="h-4 w-4 text-foreground" />
            <span>intertool</span>
          </Link>

          <nav className="hidden items-center gap-4 md:flex">
            <Link href="/dashboard" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Registry
            </Link>
          </nav>

          <div className="flex-1">
            <button
              onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              className="mx-auto flex h-7 w-full max-w-sm items-center gap-2 rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-muted"
            >
              <Search className="h-3 w-3" />
              <span className="flex-1 text-left">Search skills...</span>
              <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
                ⌘K
              </kbd>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
              aria-label="GitHub repository"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="relative flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Toggle theme"
            >
              <Sun className="h-3.5 w-3.5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-3.5 w-3.5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
            </button>

            {user ? (
              <>
                <Link
                  href="/publish"
                  className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Publish</span>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger className="outline-none">
                    <Avatar className="h-7 w-7 transition-opacity hover:opacity-80">
                      {user.image && <AvatarImage src={user.image} alt={user.name ?? "User"} />}
                      <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => router.push("/dashboard")} className="gap-2">
                      <LayoutDashboard className="h-3.5 w-3.5" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/admin")} className="gap-2">
                      <Settings className="h-3.5 w-3.5" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut()} className="gap-2">
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link href="/sign-in" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
