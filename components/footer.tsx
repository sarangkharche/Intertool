import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border-subtle">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          Intertool stores confirmed engineering context, never raw
          conversations.
        </p>
        <div className="flex gap-4">
          <Link href="/docs" className="hover:text-foreground">
            Documentation
          </Link>
          <Link href="/docs/api/overview" className="hover:text-foreground">
            API
          </Link>
        </div>
      </div>
    </footer>
  );
}
