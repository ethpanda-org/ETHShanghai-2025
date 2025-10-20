export const formatUsd = (value, precision = 2) => new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
}).format(value);
export const formatPercent = (bps, precision = 2) => `${(bps / 100).toFixed(precision)}%`;
