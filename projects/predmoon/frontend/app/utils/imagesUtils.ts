import domtoimage from "dom-to-image";

export type CaptureOptions = {
  scale?: number; // devicePixelRatio 放大（默认 1 or window.devicePixelRatio）
  bgcolor?: string | null; // 背景色，null 表示透明
  quality?: number; // jpeg quality (0-1)
  proxyImage?: ((img: HTMLImageElement) => Promise<Blob | null>) | null; // 可选的图片代理器
};

/**
 * Capture HTMLElement as a Blob (PNG or JPEG)
 */
export const captureElementToBlob = async (
  el: HTMLElement,
  {
    bgcolor = null,
    quality = 1,
    proxyImage = getImageFromProxy,
  }: CaptureOptions = {}
): Promise<Blob | undefined> => {
  if (!el) throw new Error("target element is required");

  const realWidth = el.offsetWidth;
  const realHeight = el.offsetHeight;

  const scaleX = 1200 / realWidth;
  const scaleY = 628 / realHeight;

  const options: any = {
    bgcolor,
    width: 1200,
    height: 628,
    quality: quality,
    style: {
      transform: `scale(${scaleX}, ${scaleY})`,
      transformOrigin: "top left",
      // Note: Sometimes it is necessary to add font-smoothing / -webkit-font-smoothing
      // to improve text effect
    },
    filter: (node: Node) => {
      // You can filter certain nodes, such as hiding dynamic effects
      return true;
    },
  };

  // Handle cross-domain images: If the proxyImage function is provided,
  // replace remote img with data-url/object-url in the node
  let replacedImgs: Array<{ img: HTMLImageElement; url?: string }> = [];
  if (proxyImage) {
    const imgs = Array.from(el.querySelectorAll("img")) as HTMLImageElement[];
    const fetches = imgs
      .filter((i) => !!i.src && i.src.startsWith("http"))
      .map(async (img) => {
        try {
          const blob = await proxyImage(img);
          if (blob) {
            const objectUrl = URL.createObjectURL(blob);
            replacedImgs.push({ img, url: objectUrl });
            img.setAttribute("data-domtoimage-orig-src", img.src);
            img.src = objectUrl;
          }
        } catch (e) {
          // Ignore, keep the original src (may cause contamination)original src (may cause pollution)
          console.warn("proxyImage failed for", img.src, e);
        }
      });
    await Promise.all(fetches);
  }

  try {
    // Prefer JPEG if quality is set (and less than 1), otherwise use PNG
    if (quality && quality < 1) {
      const dataUrl = await domtoimage.toJpeg(el, options);
      return dataURLToBlob(dataUrl);
    } else {
      // Default to PNG (preserving transparency)
      const blob = await domtoimage.toBlob(el, options);
      return blob;
    }
  } catch (err) {
    console.error("captureElementToBlob failed", err.target);
  } finally {
    // Restore original img src and revoke objectUrl
    for (const it of replacedImgs) {
      if (it.url) {
        try {
          it.img.src =
            it.img.getAttribute("data-domtoimage-orig-src") || it.img.src;
          it.img.removeAttribute("data-domtoimage-orig-src");
          URL.revokeObjectURL(it.url);
        } catch (e) {
          // ignore
        }
      }
    }
  }
};

/**
 * Blob -> dataURL
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * dataURL -> Blob
 */
export function dataURLToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(",");
  const mimeMatch = arr[0]!.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const bstr = atob(arr[1]!);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

/** 触发用户下载 */
export function downloadBlob(blob: Blob, filename = "image.png") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function getImageFromProxy(
  imgEl: HTMLImageElement
): Promise<Blob | null> {
  return doFetch("/api/proxy/image", {
    method: "POST",
    body: {
      url: encodeURIComponent(imgEl.src),
    },
  }).then(async (res: any) => {
    if (res) {
      return new Blob([res], {
        type: `image/${getImageExtension(imgEl)}`,
      });
    }
    return null;
  });
}

export const getImageExtension = (imgEl: HTMLImageElement): string => {
  const src = imgEl.src;
  const url = new URL(src);
  const pathname = url.pathname;
  const filename = pathname.split("/").pop() || "";
  const lastDotIndex = filename.lastIndexOf(".");

  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return "";
  }

  return filename.substring(lastDotIndex + 1).toLowerCase();
};
