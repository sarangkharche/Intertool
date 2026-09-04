"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  BookOpen,
  Brain,
  Database,
  KeyRound,
  LogOut,
  Moon,
  Package,
  Sun,
  UserRound,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Overview", icon: Brain },
  { href: "/my-memory", label: "My memory", icon: UserRound },
  { href: "/memories", label: "Team memory", icon: Database },
  { href: "/repositories", label: "Repositories", icon: BookOpen },
  { href: "/settings/tokens", label: "API tokens", icon: KeyRound },
  { href: "/settings/members", label: "Team", icon: Users },
];

const publicNav = [
  { href: "/#product", label: "Product" },
  { href: "/#scale", label: "Scale" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/docs", label: "Docs" },
];

const subscribeToHydration = () => () => {};

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const themeReady = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false
  );
  const user = session?.user;
  const isDark = themeReady && resolvedTheme === "dark";
  const initials = (user?.name || user?.email || "?").slice(0, 2).toUpperCase();
  const refreshedPath = useRef<string | null>(null);

  useEffect(() => {
    if (refreshedPath.current === pathname) return;
    refreshedPath.current = pathname;
    void update();
  }, [pathname, update]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border-subtle bg-background/92 text-foreground backdrop-blur-md",
        user && "dashboard-theme"
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-5 px-4 py-1.5 sm:h-11 sm:py-0">
        <Link
          href={user ? "/dashboard" : "/"}
          className="micro-press flex h-8 shrink-0 items-center gap-2 rounded-md text-sm font-medium tracking-tight focus-ring"
        >
          <Package className="h-4 w-4" aria-hidden="true" />
          <span>intertool</span>
        </Link>

        {user && (
          <nav
            className="hidden items-center gap-0.5 md:flex"
            aria-label="Product navigation"
          >
            {nav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "micro-press flex h-8 items-center rounded-md px-2.5 text-xs focus-ring",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        {!user && status !== "loading" && (
          <nav
            className="hidden items-center gap-0.5 md:flex"
            aria-label="Public navigation"
          >
            {publicNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="micro-press flex h-8 items-center rounded-md px-2.5 text-xs text-muted-foreground hover:text-foreground focus-ring"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {user && (
            <Link
              href="/memories/new"
              className="micro-press touch-target focus-ring inline-flex h-8 items-center rounded-sm px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Add memory
            </Link>
          )}
          {user && (
            <Link
              href="/docs"
              className="touch-target flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground interactive-ghost"
              aria-label="Documentation"
            >
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="touch-target flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground interactive-ghost"
            aria-label={isDark ? "Use light theme" : "Use dark theme"}
          >
            <span className="t-icon-swap" data-state={isDark ? "b" : "a"}>
              <span className="t-icon" data-icon="a">
                <Sun className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="t-icon" data-icon="b">
                <Moon className="h-4 w-4" aria-hidden="true" />
              </span>
            </span>
          </button>

          {status === "loading" ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="touch-target flex h-8 w-8 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                <Avatar className="h-8 w-8">
                  {user.image && (
                    <AvatarImage src={user.image} alt={user.name ?? "User"} />
                  )}
                  <AvatarFallback className="text-[10px]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="truncate text-xs font-medium">{user.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {user.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                {nav.map((item) => (
                  <DropdownMenuItem
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className="gap-2 md:hidden"
                  >
                    <item.icon className="h-3.5 w-3.5" /> {item.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="md:hidden" />
                <DropdownMenuItem
                  onClick={() => router.push("/logout")}
                  className="gap-2"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/sign-in" className="btn-pill">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
