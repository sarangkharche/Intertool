import { cn } from '@/lib/utils';

export function SkillReadme({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <pre
      className={cn(
        'overflow-x-auto rounded-lg border border-border/60 p-6 font-mono text-xs leading-relaxed text-foreground/90',
        className,
      )}
    >
      {content}
    </pre>
  );
}
