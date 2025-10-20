import { toast } from 'sonner';
import { getGlobalTranslator } from './i18n-helper';

function copyToClipboard(text: string | undefined) {
  const t = getGlobalTranslator();
  if (!text) {
    toast.error(t('failedToCopyToClipboard'));
    return;
  }
  if (navigator.clipboard && window.isSecureContext) {
    // 现代浏览器支持
    return navigator.clipboard.writeText(text).then(() => {
      console.log("已复制到剪贴板:", text);
      toast.success(t('copySuccess', { text }));
    }).catch(err => {
      console.error("复制失败:", err);
      toast.error(t('failedToCopyToClipboard'));
    });
  } else {
    // 兼容旧浏览器
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";  // 避免页面滚动
    textArea.style.opacity = "0";       // 不可见
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
      console.log("已复制到剪贴板:", text);
      toast.success(t('copySuccess', { text }));
    } catch (err) {
      console.error("复制失败:", err);
      toast.error(t('failedToCopyToClipboard'));
    }

    document.body.removeChild(textArea);
  }
  return;
}


export default copyToClipboard