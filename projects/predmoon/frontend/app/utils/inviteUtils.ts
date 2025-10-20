import { captureElementToBlob } from "@/utils/imagesUtils";

const LINK_CONSTANTS = {
  email_official: "turingmarket@gmail.com",
  x_official: "https://www.x.com",
  telegram_official: "https://t.me",
  binance_official: "https://www.binance.com",
  discord_official: "https://discord.com",
};

export const web_share_url = (
  path: string = "",
  params: Record<string, string>
) => {
  if (!params) {
    return `${useRequestURL().href}${path}`;
  }
  return `${useRequestURL().href}${path}?${new URLSearchParams(
    params
  ).toString()}`;
};

export const telegram_bot_url = (
  botUsername: string,
  params: Record<string, string>
) => {
  if (!params?.redirect) {
    params.redirect = useRequestURL().pathname;
  }
  return `${LINK_CONSTANTS.telegram_official}/${botUsername}?start=${toBase64(
    params
  )}`;
};

export const telegram_bot_app_url = (
  botUsername: string,
  params: Record<string, string>
) => {
  if (!params?.redirect) {
    params.redirect = useRequestURL().pathname;
  }
  return `${
    LINK_CONSTANTS.telegram_official
  }/${botUsername}?startapp=${toBase64(params)}`;
};

export const telegram_bot_group_url = (
  botUsername: string,
  params: Record<string, string>
) => {
  return `${
    LINK_CONSTANTS.telegram_official
  }/${botUsername}?startgroup=${toBase64(params)}`;
};

export const telegram_share_url = (
  shareText: string,
  url: string = "%23Pred2Moon"
) => {
  return `${
    LINK_CONSTANTS.telegram_official
  }/share/url?text=${encodeURIComponent(shareText)}${
    url ? `&url=${encodeURIComponent(url)}` : ""
  }`;
};

export const x_share_url = (
  shareText: string,
  url: string = "%23Pred2Moon",
  hashtags: string = ""
) => {
  return `${LINK_CONSTANTS.x_official}/intent/post?text=${encodeURIComponent(
    shareText
  )}${url ? `&url=${encodeURIComponent(url)}` : ""}${
    hashtags ? `&hashtags=${hashtags}` : ""
  }`;
};

export const binance_share_url = (
  shareText: string,
  url: string = "%23Pred2Moon"
) => {
  return `${LINK_CONSTANTS.binance_official}/square?text=${encodeURIComponent(
    shareText
  )}${url ? `&url=${encodeURIComponent(url)}` : ""}`;
};

// market share text
export const share_market_text = (
  topicTitle: string,
  marketData: any,
  url: string
) => {
  const returnAmount = Math.floor(
    100 /
      (marketData.noPrice < marketData.yesPrice
        ? marketData.noPrice
        : marketData.yesPrice)
  );

  return pickRandom([
    `🚨 HOT MARKET ALERT: ${topicTitle}

YES odds: ${marketData.yesPrice * 100}%

NO odds: ${marketData.noPrice * 100}%

💰 A $100 bet on ${
      marketData.noPrice < marketData.yesPrice
        ? marketData.noName
        : marketData.yesName
    } returns $${returnAmount} if correct.
👉 Don’t miss out — the market is moving fast! 🔥
${url}`,

    `🔥 Everyone’s betting on ${topicTitle}

📊 Current odds:
YES — ${marketData.yesPrice * 100}%
NO — ${marketData.noPrice * 100}%

💵 If you put $100 on ${
      marketData.noPrice < marketData.yesPrice
        ? marketData.noName
        : marketData.yesName
    }, you’d get $${returnAmount} back!
⚡️ Will you catch the wave or stay on the sidelines?
${url}`,
  ]);
};

// position share text
export const share_position_text = (
  topicTitle: string,
  positionData: any,
  url: string
) => {
  return pickRandom([
    `📊 Just took ${positionData.typeName} with ${positionData.holdVolume} on ${topicTitle}!
Feeling confident — but the market could surprise us. 🔮
What’s your call? Join the market & place your prediction 👇
👉 ${url}`,

    `🔥 My latest move: ${positionData.typeName}, ${positionData.holdVolume} on ${topicTitle}.
Think I’m on the right side, or ready to fade me? 💡
Jump in and make your forecast now!
👉 ${url}`,
  ]);
};

/**
 * Universal URL Shortener Utility
 * Support TinyURL / is.gd，auto fallback
 * @param url default URL
 * @returns short URL
 */
export async function shortenURL(url: string): Promise<string> {
  // TinyURL
  try {
    const res = await fetch(
      `https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`
    );
    if (res.ok) {
      const shortUrl = await res.text();
      if (shortUrl.startsWith("http")) return shortUrl;
    }
  } catch (err) {
    console.warn("TinyURL failure,", err);
  }

  // is.gd
  try {
    const res = await fetch(
      `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`
    );
    if (res.ok) {
      const shortUrl = await res.text();
      if (shortUrl.startsWith("http")) return shortUrl;
    }
  } catch (err) {
    console.warn("is.gd failure,", err);
  }

  // fallback
  return url;
}

export const toBase64 = (params: Record<string, string>) => {
  return btoa(new URLSearchParams(params).toString());
};

export const fromBase64 = (
  base64Params: string
): Record<string, string> | undefined => {
  try {
    return Object.fromEntries(new URLSearchParams(atob(base64Params)));
  } catch (error) {
    console.error("decode base64 error:", error);
    return undefined;
  }
};

export const pickRandom = (arr: string[]): string | undefined => {
  if (!arr.length) return undefined;
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx];
};

export const replacePlaceholders = (
  text: string,
  variables: Record<string, string>
) => {
  return text.replace(
    /\{\{(\w+)\}\}/g,
    (match, key) => variables[key] || match
  );
};

// Pred2Moon,Monad,PredictionMarkets ==> #Pred2Moon #Monad #PredictionMarkets​
export const addHashtags = (input: string): string => {
  if (!input) return "";
  const items = input.split(",").map((item) => item.trim());
  return items.map((item) => `#${item}`).join(" ");
};

// Get the id of the shared image
export const getShareImage = async (el: HTMLElement, topicId: string) => {
  let data = await doFetch(`/api/proxy/share/og-image?topicId=${topicId}`, {
    method: "GET",
  });
  if (data) return data;

  data = await uploadShareImage(
    topicId,
    await captureElementToBlob(el, { proxyImage: null })
  );
  if (data) return data;

  return undefined;
};

// Upload and share pictures
export const uploadShareImage = async (
  topicId: string,
  blob: Blob | undefined
) => {
  if (!blob) return undefined;

  const formData = new FormData();
  formData.append("topicId", topicId);
  formData.append("file", blob, "share.png");

  const data: any = await doFetch("/api/proxy/share/up-image", {
    method: "POST",
    body: formData,
  });

  if (data) {
    console.log("upload success:", data.id, "URL:", data.url);
    return data;
  } else {
    console.error("upload failed:", data.error);
  }
};
