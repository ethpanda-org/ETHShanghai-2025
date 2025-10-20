import React from 'react';
import { Button, Input, Card, Space, Flex, Typography } from 'antd';
import { withTranslation } from 'react-i18next';
import { loadMnemonic } from '../utils/utils.js';
import '../common.css'; // Import common styles file

const { Title, Paragraph } = Typography;

/**
 * Wallet unlock page component
 */
class UnlockWalletPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      password: '',
      passwordError: '',
      isDecrypting: false
    };
  }

  // Handle password input change
  handlePasswordChange = (e) => {
    this.setState({ password: e.target.value, passwordError: '' });
  };

  // Handle password submission, attempt to decrypt mnemonic
  handlePasswordSubmit = async () => {
    const { password } = this.state;

    if (!password) {
      this.setState({ passwordError: this.props.t('pleaseEnterPassword') });
      return;
    }

    this.setState({ isDecrypting: true, passwordError: '' });

    try {
      // Attempt to load and decrypt mnemonic
      await loadMnemonic(password);

      // Decryption successful, clear password and call callback
      this.setState({ password: '', isDecrypting: false });
    } catch (error) {
      console.error('Failed to decrypt mnemonic:', error);
      this.setState({
        passwordError: this.props.t('passwordError'),
        password: '', // Clear password
        isDecrypting: false
      });
    }
  }

  render() {
    const { t } = this.props;
    const { password, passwordError, isDecrypting } = this.state;

    return (
      <Flex className="container">
        <Card className="section">
          <Space direction="vertical" className="space-section">
            <Title level={2} className="antd-title">{t('unlockWallet')}</Title>
            <Paragraph>{t('passwordRequired')}</Paragraph>

            <Input
              type="password"
              value={password}
              onChange={this.handlePasswordChange}
              placeholder={t('pleaseEnterPassword')}
              onPressEnter={this.handlePasswordSubmit}
              disabled={isDecrypting}
            />

            {passwordError && <Paragraph type="danger" className="error-message">{passwordError}</Paragraph>}

            <Button
              type="primary"
              onClick={this.handlePasswordSubmit}
              loading={isDecrypting}
            >
              {t('unlock')}
            </Button>
          </Space>
        </Card>
      </Flex>
    );
  }
}

export default withTranslation()(UnlockWalletPage);