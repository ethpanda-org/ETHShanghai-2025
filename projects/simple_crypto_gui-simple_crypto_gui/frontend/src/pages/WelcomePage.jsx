import { Radio, Input, Button, message, Flex, Space, Card, Select, Typography } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import React from 'react';
import '../common.css'; // Import common styles file
import './css/WelcomePage.css'; // Import page-specific styles file
import { handleWalletOperation } from '../utils/WelcomePageUtils.js';
import { withTranslation } from 'react-i18next';
import { ALL_LANGUAGES } from '../i18n/config.js';
const { Title } = Typography;

class WelcomePage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedOption: 'create', // Default to creating new wallet
      mnemonic: '',
      error: '',
      passwordOption: 'withPassword', // Password option: withPassword or withoutPassword
      password: '', // Password
      confirmPassword: '', // Confirm password
      passwordVisible: false // Password visibility flag
    };
  }

  handleOptionChange = (e) => {
    this.setState({ selectedOption: e.target.value });
  };

  // Switch language
  handleLanguageChange = (language) => {
    this.props.i18n.changeLanguage(language);
  }

  handleMnemonicChange = (e) => {
    this.setState({ mnemonic: e.target.value });
  };

  handleNext = async () => {
    const { selectedOption, mnemonic, passwordOption, password, confirmPassword } = this.state;
    this.setState({ error: '' });

    try {
      // Validate password input
      if (passwordOption === 'withPassword') {
        if (!password || password.length < 8) {
          throw new Error(this.props.t('passwordMinLength'));
        }
        if (password !== confirmPassword) {
          throw new Error(this.props.t('passwordsNotMatch'));
        }
      }

      // Handle creating or importing wallet
      const newMnemonic = await handleWalletOperation(selectedOption, mnemonic, passwordOption === 'withPassword' ? password : '');

      if (this.props.navigate) {
        this.props.navigate('/wallet');
      }
    } catch (error) {
      console.error('Failed to process wallet operation:', error);
      this.setState({
        error: error.message
      });
    }
  };

  handlePasswordChange = (e) => {
    this.setState({ password: e.target.value });
  };

  handleConfirmPasswordChange = (e) => {
    this.setState({ confirmPassword: e.target.value });
  };

  togglePasswordVisibility = () => {
    this.setState(prevState => ({ passwordVisible: !prevState.passwordVisible }));
  };

  handlePasswordOptionChange = (e) => {
    this.setState({ passwordOption: e.target.value, password: '', confirmPassword: '' });
  };



  render() {
    const { selectedOption, mnemonic, error, passwordOption, password, confirmPassword, passwordVisible } = this.state;
    const { i18n } = this.props;

    return (
      <Flex className="container">
        <Title level={2} className="antd-title">{this.props.t('welcomeToWallet')}</Title>

        <Card className="section">
          <Space direction="vertical" className="space-section">
            <Flex style={{ justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <h3>{this.props.t('pleaseSelectOperation')}</h3>
              <Select
                value={i18n.language}
                onChange={this.handleLanguageChange}
                style={{ width: 120 }}
                options={ALL_LANGUAGES}
                allowClear={false}
              />
            </Flex>

            <Radio.Group
              value={selectedOption}
              onChange={this.handleOptionChange}
            >
              <Radio value="create" className="radio-label">{this.props.t('createNewWallet')}</Radio>
              <Radio value="import" className="radio-label">{this.props.t('importExistingWallet')}</Radio>
            </Radio.Group>

            {selectedOption === 'import' && (
              <Space direction="vertical" className="space-section">
                <Input.TextArea
                  value={mnemonic}
                  onChange={this.handleMnemonicChange}
                  placeholder={this.props.t('enterMnemonicWithSpaces')}
                  rows={4}
                  className="textarea"
                />
              </Space>
            )}

            <Space direction="vertical" className="space-section">
              <h3>{this.props.t('passwordOptions')}</h3>

              <Radio.Group
                value={passwordOption}
                onChange={this.handlePasswordOptionChange}
              >
                <Radio value="withPassword" className="radio-label">{this.props.t('encryptMnemonicWithPassword')}</Radio>
                <Radio value="withoutPassword" className="radio-label">{this.props.t('doNotUsePassword')}</Radio>
              </Radio.Group>

              {passwordOption === 'withPassword' ? (
                <Space direction="vertical" className="space-section">
                  <p className="security-tip">{this.props.t('encryptionAdvice')}</p>
                  <Input
                    type={passwordVisible ? 'text' : 'password'}
                    value={password}
                    onChange={this.handlePasswordChange}
                    placeholder={this.props.t('setPasswordAtLeast8Chars')}
                    style={{ height: 32 }}
                    suffix={
                      <Button
                        type="text"
                        onClick={this.togglePasswordVisibility}
                        icon={passwordVisible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '0px',
                          cursor: 'pointer',
                          color: 'rgba(0, 0, 0, 0.45)'
                        }}
                      />
                    }
                  />
                  <Input
                      type="password"
                      value={confirmPassword}
                      onChange={this.handleConfirmPasswordChange}
                      placeholder={this.props.t('confirmPassword')}
                      style={{ height: 32 }}
                    />
                </Space>
              ) : (
                <Space direction="vertical" className="space-section">
                  <p className="warning-tip">{this.props.t('noPasswordWarning')}</p>
                </Space>
              )}
            </Space>

            {error && <p className="error-message">{error}</p>}

            <Button
              onClick={this.handleNext}
              type="primary"
              // className="button"
            >
              {this.props.t('nextStep')}
            </Button>
          </Space>
        </Card>
      </Flex>
    );
  }
}

export default withTranslation()(WelcomePage);
