import React from 'react';
import { Modal, Typography, Select, Button } from 'antd';
import { withTranslation } from 'react-i18next';
import './css/BlockchainSettingsModal.css';

/**
 * Blockchain settings modal component
 */
class BlockchainSettingsModal extends React.Component {
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
    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  render() {
    const { t, store, availableCoins, onChainChange, onCoinChange, onOpenCustomChainModal, onDeleteCustomChain, onOpenCustomCoinModal, onDeleteCustomCoin } = this.props;
    
    return (
      <Modal
        title={t('blockchainSettings')}
        open={this.state.visible}
        footer={[
          <Button key="close" onClick={this.hide}>
            {t('close')}
          </Button>
        ]}
        width={600}
        closable={true}
        onCancel={this.hide}
      >
        <div className="blockchain-settings-container">
          <div className="setting-item">
            <Typography.Text className="blockchain-settings-label">{t('selectChain')}</Typography.Text>
            <div className="setting-buttons">
              <Select
                className="setting-select"
                placeholder={t('pleaseSelectChain')}
                value={store.currentChain?.id}
                onChange={onChainChange}
                options={store.allChains.map(chain => ({
                  value: chain.id,
                  label: chain.isCustom ?
                    <span style={{ color: 'green' }}>{chain.name}</span> :
                    chain.name
                }))}
                allowClear={false}
              />
              <Button
                type="default"
                size="small"
                onClick={onOpenCustomChainModal}
                className="icon-button"
              >
                +
              </Button>
              <Button
                type="default"
                size="small"
                onClick={onDeleteCustomChain}
                className="icon-button"
              >
                -
              </Button>
            </div>
          </div>

          <div className="setting-item">
            <Typography.Text className="blockchain-settings-label">{t('selectCoin')}</Typography.Text>
            <div className="setting-buttons">
              <div className="select-container">
                <Select
                  className="setting-select"
                  placeholder={t('pleaseSelectCoin')}
                  value={store.currentCoin?.address || undefined}
                  onChange={onCoinChange}
                  options={availableCoins.map(coin => ({
                    value: coin.address,
                    label: coin.isCustom ?
                      <span style={{ color: 'green' }}>{coin.symbol}</span> :
                      `${coin.symbol}`
                  }))}
                  allowClear={false}
                />
                {store.currentCoin?.address && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCoinChange(undefined);
                    }}
                    className="clear-selection-button"
                    aria-label="Clear selection"
                  >
                    ✕
                  </button>
                )}
              </div>
              <Button
                type="default"
                size="small"
                onClick={onOpenCustomCoinModal}
                disabled={typeof store.currentChain?.id === 'string' && store.currentChain?.id?.startsWith('btc')}
                className="icon-button"
              >
                +
              </Button>
              <Button
                type="default"
                size="small"
                onClick={onDeleteCustomCoin}
                disabled={typeof store.currentChain?.id === 'string' && store.currentChain?.id?.startsWith('btc')}
                className="icon-button"
              >
                -
              </Button>
            </div>
            {!availableCoins.length && (
              <Typography.Text type="secondary" className="empty-message">
                {t('noAvailableTokens')}
              </Typography.Text>
            )}
          </div>
        </div>
      </Modal>
    );
  }
}

export default withTranslation()(BlockchainSettingsModal);