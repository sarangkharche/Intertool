import { cn } from "@/lib/utils";

interface TransitionNumberProps {
  value: number;
  className?: string;
}

export function TransitionNumber({ value, className }: TransitionNumberProps) {
  const formatted = new Intl.NumberFormat("en-GB").format(value);
  const characters = Array.from(formatted);

  return (
    <span className={cn("t-digit-group is-animating", className)}>
      <span className="sr-only">{formatted}</span>
      {characters.map((character, index) => {
        const distanceFromEnd = characters.length - index;
        const stagger =
          distanceFromEnd === 2 ? "1" : distanceFromEnd === 1 ? "2" : undefined;

        return (
          <span
            key={`${character}-${index}`}
            aria-hidden="true"
            className="t-digit"
            data-stagger={stagger}
          >
            {character}
          </span>
        );
      })}
    </span>
  );
}
