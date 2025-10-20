import React from 'react';
import { Modal, Form, Input } from 'antd';
import { withTranslation } from 'react-i18next';
import { getChainIdFromUrl } from '../utils/SettingsPageUtils.js';
import { useStore } from '../utils/store.js';
import './css/CustomChainModal.css';

/**
 * Modal component for adding custom chains
 */
class CustomChainModal extends React.Component {
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

  // Handle adding custom chain
  handleAddCustomChain = async () => {
    try {
      if (!this.form.current) return;

      const values = await this.form.current.validateFields();

      // Validate RPC URL
      try {
        new URL(values.rpcUrl);
      } catch (e) {
        Modal.error({
          title: this.props.t('inputError'),
          content: this.props.t('rpcUrlFormatError'),
        });
        return;
      }

      // Validate block explorer URL (if provided)
      if (values.blockExplorerUrl) {
        try {
          new URL(values.blockExplorerUrl);
        } catch (e) {
          Modal.error({
            title: this.props.t('inputError'),
            content: this.props.t('blockExplorerUrlFormatError'),
          });
          return;
        }
      }

      // Call external saving modal show function
      if (this.props.showSavingModal) {
        this.props.showSavingModal();
      }

      // Dynamically fetch Chain ID via RPC URL
      let chainId;
      try {
        // Use utility function to get chain ID from RPC URL
        chainId = await getChainIdFromUrl(values.rpcUrl);
        // Convert hexadecimal string to decimal number
        chainId = typeof chainId === 'string' && chainId.startsWith('0x') ? parseInt(chainId, 16) : chainId;
      } catch (error) {
        // Close saving prompt modal
        if (this.props.hideSavingModal) {
          this.props.hideSavingModal();
        }
        Modal.error({
          title: this.props.t('chainIdFetchError'),
          content: this.props.t('failedToFetchChainId'),
        });
        return;
      }

      // Construct custom chain object
      const customChain = {
        id: chainId,
        name: values.name,
        nativeCurrency: {
          decimals: 18, // Using default value 18
        },
        rpcUrls: {
          default: {
            http: [values.rpcUrl],
          }
        },
      };

      // If block explorer URL is provided, add to configuration
      if (values.blockExplorerUrl) {
        customChain.blockExplorers = {
          default: {
            name: values.name + ' Explorer',
            url: values.blockExplorerUrl,
          },
        };
      }

      // Get store instance
      const store = useStore.getState();
      
      // Add custom chain
      try {
        store.addCustomChain(customChain);
        Modal.success({
          title: this.props.t('addSuccess'),
          content: this.props.t('successfullyAddedChain', { chainName: customChain.name })
        });
      } catch (error) {
        Modal.error({
          title: this.props.t('addFailed'),
          content: error.message || this.props.t('errorAddingChain')
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
      console.error('Failed to add custom chain:', error);
      Modal.error({
        title: this.props.t('addFailed'),
        content: error.message || this.props.t('errorAddingChain')
      });
    }
  }

  render() {
    const { t } = this.props;
    
    return (
      <Modal
        title={t('addCustomChain')}
        open={this.state.visible}
        onOk={this.handleAddCustomChain}
        onCancel={this.hide}
        okText={t('add')}
        cancelText={t('cancel')}
        width={500}
        closable={true}
      >
        <Form
          ref={this.form}
          layout="vertical"
        >
          <Form.Item
            label={t('chainName')}
            name="name"
            rules={[
              { required: true, message: t('pleaseEnterChainName') },
              { min: 2, max: 50, message: t('chainNameLength') }
            ]}
          >
            <Input placeholder="Custom Network" />
          </Form.Item>

          <Form.Item
            label={t('rpcUrlRequired')}
            name="rpcUrl"
            rules={[
              { required: true, message: t('pleaseEnterRpcUrl') },
              { type: 'url', message: t('pleaseEnterValidUrl') }
            ]}
          >
            <Input placeholder="https://rpc.custom-network.com" />
          </Form.Item>

          <Form.Item
            label={t('explorerUrl')}
            name="blockExplorerUrl"
            rules={[
              { type: 'url', message: t('pleaseEnterValidUrl') }
            ]}
          >
            <Input placeholder="https://explorer.custom-network.com" />
          </Form.Item>
        </Form>
      </Modal>
    );
  }
}

export default withTranslation()(CustomChainModal);