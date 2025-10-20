import React from 'react';
import { Modal, Typography } from 'antd';
import { withTranslation } from 'react-i18next';
import './css/DeleteCustomChainModal.css';

/**
 * Modal component for deleting custom chains
 */
class DeleteCustomChainModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: false
    };
  }

  // Open modal
  show = () => {
    // Filter out all user-added custom chains
    const customChains = this.props.allChains.filter(chain => chain.isCustom);

    if (customChains.length === 0) {
      Modal.info({
        title: this.props.t('prompt'),
        content: this.props.t('noCustomChainsToDelete')
      });
      return;
    }
    
    this.setState({ visible: true });
  };

  // Close modal
  hide = () => {
    this.setState({ visible: false });
  };

  // Handle deletion of custom chains
  handleDeleteCustomChains = async () => {
    try {
      // Filter out all user-added custom chains
      const customChains = this.props.allChains.filter(chain => chain.isCustom);
      
      // Get selected chain IDs
      const selectedChainIds = customChains
        .filter(chain => document.getElementById(`delete-chain-${chain.id}`)?.checked)
        .map(chain => chain.id);

      if (selectedChainIds.length === 0) {
        Modal.warning({
          title: this.props.t('prompt'),
          content: this.props.t('pleaseSelectAtLeastOneChain')
        });
        // Reopen the delete dialog
        setTimeout(() => this.show(), 500);
        return;
      }

      // Delete selected chains
      let deletedChainNames = [];
      for (const chainId of selectedChainIds) {
        const chainToDelete = customChains.find(chain => chain.id === chainId);
        if (chainToDelete) {
          if (this.props.onDelete) {
            await this.props.onDelete(chainId);
          }
          deletedChainNames.push(chainToDelete.name);
        }
      }

      Modal.success({
        title: this.props.t('deleteSuccess'),
        content: this.props.t('successfullyDeletedChains', { chainNames: deletedChainNames.join('、') })
      });
      
      // Close modal
      this.hide();

    } catch (error) {
      Modal.error({
        title: this.props.t('deleteFailed'),
        content: error.message || this.props.t('errorDeletingChain')
      });
    }
  }

  render() {
    const { t, allChains, currentChainId } = this.props;
    const customChains = allChains.filter(chain => chain.isCustom);
    
    return (
      <Modal
        title={t('deleteCustomChain')}
        open={this.state.visible}
        onOk={this.handleDeleteCustomChains}
        onCancel={this.hide}
        okText={t('delete')}
        cancelText={t('cancel')}
        width={500}
        closable={true}
      >
        <div>
          <Typography.Text className="delete-chain-instruction">{t('selectCustomChainsToDelete')}</Typography.Text>
          {customChains.map(chain => (
            <div
              key={chain.id}
              className={`delete-chain-item ${currentChainId === chain.id ? 'current-chain' : ''}`}
            >
              <input
                type="checkbox"
                id={`delete-chain-${chain.id}`}
                className="delete-chain-checkbox"
              />
              <label htmlFor={`delete-chain-${chain.id}`}>
                <span className="delete-chain-name">{chain.name}</span>
                {currentChainId === chain.id && (
                  <span className="delete-chain-current-tag">
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

export default withTranslation()(DeleteCustomChainModal);