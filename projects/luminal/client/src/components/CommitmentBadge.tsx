type CommitmentBadgeProps = {
  commitment?: string | null;
  label?: string;
};

const truncate = (value: string) =>
  `${value.slice(0, 6)}…${value.slice(value.length - 4)}`;

export function CommitmentBadge({
  commitment,
  label = "Current commitment"
}: CommitmentBadgeProps) {
  return (
    <div className="rounded-2xl bg-surfaceMuted px-4 py-3 text-xs text-neutral-400">
      <p className="mb-1 uppercase tracking-wide text-[0.6rem] text-neutral-600">
        {label}
      </p>
      <p className="font-mono text-sm text-neutral-200">
        {commitment ? truncate(commitment) : "—"}
      </p>
    </div>
  );
}
