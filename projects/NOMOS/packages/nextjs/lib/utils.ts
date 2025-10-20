export function shortAddr(a?: string) {
  return a ? a.slice(0, 6) + "..." + a.slice(-4) : "";
}
