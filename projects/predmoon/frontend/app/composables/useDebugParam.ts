export const useDebugParam = () => {
  const debug = $(useRouteQuery("debug"));

  watchEffect(() => {
    if (debug) {
      localStorage.setItem("debug", debug);
    }
  });
}
