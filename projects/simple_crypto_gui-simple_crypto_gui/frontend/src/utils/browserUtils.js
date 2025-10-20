// Browser environment detection utilities

/**
 * Detect if the current environment is running in a specific non-browser environment
 * @returns {boolean} Whether it's in a non-browser environment
 */
export const isEmbeddedBrowser = () => {
  const ua = window.navigator.userAgent.toLowerCase();
  
  // Detect common embedded browser features
  const isWeChat = ua.indexOf('micromessenger') !== -1;
  const isQQ = ua.indexOf('qqbrowser') !== -1 && ua.indexOf('mqqbrowser') !== -1;
  const isAlipay = ua.indexOf('alipayclient') !== -1;
  const isDouban = ua.indexOf('doubanapp') !== -1;
  const isWeibo = ua.indexOf('weibo') !== -1;
  // Detect international applications
  const isFacebook = ua.indexOf('fbav') !== -1; // Facebook
  const isWhatsApp = ua.indexOf('whatsapp') !== -1;
  const isInstagram = ua.indexOf('instagram') !== -1;
  const isTwitter = ua.indexOf('twitter') !== -1;
  const isTelegram = ua.indexOf('telegram') !== -1;
  
  // Detect general WebView features
  // Match iOS devices without Safari (usually WebView)
  const isIOSWebView = /(iphone|ipod|ipad).*applewebkit(?!.*safari)/i.test(ua);
  // Match Android devices without Chrome (usually WebView)
  const isAndroidWebView = /android.*applewebkit(?!.*chrome)/i.test(ua);
  
  const isWebView = isIOSWebView || isAndroidWebView;
  
  return isWeChat || isQQ || isAlipay || isDouban || isWeibo || 
         isFacebook || isWhatsApp || isInstagram || isTwitter || isTelegram || 
         isWebView;
};

/**
 * Copy current URL to clipboard
 * @returns {Promise<boolean>} Whether the copy was successful
 */
export const copyCurrentUrlToClipboard = async () => {
  try {
    const currentUrl = window.location.href;
    await navigator.clipboard.writeText(currentUrl);
    return true;
  } catch (err) {
    console.error('Failed to copy URL:', err);
    
    // Fallback: Use traditional copy method
    try {
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackErr) {
      console.error('Fallback copy method also failed:', fallbackErr);
      return false;
    }
  }
};

/**
 * Detect if the current device is a mobile device
 * @returns {boolean} Whether it's a mobile device
 */
export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent);
};

/**
 * Detect if camera is available
 * @returns {Promise<boolean>} Whether camera is available
 */
export const hasAvailableCamera = async () => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return false;
  }
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    // Release camera resources
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    return true;
  } catch (error) {
    console.log('Cannot access camera:', error);
    return false;
  }
};

// Detect user's browser language
export const detectBrowserLanguage = () => {
  try {
    // Get browser language settings
    const browserLanguage = navigator.language || navigator.userLanguage;
    
    // Extract primary language code (e.g., 'zh-CN' -> 'zh')
    const primaryLanguage = browserLanguage.split('-')[0];
    
    // Only support Chinese and English
    if (['zh', 'en'].includes(primaryLanguage)) {
      return primaryLanguage;
    }
    
    // Default to English
    return 'en';
  } catch (error) {
    console.error('Failed to detect browser language:', error);
    return 'zh'; // Default to Chinese in case of error
  }
};