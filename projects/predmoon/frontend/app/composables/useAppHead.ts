export const useAppHead =() => {
  const { token } = $(authStore());
  const { userInfo } = $(userStore());
  const href = useRequestURL().href;
  const origin = useRequestURL().origin;

  useHead({
    title: "Puzzle | Mini Dapp",
    meta: [
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, viewport-fit=cover",
      },
      // Open Graph
      { name: "description", content: () => "Bet on your beliefs!" },
      { property: "og:title", content: () => "Puzzle" },
      { property: "og:description", content: () => "Bet on your beliefs!" },
      { property: "og:image", content: () => `${origin}/media/twitter-card.png` },
      {
        property: "og:url",
        content: () =>
          `${href}${token.accessToken !== "" ? "?inviteCode=" + userInfo?.inviteCode : ""}`,
      },
      // Twitter Card
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: () => "Puzzle" },
      { name: "twitter:description", content: () => "Bet on your beliefs!" },
      { name: "twitter:image", content: () => `${origin}/media/twitter-card.png` },
      {
        name: "twitter:url",
        content: () =>
          `${href}${token.accessToken !== "" ? "?inviteCode=" + userInfo?.inviteCode : ""}`,
      },
    ],
    script: [
      { src: "https://telegram.org/js/telegram-web-app.js", defer: true },
      { src: "https://unpkg.com/vconsole@latest/dist/vconsole.min.js", defer: true },
    ],
  });
}
