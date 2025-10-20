import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
// 使用React.lazy实现路由懒加载
const WalletPage = React.lazy(() => import('./pages/WalletPage'));
const WelcomePage = React.lazy(() => import('./pages/WelcomePage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const UnlockWalletPage = React.lazy(() => import('./pages/UnlockWalletPage'));
import { Button, Input, Card, Space } from 'antd';
import 'antd/dist/reset.css';
import './common.css';
import { initPWAInstallPrompt, triggerPWAInstall, isPWAInstalled } from './utils/pwaUtils.js';
import { loadMnemonic, isMnemonicSaved, isMnemonicEncrypted } from './utils/utils.js';
import { isEmbeddedBrowser } from './utils/browserUtils.js';
import BrowserNotSupportedPage from './pages/BrowserNotSupportedPage.jsx';
import { withTranslation } from 'react-i18next';
import { useStore } from './utils/store.js';

// 创建一个包装组件以在类组件中使用导航和位置信息
const wrapper = (Component) => {
  return (props) => {
    const navigate = useNavigate();
    const location = useLocation();
    return <Component {...props} navigate={navigate} location={location} />;
  };
};

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasMnemonic: false,
      isLoading: true,
      showInstallButton: false,
      installPrompt: null,
      isEncrypted: false,
      isBrowserSupported: true // 默认为支持的浏览器环境
    };
    this.cleanupPWA = null;
  }

  // 组件挂载时检查是否存在已保存的助记词
  componentDidMount() {
    console.log('componentDidMount');

    // 首先检查浏览器环境是否支持
    const browserSupported = !isEmbeddedBrowser();
    this.setState({ isBrowserSupported: browserSupported });

    // 如果浏览器环境支持，则继续初始化钱包
    if (browserSupported) {
      this.initializeWallet();

      // 初始化PWA安装提示
      this.initPWAFeatures();
    } else {
      this.setState({ isLoading: false });
    }
  }

  componentWillUnmount() {
    // 清理PWA相关的事件监听器
    if (this.cleanupPWA) {
      this.cleanupPWA();
    }
  }

  // 初始化PWA功能
  initPWAFeatures = () => {
    // 检查应用是否已安装
    if (isPWAInstalled()) {
      console.log('PWA is already installed');
      return;
    }

    // 初始化安装提示功能
    this.cleanupPWA = initPWAInstallPrompt((installPrompt) => {
      // 当安装提示可用时，显示安装按钮
      this.setState({
        showInstallButton: true,
        installPrompt
      });
    });
  }

  // 处理安装按钮点击
  handleInstallClick = async () => {
    const { installPrompt } = this.state;

    try {
      if (installPrompt) {
        // 触发安装提示
        await triggerPWAInstall(installPrompt);
        // 安装后隐藏按钮
        this.setState({ showInstallButton: false, installPrompt: null });
      }
    } catch (error) {
      console.error('Failed to install application:', error);
    }
  }

  // 渲染PWA安装按钮组件
  renderPWAInstallButton = () => {
    const { showInstallButton } = this.state;

    return showInstallButton ? (
      <div className="pwa-install-button-container">
        <Button
          type="primary"
          onClick={this.handleInstallClick}
          // className="pwa-install-button"
        >
          {this.props.t('addToHomeScreen')}
        </Button>
      </div>
    ) : null;
  }

  // 初始化钱包，检查助记词状态
  initializeWallet = async () => {
    try {
      const hasMnemonic = isMnemonicSaved();
      const isEncrypted = hasMnemonic ? isMnemonicEncrypted() : false;

      this.setState({
        hasMnemonic: hasMnemonic,
        isEncrypted: isEncrypted,
        isLoading: false
      });

      // 如果有助记词且未加密，自动加载
      if (hasMnemonic && !isEncrypted) {
        await loadMnemonic();
      }
    } catch (error) {
      console.error('初始化钱包失败:', error);
      this.setState({
        hasMnemonic: false,
        isLoading: false
      });
    }
  };

  render() {
    const { mnemonic } = this.props;
    const { isLoading, isEncrypted, isBrowserSupported } = this.state;

    if (isLoading) {
      return (
        <div className="container">
          <p>{this.props.t('loading')}...</p>
        </div>
      );
    }

    // 如果浏览器环境不支持，显示提示组件
    if (!isBrowserSupported) {
      console.log('App.js: Browser environment not supported');
      return <Suspense fallback={<div className="container"><p>{this.props.t('loading')}...</p></div>}>
          <BrowserNotSupportedPage />
        </Suspense>
    }

    const WrappedWelcomePage = wrapper(WelcomePage);

    if (!mnemonic) {
      const hasMnemonic = isMnemonicSaved();

      if (!hasMnemonic) {
        console.log('App.js: No mnemonic phrase');
        return (
          <>
            <Suspense fallback={<div className="container"><p>{this.props.t('loading')}...</p></div>}>
              <WrappedWelcomePage />
              {this.renderPWAInstallButton()}
            </Suspense>
          </>
        );
      } else {
        console.log('App.js: Mnemonic phrase is encrypted');
        return (
          <Suspense fallback={<div className="container"><p>{this.props.t('loading')}...</p></div>}>
            <UnlockWalletPage />
            {this.renderPWAInstallButton()}
          </Suspense>
        );
      }
    }

    // 助记词已加载，可以访问钱包页面
    const WrappedWalletPage = wrapper(WalletPage);
    const WrappedSettingsPage = wrapper(SettingsPage);
    // 路由配置

    console.log('App.js: Mnemonic phrase is loaded');
    return (
      <>
        <Suspense fallback={<div className="container"><p>{this.props.t('loading')}...</p></div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/wallet" replace />} />
            <Route path="/wallet" element={<WrappedWalletPage />} />
            <Route path="/welcome" element={<WrappedWelcomePage />} />
            <Route path="/settings" element={<WrappedSettingsPage />} />
            <Route path="*" element={<Navigate to="/wallet" replace />} />
          </Routes>
        </Suspense>
        {this.renderPWAInstallButton()}
      </>
    );
  }
}

// 创建一个函数组件来包装App，并使用useStore(selector)只订阅mnemonic状态
const AppWrapper = (props) => {
  // 使用selector函数只获取mnemonic状态
  const mnemonic = useStore(state => state.mnemonic);
  return <App {...props} mnemonic={mnemonic} />;
};

// 先应用翻译，再应用我们的AppWrapper
const WrappedApp = withTranslation()(AppWrapper);

export default WrappedApp;
