import { useCallback, useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { CommonInputProps, InputBase, IntegerVariant, isValidInteger } from "~~/components/scaffold-eth";

type TimestampInputProps = CommonInputProps<string> & {
  variant?: IntegerVariant;
};

/**
 * Input component specifically for timestamp fields (uint256)
 * Includes a button to auto-fill with current block timestamp minus buffer
 */
export const TimestampInput = ({
  value,
  onChange,
  name,
  placeholder,
  disabled,
  variant = IntegerVariant.UINT256,
}: TimestampInputProps) => {
  const [inputError, setInputError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const publicClient = usePublicClient();

  const fillCurrentTimestamp = useCallback(async () => {
    if (!publicClient) {
      // Fallback to local time if no provider
      const timestamp = Math.floor(Date.now() / 1000) - 60; // 60 seconds buffer
      onChange(timestamp.toString());
      return;
    }

    try {
      setIsLoading(true);
      const block = await publicClient.getBlock();
      // Use block timestamp minus 60 seconds buffer to avoid "future timestamp" errors
      const timestamp = Number(block.timestamp) - 60;
      onChange(timestamp.toString());
    } catch (error) {
      console.error("Error fetching block timestamp:", error);
      // Fallback to local time
      const timestamp = Math.floor(Date.now() / 1000) - 60;
      onChange(timestamp.toString());
    } finally {
      setIsLoading(false);
    }
  }, [onChange, publicClient]);

  useEffect(() => {
    if (isValidInteger(variant, value)) {
      setInputError(false);
    } else {
      setInputError(true);
    }
  }, [value, variant]);

  return (
    <InputBase
      name={name}
      value={value}
      placeholder={placeholder || "Unix timestamp (seconds)"}
      error={inputError}
      onChange={onChange}
      disabled={disabled}
      suffix={
        <div className="flex items-center gap-1">
          <div
            className="tooltip tooltip-top tooltip-secondary before:content-[attr(data-tip)] before:right-[-10px] before:left-auto before:transform-none"
            data-tip="Fill current block timestamp (with 60s buffer)"
          >
            <button
              className={`${
                disabled || isLoading ? "cursor-not-allowed opacity-50" : "cursor-pointer"
              } font-semibold px-3 py-1 text-xs bg-secondary text-secondary-content rounded hover:bg-secondary/80 transition-colors`}
              onClick={fillCurrentTimestamp}
              disabled={disabled || isLoading}
              type="button"
            >
              {isLoading ? "⏳" : "🕐 Now"}
            </button>
          </div>
        </div>
      }
    />
  );
};
