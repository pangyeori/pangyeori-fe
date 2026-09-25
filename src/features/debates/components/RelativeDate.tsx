import { requestAge } from "@/features/debates/candidateList";

export function RelativeDate({ value, now, className = "" }: {
  value: string | null | undefined;
  now: number;
  className?: string;
}) {
  const age = requestAge(value, now);
  const parts = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null;
  if (!age || !parts || !value) return null;

  const exact = `${parts[1]}. ${parts[2]}. ${parts[3]}.`;
  return (
    <time
      dateTime={value}
      tabIndex={0}
      aria-label={`${age}, ${exact}`}
      className={`group w-fit cursor-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-blue)] ${className}`}
    >
      <span aria-hidden="true" className="group-hover:hidden group-focus:hidden">{age}</span>
      <span aria-hidden="true" className="hidden group-hover:inline group-focus:inline">{exact}</span>
    </time>
  );
}
