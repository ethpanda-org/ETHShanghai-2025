import React from 'react';
import { Modal, Typography } from 'antd';
import { withTranslation } from 'react-i18next';
import './css/DeleteCustomCoinModal.css';

/**
 * Modal component for deleting custom coins
 */
class DeleteCustomCoinModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: false
    };
  }

  // Open modal
  show = () => {
    // Filter custom coins of current chain
    const customCoins = this.props.availableCoins.filter(coin => coin.isCustom);

    // If no custom coins, show prompt
    if (customCoins.length === 0) {
      Modal.info({
        title: this.props.t('prompt'),
        content: this.props.t('noCustomCoins')
      });
      return;
    }
    
    this.setState({ visible: true });
  };

  // Close modal
  hide = () => {
    this.setState({ visible: false });
  };

  // Handle deletion of custom coins
  handleDeleteCustomCoins = async () => {
    try {
      // Filter custom coins of current chain
      const customCoins = this.props.availableCoins.filter(coin => coin.isCustom);
      
      // Get selected coin addresses
      const selectedCoinAddresses = customCoins
        .filter(coin => document.getElementById(`delete-coin-${coin.address}`)?.checked)
        .map(coin => coin.address);

      if (selectedCoinAddresses.length === 0) {
        Modal.warning({
          title: this.props.t('prompt'),
          content: this.props.t('pleaseSelectAtLeastOneCoin')
        });
        // Reopen the delete dialog
        setTimeout(() => this.show(), 500);
        return;
      }

      // Delete selected coins
      let deletedCoinNames = [];
      for (const address of selectedCoinAddresses) {
        const coinToDelete = customCoins.find(coin => coin.address === address);
        if (coinToDelete) {
          if (this.props.onDelete) {
            await this.props.onDelete(address, this.props.currentChainId);
          }
          deletedCoinNames.push(coinToDelete.symbol);
        }
      }

      Modal.success({
        title: this.props.t('deleteSuccess'),
        content: this.props.t('successfullyDeletedCoins', { coinNames: deletedCoinNames.join('、') })
      });
      
      // Close modal
      this.hide();

    } catch (error) {
      Modal.error({
        title: this.props.t('deleteFailed'),
        content: error.message || this.props.t('errorDeletingCoin')
      });
    }
  }

  render() {
    const { t, availableCoins, currentChainId, currentCoin } = this.props;
    const customCoins = availableCoins.filter(coin => coin.isCustom);
    
    return (
      <Modal
        title={t('deleteCustomCoin')}
        open={this.state.visible}
        onOk={this.handleDeleteCustomCoins}
        onCancel={this.hide}
        okText={t('delete')}
        cancelText={t('cancel')}
        width={500}
        closable={true}
      >
        <div>
          <Typography.Text className="delete-coin-instruction">{t('selectCustomCoinsToDelete')}</Typography.Text>
          {customCoins.map(coin => (
            <div
              key={coin.address}
              className={`delete-coin-item ${currentCoin?.address === coin.address ? 'current-coin' : ''}`}
            >
              <input
                type="checkbox"
                id={`delete-coin-${coin.address}`}
                className="delete-coin-checkbox"
              />
              <label htmlFor={`delete-coin-${coin.address}`}>
                <span className="delete-coin-name">{coin.symbol}</span>
                {currentCoin && currentCoin.address === coin.address && (
                  <span className="delete-coin-current-tag">
                    {t('currentlyUsed')}
                  </span>
                )}
              </label>
            </div>
          ))}
        </div>
      </Modal>
    );
  }
}

export default withTranslation()(DeleteCustomCoinModal);