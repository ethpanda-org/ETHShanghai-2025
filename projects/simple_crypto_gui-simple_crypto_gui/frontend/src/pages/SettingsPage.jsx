import React from 'react';
import { Button, Card, Typography, Space, Flex, Modal, Select } from 'antd';
import { QrcodeOutlined } from '@ant-design/icons';
import '../common.css'; // Import common styles file
import './css/SettingsPage.css'; // Import page-specific styles file
import { getWalletAddress } from '../utils/utils.js';
import { deleteMnemonicFromLocalStorage } from '../utils/SettingsPageUtils.js';
import { withTranslation } from 'react-i18next';
import { ALL_LANGUAGES } from '../i18n/config.js';
import { useStore } from '../utils/store.js';

import BlockchainSettingsModal from '../components/BlockchainSettingsModal.jsx';
import CustomChainModal from '../components/CustomChainModal.jsx';
import DeleteCustomChainModal from '../components/DeleteCustomChainModal.jsx';
import CustomCoinModal from '../components/CustomCoinModal.jsx';
import DeleteCustomCoinModal from '../components/DeleteCustomCoinModal.jsx';
import QrCodeModal from '../components/QrCodeModal.jsx';
import SavingModal from '../components/SavingModal.jsx';

// Create higher-order component
const withStore = (BaseComponent) => (props) => {
  const store = useStore();
  
  // Derive available coins for current chain from store
  const availableCoins = store.allCoins.filter(coin => coin.chainId === store.currentChain.id);
  
  return <BaseComponent {...props} store={store} availableCoins={availableCoins} />;
};

class SettingsPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      walletAddress: '',
      savingModalVisible: false,
      mnemonicModalVisible: false,
      mnemonic: ''
    };
    
    // Initialize component instances
    this.blockchainSettingsModal = React.createRef();
    this.customChainModal = React.createRef();
    this.deleteCustomChainModal = React.createRef();
    this.customCoinModal = React.createRef();
    this.deleteCustomCoinModal = React.createRef();
    this.qrCodeModal = React.createRef();
  }

  // Switch language
  handleLanguageChange = (language) => {
    this.props.i18n.changeLanguage(language);
  }

  // Fetch wallet address when component mounts
  componentDidMount() {
    this.fetchWalletAddress();
    
    // Add popstate event listener to intercept browser back button
    window.addEventListener('popstate', this.handlePopState);
    
    // Add a history entry when page loads to ensure the first back button click doesn't exit the site
    window.history.pushState({ fromSettings: true }, '', window.location.href);
  }
  
  // Remove event listener when component unmounts to prevent memory leaks
  componentWillUnmount() {
    window.removeEventListener('popstate', this.handlePopState);
  }
  
  // Handle browser back button event
  handlePopState = (e) => {
    // Prevent browser default back behavior
    e.preventDefault();
    
    // Manually call handleBack method
    this.handleBack();
  }

  // Fetch wallet address
  fetchWalletAddress = async () => {
    try {
      const address = await getWalletAddress();
      this.setState({
        walletAddress: address
      });
    } catch (error) {
      console.error('Failed to fetch wallet address:', error);
    }
  }

  // Open add custom coin modal
  handleOpenCustomCoinModal = () => {
    if (this.customCoinModal.current) {
      this.customCoinModal.current.show();
    }
  }

  /**
   * Open delete custom coin modal
   */
  handleOpenDeleteCustomCoinModal = () => {
    if (this.deleteCustomCoinModal.current) {
      this.deleteCustomCoinModal.current.show();
    }
  }

  // Open QR code modal
  handleOpenQrCodeModal = () => {
    if (this.qrCodeModal.current) {
      this.qrCodeModal.current.show();
    }
  }

  // Return to wallet page
  handleBack = () => {
    // Ensure proper navigation even in MemoryRouter environment
    this.props.navigate(-1);
    
    // For MemoryRouter, we need to prevent browser default back behavior
    // Re-add a history entry to maintain application state
    window.history.replaceState({ fromSettings: true }, '', window.location.href);
  }

  // Open blockchain settings modal
  handleOpenBlockchainModal = () => {
    try {
      if (this.blockchainSettingsModal.current) {
        this.blockchainSettingsModal.current.show();
      }
    } catch (error) {
      console.error('Failed to open blockchain settings modal:', error);
    }
  }

  // Open custom chain settings modal
  handleOpenCustomChainModal = () => {
    if (this.customChainModal.current) {
      this.customChainModal.current.show();
    }
  }

  /**
   * Handle delete custom chain logic
   */
  handleDeleteCustomChain = () => {
    if (this.deleteCustomChainModal.current) {
      this.deleteCustomChainModal.current.show();
    }
  }

  // Handle chain selection change
  handleChainChange = (chainId) => {
    try {
      const selectedChain = this.props.store.allChains.find(chain => chain.id === chainId);
      if (selectedChain) {
        // Set new chain, which will automatically clear current coin
        this.props.store.setCurrentChain(selectedChain);
        this.fetchWalletAddress();
      }
    } catch (error) {
      console.error('Failed to switch chain:', error);
    }
  }

  // Handle coin selection change
  handleCoinChange = (coinAddress) => {
    try {
      if (coinAddress) {
        const selectedCoin = this.props.availableCoins.find(coin => coin.address === coinAddress);
        this.props.store.setCurrentCoin(selectedCoin);
      } else {
        // If no coin is selected, use native coin (set to null)
        this.props.store.setCurrentCoin(null);
      }
    } catch (error) {
      console.error('Failed to switch coin:', error);
    }
  }

  // Show mnemonic backup modal
  handleShowMnemonic = () => {
    try {
      // Get mnemonic directly from store
      const mnemonic = this.props.store.mnemonic;
      if (mnemonic) {
        this.setState({ mnemonicModalVisible: true, mnemonic });
      } else {
        Modal.error({
          title: this.props.t('error'),
          content: this.props.t('noSavedMnemonicFound')
        });
      }
    } catch (error) {
      console.error('Failed to load mnemonic:', error);
      Modal.error({
        title: this.props.t('error'),
        content: error.message
      });
    }
  }

  // Hide mnemonic modal
  handleCloseMnemonicModal = () => {
    this.setState({ mnemonicModalVisible: false, mnemonic: '' });
  }

  // Show saving prompt
  showSavingModal = () => {
    this.setState({ savingModalVisible: true });
  }
  
  // Hide saving prompt
  hideSavingModal = () => {
    this.setState({ savingModalVisible: false });
  }

  // Delete wallet and navigate to root directory
  handleDeleteWallet = () => {
    console.log('Before deleting wallet:');
    // Use Ant Design's Modal.confirm instead of browser native confirm dialog
    Modal.confirm({
      title: this.props.t('confirmDeleteWallet'),
      content: this.props.t('deleteWalletMessage'),
      okText: this.props.t('confirm'),
      cancelText: this.props.t('cancel'),
      onOk: () => {
        try {
          // Delete mnemonic
          deleteMnemonicFromLocalStorage();
          this.props.store.setMnemonic(null);

          // Navigate to welcome page
          if (this.props.navigate) {
            this.props.navigate('/welcome');
          }
        } catch (error) {
          console.error('Failed to delete wallet:', error);
        }
      }
    });
  }

  render() {
    const { walletAddress, savingModalVisible } = this.state;
    const { store, availableCoins } = this.props;
    const { Title, Text } = Typography;
    const { i18n } = this.props

    return (
      <Flex className="container">
        <Card className="section">
          <Space className='space-section'>
            <Button type="primary" onClick={this.handleBack} className="small-btn">{this.props.t('back')}</Button>
            <Select
              value={i18n.language}
              onChange={this.handleLanguageChange}
              style={{ width: 120, marginLeft: 'auto' }}
              options={ALL_LANGUAGES}
              allowClear={false}
            />
          </Space>
          <Space className='space-section'>
            <Title level={5}>{this.props.t('walletAddress')}</Title>
          </Space>
          <Space className='space-section' align="center" wrap>
            <Text className="address" style={{ wordBreak: 'break-all', maxWidth: '300px' }}>{walletAddress}</Text>
            <Button
              type="primary"
              icon={<QrcodeOutlined />}
              onClick={this.handleOpenQrCodeModal}
              disabled={!walletAddress}
              title={this.props.t('showQrCode')}
              className="small-btn"
            >
            </Button>
          </Space>
          <Space className='space-section'>
            <Button type='default' onClick={this.handleOpenBlockchainModal}>{this.props.t('blockchainSettings')}</Button>
            <Button type='default' onClick={this.handleShowMnemonic}>{this.props.t('backupMnemonic')}</Button>
          </Space>
          <Space className='space-section'>
            <Button type='default' danger onClick={this.handleDeleteWallet}>{this.props.t('deleteWallet')}</Button>
          </Space>
        </Card>

        <BlockchainSettingsModal
          ref={this.blockchainSettingsModal}
          store={store}
          availableCoins={availableCoins}
          onChainChange={this.handleChainChange}
          onCoinChange={this.handleCoinChange}
          onOpenCustomChainModal={this.handleOpenCustomChainModal}
          onDeleteCustomChain={this.handleDeleteCustomChain}
          onOpenCustomCoinModal={this.handleOpenCustomCoinModal}
          onDeleteCustomCoin={this.handleOpenDeleteCustomCoinModal}
        />
        
        <CustomChainModal
          ref={this.customChainModal}
          showSavingModal={this.showSavingModal}
          hideSavingModal={this.hideSavingModal}
        />
        
        <DeleteCustomChainModal
          ref={this.deleteCustomChainModal}
          allChains={store.allChains}
          currentChainId={store.currentChain.id}
          onDelete={store.removeCustomChain}
        />
        
        <CustomCoinModal
          ref={this.customCoinModal}
          currentChainId={store.currentChain.id}
          showSavingModal={this.showSavingModal}
          hideSavingModal={this.hideSavingModal}
        />
        
        <DeleteCustomCoinModal
          ref={this.deleteCustomCoinModal}
          availableCoins={availableCoins}
          currentChainId={store.currentChain.id}
          currentCoin={store.currentCoin}
          onDelete={store.removeCustomCoin}
        />
        
        <QrCodeModal
          ref={this.qrCodeModal}
          walletAddress={walletAddress}
        />
        
        <SavingModal
          visible={savingModalVisible}
        />

        {/* Mnemonic Backup Modal */}
        <Modal
          title={this.props.t('walletMnemonic')}
          open={this.state.mnemonicModalVisible}
          onCancel={this.handleCloseMnemonicModal}
          footer={[
            <Button key="close" onClick={this.handleCloseMnemonicModal}>
              {this.props.t('close')}
            </Button>
          ]}
        >
          <div style={{ marginBottom: 16 }}>
            <Typography.Text type="warning">{this.props.t('mnemonicSecurityWarning')}</Typography.Text>
          </div>

          <div style={{ backgroundColor: '#f5f5f5', padding: 16, borderRadius: 4, wordBreak: 'break-word' }}>
            {this.state.mnemonic}
          </div>
        </Modal>
      </Flex>
    );
  }
}

// Apply withStore higher-order component first, then withTranslation
const SettingsPageWithStore = withStore(SettingsPage);
export default withTranslation()(SettingsPageWithStore);