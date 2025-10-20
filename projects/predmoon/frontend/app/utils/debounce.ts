export function _debounce<F extends (...args: any[]) => any>(fn: F, delay = 20) {
  let timer: NodeJS.Timeout | null = null;

  // Specify this type using generics
  return function (this: ThisParameterType<F>, ...args: Parameters<F>) {
    if (timer) clearTimeout(timer);

    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}
