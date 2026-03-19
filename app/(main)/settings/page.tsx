import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Link from "next/link";
import { Palette, Database } from "lucide-react";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-lg text-display">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize your experience and manage your registry.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { href: "/settings/preferences", icon: Palette, title: "Preferences", desc: "Theme, accent color, density, and default view." },
          { href: "/settings/admin", icon: Database, title: "Administration", desc: "Storage, OAuth, access control, and webhooks." },
        ].map((card) => (
          <Link key={card.href} href={card.href} className="group">
            <div className="flex h-full flex-col rounded-lg border border-border/70 p-4 interactive-card">
              <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-md bg-muted/60">
                <card.icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="text-sm font-medium">{card.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
