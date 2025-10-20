import clsx from "clsx";

type TokenInputProps = {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  tokenSymbol: string;
  tokenLabel?: string;
  readOnly?: boolean;
  placeholder?: string;
  caption?: string;
};

export function TokenInput({
  label,
  value,
  onChange,
  tokenSymbol,
  tokenLabel,
  readOnly,
  placeholder,
  caption
}: TokenInputProps) {
  return (
    <div className="rounded-2xl bg-surfaceMuted px-4 py-5">
      <div className="flex items-center justify-between text-xs text-neutral-400">
        <span>{label}</span>
        {caption ? <span>{caption}</span> : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <input
          className={clsx(
            "w-full bg-transparent text-3xl font-medium outline-none placeholder:text-neutral-600",
            readOnly && "cursor-default text-neutral-400"
          )}
          value={value}
          inputMode="decimal"
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={
            onChange ? (event) => onChange(event.target.value) : undefined
          }
        />
        <div className="flex items-center gap-2 rounded-full bg-surfaceHighlight px-4 py-2">
          <span className="text-base font-semibold">{tokenSymbol}</span>
          {tokenLabel ? (
            <span className="text-xs text-neutral-400">{tokenLabel}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
