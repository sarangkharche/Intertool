"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Palette, Database, Webhook } from "lucide-react";

const personalLinks = [
  { href: "/settings/preferences", label: "Preferences", icon: Palette },
];

const adminLinks = [
  { href: "/settings/admin", label: "Storage & Auth", icon: Database },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = !!session?.user;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-8 sm:flex-row">
        {/* Sidebar — desktop */}
        <nav className="hidden w-48 shrink-0 sm:block">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
            Personal
          </p>
          <ul className="space-y-0.5">
            {personalLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors duration-100 ${
                      active
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <link.icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {isAdmin && (
            <>
              <p className="mb-2 mt-6 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                Administration
              </p>
              <ul className="space-y-0.5">
                {adminLinks.map((link) => {
                  const active = pathname === link.href;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors duration-100 ${
                          active
                            ? "bg-muted font-medium text-foreground"
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                        }`}
                      >
                        <link.icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </nav>

        {/* Mobile pill bar */}
        <nav className="flex gap-1.5 overflow-x-auto pb-2 sm:hidden">
          {[...personalLinks, ...(isAdmin ? adminLinks : [])].map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors duration-100 ${
                  active
                    ? "bg-foreground text-background font-medium"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <link.icon className="h-3 w-3" aria-hidden="true" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Content */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
