import React, { Suspense } from 'react';
import { Input, Button, Card, Space, Row, Col, Flex, Tooltip, Modal } from 'antd';
import { SettingOutlined, ReloadOutlined, QuestionOutlined, ScanOutlined } from '@ant-design/icons';
import '../common.css'; // Import common styles
import './css/WalletPage.css'; // Import page-specific styles
// import CountrySelector from '../components/CountrySelector';
import { handleFetchBalance, formatBalance, handleTransfer } from '../utils/WalletPageUtils';
import { withTranslation } from 'react-i18next';
import { isMobileDevice, hasAvailableCamera } from '../utils/browserUtils.js';
import { useStore } from '../utils/store.js';

// Define lazy-loaded BarcodeScanner component
const BarcodeScanner  = React.lazy(() => import('react-qr-barcode-scanner'));

// Create higher-order component
const withStore = (BaseComponent) => (props) => {
  const store = useStore();
  
  return <BaseComponent {...props} store={store} />;
};

class WalletPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // Balance related
      balance: null,
      isLoadingBalance: false,
      // Transfer related
      recipientAddress: '',
      transferAmount: '',
      isTransferring: false,
      transferSuccess: false,
      // UI state
      error: '', // Error message
      stopStream: false
    };
    // Arrow function class properties are automatically bound to this, no manual binding needed
  }

  // Navigate to settings page
  handleGoToSettings = () => {
    // Directly use navigate function
    if (this.props.navigate) {
      this.props.navigate('/settings');
    }
  }

  // Check for saved mnemonic when component mounts
  componentDidMount() {
    console.log('WalletPage component mounted');
    this.handleFetchBalance();
  }

  // Handle QR code scanning functionality
  handleScanQRCode = async () => {
    if (!isMobileDevice()) {
      return;
    }

    // Check camera availability after clicking
    const cameraAvailable = await hasAvailableCamera();
    if (!cameraAvailable) {
      Modal.error({
        title: this.props.t('warning'),
        content: this.props.t('cameraNotAvailable') || 'Cannot access camera, please ensure your device has a camera and permission has been granted',
      });
      return;
    }

    try {
      this.setState({ isScanning: true });
      
      // Create React QR scanning modal
      Modal.info({
        title: this.props.t('scanQRCode'),
        icon: null,
        content: (
          <div style={{ textAlign: 'center' }}>
            <p style={{ marginBottom: '16px' }}>{this.props.t('alignQRCodeWithinFrame')}</p>
            <div style={{ position: 'relative', width: '100%', maxWidth: '300px', margin: '0 auto' }}>
              <Suspense fallback={<div>{this.props.t('loadingScanner')}</div>}>
                <BarcodeScanner 
                  width="100%"
                  height="auto"
                  facingMode="environment"
                  torch={false}
                  onUpdate={(error, result) => {
                    if (result) {
                      const scannedData = result.text;
                      if (scannedData) {
                        // Remove possible ethereum: or bitcoin: prefixes
                        const cleanedAddress = scannedData
                          .replace(/^ethereum:/i, '') // Remove ethereum: prefix
                          .replace(/^bitcoin:/i, '');  // Remove bitcoin: prefix
                        
                        // Set stopStream to true to avoid browser freezing
                        this.setState({
                          stopStream: true,
                          recipientAddress: cleanedAddress
                        });
                        // Force close the modal
                        Modal.destroyAll();
                      }
                    }
                    if (error) {
                      console.error('Scan error:', error);
                    }
                  }}
                  onError={(error) => {
                    console.error('Camera error:', error);
                    if (error.name === "NotAllowedError") {
                      this.setState({
                        error: this.props.t('cameraPermissionDenied') || 'Camera permission denied'
                      });
                    }
                  }}
                  stopStream={this.state.stopStream}
                />
              </Suspense>
              {/* Add scan frame decoration - center and square regardless of outer container size */}
              <div className="qr-scan-frame">
                <span></span>
              </div>
            </div>
            {/* Scan animation logic is implemented in componentDidMount */}
          </div>
        ),
        okText: this.props.t('cancel'),
        onOk: () => {
          // Set stopStream to true to avoid browser freezing
          this.setState({ stopStream: true });
        },
        closable: true,
        centered: true,
        maskClosable: true,
        afterClose: () => {
          // Ensure all states are reset
          this.setState({
            stopStream: false // Reset stopStream for next use
          });
        }
      });
    } catch (error) {
      console.error('QR code scanning error:', error);
      this.setState({ 
        error: this.props.t('cameraAccessFailed') || 'Cannot access camera'
      });
    }
  }

  // Query balance (using WalletPageUtils)
  handleFetchBalance = async () => {
    console.log('Querying balance');

    this.setState({ isLoadingBalance: true });

    try {
      const balance = await handleFetchBalance();
      this.setState({ balance: balance, error: '' });
    } catch (error) {
      console.error('Failed to query balance:', error);
      this.setState({
        error: error.message || this.props.t('fetchBalanceFailed')
      });
    } finally {
      this.setState({ isLoadingBalance: false });
    }
  };

  // Format balance (using formatBalance function from WalletPageUtils)
  formatBalance = (balance) => {
    return formatBalance(balance);
  }

  // Handle recipient address change
  handleRecipientChange = (e) => {
    this.setState({ recipientAddress: e.target.value });
  }

  // Handle transfer amount change
  handleAmountChange = (e) => {
    this.setState({ transferAmount: e.target.value });
  }

  // Handle transfer (using WalletPageUtils)
  handleTransfer = async () => {
    const { recipientAddress, transferAmount } = this.state;

    try {
      this.setState({ isTransferring: true, error: '', transferSuccess: false });

      // Use handleTransfer function from WalletPageUtils
      const result = await handleTransfer(
        recipientAddress,
        transferAmount
      );

      if (result.success) {
        this.setState({
          transferSuccess: true,
          recipientAddress: '',
          transferAmount: '',
          error: this.props.t('transferSuccess') + ' ' + this.props.t('transactionHash') + ': ' + result.hash
        });
        // Refresh balance
        this.handleFetchBalance();
      } else {
        this.setState({ error: result.error || this.props.t('transferFailed') });
      }
    } catch (error) {
      console.error('Transfer failed:', error);
      this.setState({ error: error.message || this.props.t('transferFailed') });
    } finally {
      this.setState({ isTransferring: false });
    }
  }

  render() {
    const {
      balance,
      isLoadingBalance,
      recipientAddress,
      transferAmount,
      isTransferring,
      transferSuccess,
      error,
    } = this.state;

    // Prepare Tooltip content, using div and br tags to achieve two-line display
    const currentChain = this.props.store?.currentChain;
    const currentCoin = this.props.store?.currentCoin;
    const tooltipContent = (
      <div>
        <div>{this.props.t('currentChain')}: {currentChain?.name}</div>
        {currentCoin?.symbol && <div>{this.props.t('currentCoin')}: {currentCoin?.symbol}</div>}
      </div>
    );

    return (
      <Flex className="container">
        {/* Transfer section */}
        <Card className="section">
          {/* Transfer form section */}
          {/* <Space direction="vertical" className='space-section'> */}
          <Space className="balance-result">
            <Space className="balance-controls">
              <h4>{this.props.t('balance')}: {this.formatBalance(balance || 0)} </h4>
              <Button
                type='primary'
                icon={<ReloadOutlined />}
                onClick={this.handleFetchBalance}
                disabled={isLoadingBalance}
                loading={isLoadingBalance}
                title={this.props.t('refreshBalance')}
                className="small-btn"
              />
              <Tooltip title={tooltipContent}>
                <Button
                  type='primary'
                  icon={<QuestionOutlined />}
                  disabled={isLoadingBalance}
                  title={this.props.t('chainAndCoinInfo')}
                  className="small-btn info-btn"
                />
              </Tooltip>
            </Space>
            <Button
              type="primary"
              icon={<SettingOutlined />}
              onClick={this.handleGoToSettings}
              aria-label={this.props.t('settings')}
              className="small-btn"
            />
          </Space>

          <Space direction="vertical" className='space-section'>
            <Row align="middle" gutter={8}>
              <Col>
                <label htmlFor="recipient">{this.props.t('recipientAddress')}:</label>
              </Col>
              <Col>
                <Tooltip title={this.props.t('scanQRTooltip')}>
                  <Button
                    icon={<ScanOutlined />}
                    disabled={!isMobileDevice()}
                    onClick={this.handleScanQRCode}
                    className="small-btn"
                  >
                  </Button>
                </Tooltip>
              </Col>
            </Row>
            <Input
              id="recipient"
              value={recipientAddress}
              onChange={this.handleRecipientChange}
              placeholder={this.props.t('enterRecipientAddress')}
              className="input-field"
            />
          </Space>

          <Space direction="vertical" className='space-section'>
            <Row align="middle" gutter={8}>
              <Col>
                <label htmlFor="amount">{this.props.t('transferAmount')}:</label>
              </Col>
              <Col>
                {/* <CountrySelector onChange={(countryRate) => { console.log(countryRate) }}></CountrySelector> */}
              </Col>
            </Row>
            <Input
              type="number"
              id="amount"
              value={transferAmount}
              onChange={this.handleAmountChange}
              placeholder={this.props.t('enterTransferAmount')}
              step="0.000001"
              className="input-field"
            />
          </Space>

          <Button
            type="primary"
            onClick={this.handleTransfer}
            disabled={isTransferring}
            loading={isTransferring}
            // className="button"
          >
            {this.props.t('confirmTransfer')}
          </Button>

          {transferSuccess && (
            <div className="success-message">
              {this.props.t('transferSuccess')}
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* </Space> */}
        </Card>
      </Flex>
    );
  }
}

// Apply withStore HOC first, then withTranslation
const WalletPageWithStore = withStore(WalletPage);
export default withTranslation()(WalletPageWithStore);
