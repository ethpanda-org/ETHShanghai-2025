import React from 'react';
import { Modal, Form, Input, Typography } from 'antd';
import { withTranslation } from 'react-i18next';
import { getTokenInfoFromContract } from '../utils/SettingsPageUtils.js';
import { useStore } from '../utils/store.js';
import './css/CustomCoinModal.css';

/**
 * Modal component for adding custom coins
 */
class CustomCoinModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: false
    };
    // Form reference
    this.form = React.createRef();
  }

  // Open modal
  show = () => {
    // Reset form
    if (this.form.current) {
      this.form.current.resetFields();
    }
    this.setState({ visible: true });
  };

  // Close modal
  hide = () => {
    this.setState({ visible: false });
  };

  // Handle adding custom coin
  handleAddCustomCoin = async () => {
    try {
      const form = this.form.current;
      if (!form) return;
      
      // Validate form
      const values = await form.validateFields();
      
      // Call external saving modal show function
      if (this.props.showSavingModal) {
        this.props.showSavingModal();
      }
      
      // Query token information via contract address
      let tokenInfo;
      try {
        tokenInfo = await getTokenInfoFromContract(values.address.trim());
      } catch (error) {
        // Close saving prompt modal
        if (this.props.hideSavingModal) {
          this.props.hideSavingModal();
        }
        
        Modal.error({
          title: this.props.t('tokenInfoFetchError'),
          content: this.props.t('failedToFetchTokenInfo'),
        });
        return;
      }
      
      // Create custom coin object
      const customCoin = {
        chainId: this.props.currentChainId,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals,
        address: values.address.trim(),
        // More fields can be added as needed
      };

      // Get store instance
      const store = useStore.getState();
      
      // Add custom coin
      try {
        store.addCustomCoin(customCoin);
        Modal.success({
          title: this.props.t('addSuccess'),
          content: this.props.t('successfullyAddedCoin', { coinName: customCoin.symbol })
        });
      } catch (error) {
        Modal.error({
          title: this.props.t('addFailed'),
          content: error.message || this.props.t('errorAddingCoin')
        });
        // Close saving prompt modal
        if (this.props.hideSavingModal) {
          this.props.hideSavingModal();
        }
        return;
      }
      
      // Close saving prompt modal
      if (this.props.hideSavingModal) {
        this.props.hideSavingModal();
      }

      // Close modal
      this.hide();

    } catch (error) {
      // Close saving prompt modal
      if (this.props.hideSavingModal) {
        this.props.hideSavingModal();
      }
      
      Modal.error({
        title: this.props.t('addFailed'),
        content: error.message || this.props.t('errorAddingCoin')
      });
    }
  }

  render() {
    const { t } = this.props;
    
    return (
      <Modal
        title={t('addCustomCoin')}
        open={this.state.visible}
        onOk={this.handleAddCustomCoin}
        onCancel={this.hide}
        okText={t('add')}
        cancelText={t('cancel')}
        width={500}
        closable={true}
      >
        <Form ref={this.form} layout="vertical">
          <Form.Item
            name="address"
            label={t('contractAddress')}
            rules={[
              { required: true, message: t('pleaseEnterContractAddress') },
              { pattern: /^0x[a-fA-F0-9]{40}$/, message: t('pleaseEnterValidEthereumContractAddress') }
            ]}
          >
            <Input placeholder="0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
}

export default withTranslation()(CustomCoinModal);