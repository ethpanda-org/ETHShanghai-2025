import domtoimage from 'dom-to-image';

export function getFatherInviteCode() {
  let startParams = {};

  let babse64Params = window.Telegram?.WebApp?.initDataUnsafe?.start_param || '';
  if (!babse64Params) {
    return startParams;
  }

  startParams = base64ToParams(babse64Params)
  return startParams;
}

export function paramsToBase64(params: any) {
  const urlParams = new URLSearchParams(params);
  const encodedParams = urlParams.toString();

  const babse64Params = btoa(encodedParams);
  return babse64Params;
}

export function base64ToParams(babse64Params: any) {
  const params = {};
  try {
    const decodedString = atob(babse64Params);
    const urlParams = new URLSearchParams(decodedString);
    for (const [key, value] of urlParams) {
      params[key] = value;
    }
  } catch (error) {
    console.error('decode base64 error:', error);
  }
  return params;
}

type InviteParams = {
  inviteCode?: string;
  redirect?: string;
  [key: string]: any;
}
export function inviteUser(params: InviteParams) {

  const botInfo = useRuntimeConfig().public.tgBotInfo || '';
  const babse64Params = paramsToBase64({ ...params });

  const miniAppUrl = `https://t.me/${botInfo}?startapp=${babse64Params}`;
  const shareUrl = `https://t.me/share/url?url=${miniAppUrl}`;
  if (window.Telegram) {
    window.Telegram.WebApp.openTelegramLink(shareUrl);
  } else {
    window.open(shareUrl, '_blank');
  }
}

async function getImageFromProxy(img: any) {
  return $fetch('/api/proxy/image', {
    method: 'POST',
    body: {
      url: img.src
    },
  });
}

export async function captureTargetToPng(name = 'shareImageName', target: HTMLElement) {
  if (!target) {
    return;
  }

  try {
    const imgElements = target.querySelectorAll('img');
    const promises = Array.from(imgElements).filter(img => img.src.startsWith('http')).map(img => getImageFromProxy(img));

    const base64Urls = await Promise.all(promises);

    imgElements.forEach((img, index) => {
      if (base64Urls[index]) {
        img.src = URL.createObjectURL(base64Urls[index]);
      }
    });
    // const blob = await domtoimage.toBlob(target);
    // const url = URL.createObjectURL(blob);
    const url = await domtoimage.toJpeg(target, { quality: 1 });
    const link = document.createElement('a');
    link.download = `${name}.png`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.log('captureTargetToPng error', error)
  }
}

function replacePlaceholders(text: string, variables: Record<string, string>) {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] || match);
}

export function handleRetweet({ hashtags, retweetTargetUrl, text, refId, title }: { hashtags: string; retweetTargetUrl: string; text: string; refId: string; title: string }) {
  const url = new URL("https://twitter.com/intent/tweet");
  hashtags && url.searchParams.append("hashtags", hashtags);
  url.searchParams.append("url", retweetTargetUrl);

  const shareLink = new URL(location.href);
  shareLink.searchParams.set('refId', refId)
  text = replacePlaceholders(text, { url: shareLink.toString(), title })

  url.searchParams.append("text", text);
  window.open(url.toString(), "_blank");
}
