import React from 'react';
import { Card, Button, Modal, Typography } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { copyCurrentUrlToClipboard } from '../utils/browserUtils.js';
import { withTranslation } from 'react-i18next';
import '../common.css';
import './css/BrowserNotSupportedPage.css';

/**
 * Browser environment not supported prompt component
 * Displayed when the user opens the application in an unsupported environment (such as WeChat built-in browser)
 */
class BrowserNotSupportedPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      copying: false
    };
  }

  /**
   * Handle the logic of copying URL to clipboard
   */
  handleCopyUrl = async () => {
    this.setState({ copying: true });
    try {
      const success = await copyCurrentUrlToClipboard();
      if (success) {
        Modal.success({
          title: this.props.t('copySuccess'),
          content: this.props.t('urlCopiedMessage'),
          okText: this.props.t('confirm')
        });
      } else {
        Modal.error({
          title: this.props.t('error'),
          content: this.props.t('copyUrlManually'),
          okText: this.props.t('confirm')
        });
      }
    } catch (error) {
        Modal.error({
          title: this.props.t('error'),
          content: this.props.t('copyUrlManually'),
          okText: this.props.t('confirm')
        });
        console.error('Error occurred while copying URL:', error);
    } finally {
      this.setState({ copying: false });
    }
  };

  render() {
    const { t } = this.props;
    const { copying } = this.state;
    const { Title, Paragraph } = Typography;

    return (
      <div className="container browser-not-supported-container">
        <Card className="section browser-not-supported-card">
          <Title level={2} className="antd-title">{t('openInBrowser')}</Title>
          <Paragraph className="browser-not-supported-message">
            {t('browserNotSupportedMessage')}
          </Paragraph>
          <div className="browser-not-supported-button-container">
            <Button
              type="primary"
              icon={<CopyOutlined />}
              loading={copying}
              onClick={this.handleCopyUrl}
              className="browser-not-supported-button"
            >
              {t('copyUrlToClipboard')}
            </Button>
          </div>
          <Paragraph className="browser-not-supported-hint">
            {t('pasteInSystemBrowser')}
          </Paragraph>
        </Card>
      </div>
    );
  }
}

export default withTranslation()(BrowserNotSupportedPage);