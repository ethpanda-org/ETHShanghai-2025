type SlippageControlProps = {
  value: number;
  onChange: (value: number) => void;
};

const OPTIONS = [
  { label: "0.1%", value: 10 },
  { label: "0.5%", value: 50 },
  { label: "1%", value: 100 }
];

export function SlippageControl({ value, onChange }: SlippageControlProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-surfaceMuted px-4 py-4">
      <div>
        <p className="text-sm font-medium text-neutral-200">Slippage tolerance</p>
        <p className="text-xs text-neutral-500">
          Protection against pool front-running.
        </p>
      </div>
      <div className="flex items-center gap-2">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3 py-1 text-xs ${
              value === option.value
                ? "bg-primary/90 text-white shadow-focus"
                : "bg-surfaceHighlight text-neutral-300 hover:bg-surface"
            } transition`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
