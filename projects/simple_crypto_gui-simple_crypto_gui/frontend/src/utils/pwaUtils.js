// Utility functions for PWA-related features

/**
 * Initialize PWA installation prompt functionality
 * @param {function} onInstallPrompt - Callback function when installation prompt is available
 * @returns {function} Cleanup function
 */
export const initPWAInstallPrompt = (onInstallPrompt) => {
  // 存储beforeinstallprompt事件
  let deferredPrompt;
  
  // 监听beforeinstallprompt事件
  const handleBeforeInstallPrompt = (e) => {
    // 阻止默认安装提示
    e.preventDefault();
    // 存储事件以便稍后触发
    deferredPrompt = e;
    // 通知应用有可用的安装提示
    if (onInstallPrompt) {
      onInstallPrompt(deferredPrompt);
    }
    
    console.log('PWA installation prompt is ready');
  };
  
  // 监听appinstalled事件
  const handleAppInstalled = () => {
    console.log('PWA has been successfully installed');
    // 重置安装提示
    deferredPrompt = null;
  };
  
  // 添加事件监听器
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  window.addEventListener('appinstalled', handleAppInstalled);
  
  // 返回清理函数
  return () => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
  };
};

/**
 * Trigger PWA installation prompt
 * @param {Event} promptEvent - beforeinstallprompt event object
 * @returns {Promise<{outcome: string, platform: string}>} Installation result
 */
export const triggerPWAInstall = async (promptEvent) => {
  if (!promptEvent) {
    throw new Error('Installation prompt event is not available');
  }
  
  // 显示安装提示
  const result = await promptEvent.prompt();
  console.log('Installation prompt result:', result.outcome);
  
  // 安装提示只能使用一次，之后需要等待新的beforeinstallprompt事件
  promptEvent = null;
  
  return result;
};

/**
 * Check if the app is installed
 * @returns {boolean} Whether it is installed
 */
export const isPWAInstalled = () => {
  // 检查是否通过PWA方式启动
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
  
  // 在iOS上，检查navigator.standalone
  const isIosStandalone = window.navigator.standalone === true;
  
  return isStandalone || isFullscreen || isMinimalUI || isIosStandalone;
};