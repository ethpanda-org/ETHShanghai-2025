import React from 'react';
import { Modal, Typography, Button } from 'antd';
import { withTranslation } from 'react-i18next';
import { QRCodeCanvas } from 'qrcode.react';
import './css/QrCodeModal.css';

/**
 * Modal component for displaying wallet address QR code
 */
class QrCodeModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: false
    };
  }

  // Open modal
  show = () => {
    this.setState({ visible: true });
  };

  // Close modal
  hide = () => {
    this.setState({ visible: false });
  };

  render() {
    const { t, walletAddress } = this.props;
    
    return (
      <Modal
        title={t('walletAddressQrCode')}
        open={this.state.visible}
        onCancel={this.hide}
        footer={[
          <Button key="close" onClick={this.hide}>
            {t('close')}
          </Button>
        ]}
        width={300}
        closable={true}
      >
        <div className="qr-code-container">
          {walletAddress && (
            <QRCodeCanvas value={walletAddress} size={200} level="H" />
          )}
          <Typography.Text className="wallet-address-text">
            {walletAddress}
          </Typography.Text>
        </div>
      </Modal>
    );
  }
}

export default withTranslation()(QrCodeModal);