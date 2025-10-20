import React from 'react';
import { Modal, Typography } from 'antd';
import { withTranslation } from 'react-i18next';
import './css/SavingModal.css';

/**
 * Modal component for displaying saving prompt
 */
class SavingModal extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { visible, t } = this.props;
    
    return (
      <Modal
        title={t('saving')}
        open={visible}
        closable={false}
        footer={null}
        maskClosable={false}
        keyboard={false}
        centered
        width={300}
        zIndex={10000}
      >
        <div className="saving-content-container">
          <Typography.Text>{t('savingChainInfo')}</Typography.Text>
        </div>
      </Modal>
    );
  }
}

export default withTranslation()(SavingModal);