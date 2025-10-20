import './ProfileContent.css'
import type { Activity, InstalledTool, UserInfo, SystemInfo } from '../types'
import { useState, useEffect, useRef } from 'react';
import { clientAPI } from '../client/api'
import {
  isPickerOperator, queryPickerByWallet, registerPicker,
  removePicker, grantOperatorRole, revokeOperatorRole
} from '../client/pickerPaymentContract'
import { QRCodeSVG } from 'qrcode.react';
import { openUrl } from '@tauri-apps/plugin-opener';

// 定义用户数据接口
interface UserProfile {
  chain_name: string,
  chain_url: string,
  explorer_url: string,
  premium_free: number,
  premium_payment_rate: number,
  premium_toUsd: number,
  premium_period: number,
  premium_start: boolean,
  wallet_balance: number,
  premium_balance: number,
  name: string;
  role: string;
  bio: string;
  location: string;
  email: string;
  member_since: string;
  position: string;
  wallet_address: string;
  skills: string[];
}

interface ProfileContentProps {
  activeTab?: string;
}

const ProfileContent = ({ activeTab }: ProfileContentProps) => {
  // 使用useRef保存最新的userData值
  const userDataRef = useRef<UserProfile>(null);

  // 模拟用户数据
  const [userData, setUserData] = useState<UserProfile>({
    chain_name: '',
    chain_url: '',
    explorer_url: '',
    premium_free: 0,
    premium_payment_rate: 0,
    premium_toUsd: 0,
    premium_period: 0,
    premium_start: false,
    wallet_balance: 0,
    premium_balance: 0,
    name: 'Deporter',
    role: 'User',
    bio: 'Full-stack developer with expertise in AI Agent, Web3, Cloud architecture and Web Development',
    location: 'China, ShangHai',
    email: 'OpenPickLabs@hotmail.com',
    member_since: '2025.10',
    position: 'Senior Developer',
    wallet_address: '0x83498FCa79e0bc0548B4FC0744f467208c54132B',
    skills: ['Rust', 'C/Cpp', 'Go', 'Python', 'Java', 'JavaScript', 'React', 'Node.js', 'AI', 'Web3', 'Cloud Architecture', 'DevOps']
  });

  // 对话框状态
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogContent, setDialogContent] = useState<{
    title: string;
    message: React.ReactNode;
    buttonText: string;
    onConfirm: () => void;
    showProgress: boolean;
    progress: number;
    optionalButtonText: string;
    onOptionalButtonClick: () => void;
  }>({
    title: '',
    message: '',
    buttonText: 'OK',
    onConfirm: () => { },
    showProgress: false,
    progress: 0,
    optionalButtonText: '',
    onOptionalButtonClick: () => { }
  });

  // 智能合约权限管理状态
  // const [contractAction, setContractAction] = useState<'isPickerOperator' | 'queryPickerByWallet' | 'registerPicker' | 'removePicker' | 'grantOperatorRole' | 'revokeOperatorRole' | ''>('');
  const [operatorAddress, setOperatorAddress] = useState('');
  const [grantOperatorAddress, setGrantOperatorAddress] = useState('');
  const [revokeOperatorAddress, setRevokeOperatorAddress] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  // const [pickerId, setPickerId] = useState('');
  const [registerPickerId, setRegisterPickerId] = useState('');
  const [removePickerId, setRemovePickerId] = useState('');
  const [devUserId, setDevUserId] = useState('');
  const [devWalletAddress, setDevWalletAddress] = useState('');

  // 菜单状态管理
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);

  // 复制文本到剪贴板的函数
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // 显示复制成功提示
      showCustomAlert('Copied!', 'Address copied to clipboard.', 'OK', () => {
        // 点击OK后关闭对话框
      });
    }).catch(err => {
      console.error('Failed to copy text:', err);
    });
  };

  // 显示自定义对话框
  const showCustomAlert = (
    title: string,
    message: React.ReactNode,
    buttonText = 'OK',
    onConfirm?: () => void,
    showProgress = false,
    progress = 0,
    optionalButtonText = '',
    onOptionalButtonClick?: () => void
  ) => {
    setDialogContent({
      title,
      message,
      buttonText,
      onConfirm: onConfirm || (() => { }),
      showProgress,
      progress,
      optionalButtonText,
      onOptionalButtonClick: onOptionalButtonClick || (() => { })
    });
    setDialogVisible(true);
  };

  // 关闭对话框
  const closeDialog = () => {
    setDialogVisible(false);
  };

  // 确认对话框操作
  const confirmDialog = () => {
    dialogContent.onConfirm();
    closeDialog();
  };

  // 编辑状态
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<UserProfile>({ ...userData });

  // 钱包操作状态
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletAction, setWalletAction] = useState<'send' | 'receive' | 'success' | ''>('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferAddress, setTransferAddress] = useState('');

  // 同步userData和userDataRef
  useEffect(() => {
    userDataRef.current = userData;
  }, [userData]);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node) &&
        accountButtonRef.current && !accountButtonRef.current.contains(event.target as Node)) {
        setShowAccountMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUserData = async () => {
    try {
      // 调用Tauri后端的get_current_user_info命令
      const responseUserInfo: UserInfo = await clientAPI.getUserLastestInfo();
      const responseSystemInfo: SystemInfo = await clientAPI.getSystemInfo();
      const address = responseUserInfo.wallet_address || '';
      const chain_url = responseSystemInfo.chain_url || '';
      console.log('fetchUserData chain_url:', chain_url);
      console.log('fetchUserData address:', address);
      const wallet_balance = await clientAPI.getWalletBalance(address, chain_url);

      if (responseUserInfo) {
        // 更新用户数据，将后端数据覆盖到模拟数据上
        setUserData(prev => ({
          ...prev,
          chain_name: responseSystemInfo.chain_name || prev.chain_name,
          chain_url: responseSystemInfo.chain_url || prev.chain_url,
          explorer_url: responseSystemInfo.explorer_url || prev.explorer_url,
          premium_free: responseSystemInfo.premium_free || prev.premium_free,
          premium_payment_rate: responseSystemInfo.premium_payment_rate || prev.premium_payment_rate,
          premium_toUsd: responseSystemInfo.premium_to_usd || prev.premium_toUsd,
          premium_period: responseSystemInfo.premium_period || prev.premium_period,
          premium_start: responseSystemInfo.premium_start || prev.premium_start,
          wallet_balance: wallet_balance || prev.wallet_balance,
          premium_balance: responseUserInfo.premium_balance || prev.premium_balance,
          name: responseUserInfo.user_name || prev.name,
          email: responseUserInfo.email || prev.email,
          role: responseUserInfo.user_type == 'gen' ? 'User' : 'Developer',
          member_since: responseUserInfo.created_at ? new Date(responseUserInfo.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit' }) : prev.member_since,
          wallet_address: responseUserInfo.wallet_address || prev.wallet_address,
        }));
        setEditData(prev => ({
          ...prev,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      // 继续使用模拟数据
    }
  };

  const fetchWalletBalance = async () => {
    try {
      // 使用userDataRef获取最新的userData值
      const address = userDataRef.current?.wallet_address || '';
      const chain_url = userDataRef.current?.chain_url || '';
      let wallet_balance = await clientAPI.getWalletBalance(address, chain_url);
      if (wallet_balance) {
        wallet_balance = wallet_balance + 1;
        setUserData(prev => ({
          ...prev,
          wallet_balance: wallet_balance,
          // 显式保留关键字段，确保不会丢失
          wallet_address: prev.wallet_address,
          chain_url: prev.chain_url
        }));
      }
    } catch (error) {
      console.error('Failed to fetch wallet balance:', error);
    }
  }

  // 添加登录状态状态
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 从后端获取用户信息
  useEffect(() => {
    const init = async () => {
      // 检查登录状态再执行
      const loggedIn = await clientAPI.checkLoginStatus();
      setIsLoggedIn(loggedIn);
      if (loggedIn) {
        fetchUserData();
      } else {
        showCustomAlert('Error', 'Please log in first', 'OK', () => {
          // 点击OK后关闭对话框
        });
      }
    }
    init();
  }, []);

  // 钱包余额轮询 - 仅在用户登录时启动
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isLoggedIn) {
      // 设置定时轮询，每10秒获取一次用户数据
      intervalId = setInterval(() => {
        fetchWalletBalance();
      }, 10000); // 10秒轮询一次
    }

    // 清理函数，在组件卸载时清除定时器
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isLoggedIn]);

  // 监听界面切换，当切换到Profile界面时刷新用户数据
  useEffect(() => {
    if (activeTab === 'profile') {
      fetchUserData();
    }
  }, [activeTab]);

  // 模拟最近活动数据
  const [recentActivities,] = useState<Activity[]>([
    {
      id: '1',
      type: 'installation',
      title: 'Installed Server Monitoring',
      description: 'Tool Server Monitoring',
      timestamp: '2024-05-01 01:32 AM'
    },
    {
      id: '2',
      type: 'purchase',
      title: 'Purchased Premium Plan',
      description: 'Subscription',
      timestamp: '2024-04-28 2:45 PM'
    },
    {
      id: '3',
      type: 'usage',
      title: 'Used API Integration Helper',
      description: 'Tool',
      timestamp: '2024-04-27 11:20 AM'
    },
    {
      id: '4',
      type: 'contribution',
      title: 'Submitted feedback for Data Processing Tool',
      description: 'Community',
      timestamp: '2024-04-25 4:12 PM'
    }
  ]);

  // 模拟已安装工具数据
  const [installedTools,] = useState<InstalledTool[]>([
    {
      id: '1',
      name: 'Server Monitoring',
      type: 'performance',
      installedDate: '2024-04-01'
    },
    {
      id: '2',
      name: 'Backup System Plugin',
      type: 'security',
      installedDate: '2024-04-22'
    }
  ]);

  // 处理设置按钮点击，进入编辑模式
  const handleSettingsClick = () => {
    setEditData({ ...userData });
    setIsEditing(true);
  };

  // 处理输入变化
  const handleInputChange = (field: keyof UserProfile, value: string | string[]) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 处理技能标签变化
  const handleSkillsChange = (skill: string, checked: boolean) => {
    if (checked) {
      setEditData(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
    } else {
      setEditData(prev => ({
        ...prev,
        skills: prev.skills.filter(s => s !== skill)
      }));
    }
  };

  // 添加新技能
  const handleAddSkill = (skill: string) => {
    if (skill && !editData.skills.includes(skill)) {
      setEditData(prev => ({
        ...prev,
        skills: [...prev.skills, skill]
      }));
    }
  };

  // 保存编辑
  const handleSaveEdit = () => {
    setUserData(editData);
    setIsEditing(false);
    // 这里可以添加保存到后端的逻辑
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({ ...userData });
  };

  // 钱包余额点击处理
  const handleWalletBalanceClick = () => {
    setIsWalletModalOpen(true);
    setWalletAction('');
    setTransferAmount('');
    setTransferAddress('');
  };

  // 关闭钱包模态框
  const handleCloseWalletModal = () => {
    setIsWalletModalOpen(false);
    setWalletAction('');
    setTransferAmount('');
    setTransferAddress('');
  };

  // 处理转账
  const handleTransferFunds = async () => {
    try {
      // 调用转账API
      const response = await clientAPI.transferTo(transferAddress, transferAmount);

      if (response.success) {
        // 转账成功，可以在这里更新用户余额或显示成功消息
        const formattedMessage = (
          <div style={{ textAlign: 'left', wordBreak: 'break-all' }}>
            <p style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>Transaction Hash URL:</p>
            <a
              href={response.tx_hash_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                margin: 0,
                color: '#3b82f6',
                cursor: 'pointer',
                padding: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '4px',
                transition: 'background-color 0.2s',
                textDecoration: 'none',
                wordBreak: 'break-all'
              }}
              onClick={async (e) => {
                // 确保点击事件正常工作
                e.preventDefault();
                await openUrl(response.tx_hash_url)
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
              }}
            >
              {response.tx_hash_url}
            </a>
          </div>
        );

        showCustomAlert('Transfer Success', formattedMessage, 'OK', async () => {
          handleCloseWalletModal();
        });
      } else {
        // 显示默认错误信息，避免类型错误
        showCustomAlert('Transfer Failed', 'Please try again', 'OK', () => { });
      }
    } catch (error) {
      console.error('Transfer Failed:', error);
      // 提取更详细的错误信息
      const errorMessage = error instanceof Error ? error.message : 'Transfer process failed, please try again';
      showCustomAlert('Error', errorMessage, 'OK', () => { });
    }
  };

  // 获取最大可转账余额
  const handleGetMaxTransferableBalance = async () => {
    try {
      const address = userDataRef.current?.wallet_address || '';
      const chain_url = userDataRef.current?.chain_url || '';

      if (!address || !chain_url) {
        showCustomAlert('Error', 'Wallet address or chain URL is missing', 'OK', () => { });
        return;
      }

      const maxBalance = await clientAPI.getMaxTransferableBalance(address, chain_url);
      // 将gwei转换为eth单位
      const maxBalanceInEth = maxBalance / 1e9;
      // 自动填入Amount输入框
      setTransferAmount(maxBalanceInEth.toString());
      showCustomAlert('Max Transferable Balance', `You can transfer up to ${maxBalanceInEth} ETH`, 'OK', () => { });
    } catch (error) {
      console.error('Failed to get max transferable balance:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get max transferable balance, please try again';
      showCustomAlert('Error', errorMessage, 'OK', () => { });
    }
  };

  // 获取活动类型对应的图标
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'installation': return '🖥️'
      case 'purchase': return '💰'
      case 'usage': return '🔧'
      case 'contribution': return '📝'
      default: return '•'
    }
  };

  // 获取工具类型对应的图标
  const getToolTypeIcon = (type: string) => {
    switch (type) {
      case 'performance': return '⚡'
      case 'security': return '🛡️'
      default: return '🔧'
    }
  };

  // 智能合约权限管理函数
  const handleIsPickerOperator = async () => {
    if (!operatorAddress) {
      showCustomAlert('Error', 'Please enter an operator address', 'OK', () => { });
      return;
    }

    try {
      console.log('Frontend UI: Calling isPickerOperator with address:', operatorAddress);
      const response = await isPickerOperator(operatorAddress);
      console.log('Frontend UI: Received response from isPickerOperator:', response);
      showCustomAlert(
        'Is Picker Operator',
        `Address ${operatorAddress} is ${response.is_operator ? '' : 'not '}an operator`,
        'OK',
        () => { }
      );
    } catch (error) {
      console.error('Failed to check if address is operator:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to check if address is operator';
      showCustomAlert('Error', errorMessage, 'OK', () => { });
    }
  };

  const handleQueryPickerByWallet = async () => {
    if (!walletAddress) {
      showCustomAlert('Error', 'Please enter a wallet address', 'OK', () => { });
      return;
    }

    try {
      const response = await queryPickerByWallet(walletAddress);
      const message = response.picker_id
        ? `Picker ID: ${response.picker_id}, Dev User ID: ${response.dev_user_id}`
        : 'No picker found for this wallet address';
      showCustomAlert('Query Picker By Wallet', message, 'OK', () => { });
    } catch (error) {
      console.error('Failed to query picker by wallet:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to query picker by wallet';
      showCustomAlert('Error', errorMessage, 'OK', () => { });
    }
  };

  const handleRegisterPicker = async () => {
    if (!registerPickerId || !devUserId || !devWalletAddress) {
      showCustomAlert('Error', 'Please fill in all required fields', 'OK', () => { });
      return;
    }

    try {
      const response = await registerPicker(registerPickerId, devUserId, devWalletAddress);
      if (response.success) {
        const explorer_url = userDataRef.current?.explorer_url || '';
        const tx_hash_url = `${explorer_url}/tx/${response.tx_hash}`;

        const formattedMessage = (
          <div style={{ textAlign: 'left', wordBreak: 'break-all' }}>
            <p style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>Transaction Hash URL:</p>
            <a
              href={tx_hash_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                margin: 0,
                color: '#3b82f6',
                cursor: 'pointer',
                padding: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '4px',
                transition: 'background-color 0.2s',
                textDecoration: 'none',
                wordBreak: 'break-all'
              }}
              onClick={async (e) => {
                e.preventDefault();
                await openUrl(tx_hash_url)
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
              }}
            >
              {tx_hash_url}
            </a>
          </div>
        );

        showCustomAlert(
          'Register Picker Success',
          formattedMessage,
          'OK',
          () => { }
        );
      } else {
        showCustomAlert('Register Picker Failed', 'Failed to register picker', 'OK', () => { });
      }
    } catch (error) {
      console.error('Failed to register picker:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to register picker';
      showCustomAlert('Error', errorMessage, 'OK', () => { });
    }
  };

  const handleRemovePicker = async () => {
    if (!removePickerId) {
      showCustomAlert('Error', 'Please enter a picker ID', 'OK', () => { });
      return;
    }

    try {
      const response = await removePicker(removePickerId);
      if (response.success) {
        const explorer_url = userDataRef.current?.explorer_url || '';
        const tx_hash_url = `${explorer_url}/tx/${response.tx_hash}`;

        const formattedMessage = (
          <div style={{ textAlign: 'left', wordBreak: 'break-all' }}>
            <p style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>Transaction Hash URL:</p>
            <a
              href={tx_hash_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                margin: 0,
                color: '#3b82f6',
                cursor: 'pointer',
                padding: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '4px',
                transition: 'background-color 0.2s',
                textDecoration: 'none',
                wordBreak: 'break-all'
              }}
              onClick={async (e) => {
                e.preventDefault();
                await openUrl(tx_hash_url)
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
              }}
            >
              {tx_hash_url}
            </a>
          </div>
        );

        showCustomAlert(
          'Remove Picker Success',
          formattedMessage,
          'OK',
          () => { }
        );
      } else {
        showCustomAlert('Remove Picker Failed', 'Failed to remove picker', 'OK', () => { });
      }
    } catch (error) {
      console.error('Failed to remove picker:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove picker';
      showCustomAlert('Error', errorMessage, 'OK', () => { });
    }
  };

  const handleGrantOperatorRole = async () => {
    if (!grantOperatorAddress) {
      showCustomAlert('Error', 'Please enter an operator address', 'OK', () => { });
      return;
    }

    try {
      const response = await grantOperatorRole(grantOperatorAddress);
      if (response.success) {
        const explorer_url = userDataRef.current?.explorer_url || '';
        const tx_hash_url = `${explorer_url}/tx/${response.tx_hash}`;

        const formattedMessage = (
          <div style={{ textAlign: 'left', wordBreak: 'break-all' }}>
            <p style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>Transaction Hash URL:</p>
            <a
              href={tx_hash_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                margin: 0,
                color: '#3b82f6',
                cursor: 'pointer',
                padding: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '4px',
                transition: 'background-color 0.2s',
                textDecoration: 'none',
                wordBreak: 'break-all'
              }}
              onClick={async (e) => {
                e.preventDefault();
                await openUrl(tx_hash_url)
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
              }}
            >
              {tx_hash_url}
            </a>
          </div>
        );

        showCustomAlert(
          'Grant Operator Role Success',
          formattedMessage,
          'OK',
          () => { }
        );
      } else {
        showCustomAlert('Grant Operator Role Failed', 'Failed to grant operator role', 'OK', () => { });
      }
    } catch (error) {
      console.error('Failed to grant operator role:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to grant operator role';
      showCustomAlert('Error', errorMessage, 'OK', () => { });
    }
  };

  const handleRevokeOperatorRole = async () => {
    if (!revokeOperatorAddress) {
      showCustomAlert('Error', 'Please enter an operator address', 'OK', () => { });
      return;
    }

    try {
      const response = await revokeOperatorRole(revokeOperatorAddress);
      if (response.success) {
        const explorer_url = userDataRef.current?.explorer_url || '';
        const tx_hash_url = `${explorer_url}/tx/${response.tx_hash}`;

        const formattedMessage = (
          <div style={{ textAlign: 'left', wordBreak: 'break-all' }}>
            <p style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)' }}>Transaction Hash URL:</p>
            <a
              href={tx_hash_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                margin: 0,
                color: '#3b82f6',
                cursor: 'pointer',
                padding: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '4px',
                transition: 'background-color 0.2s',
                textDecoration: 'none',
                wordBreak: 'break-all'
              }}
              onClick={async (e) => {
                e.preventDefault();
                await openUrl(tx_hash_url)
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
              }}
            >
              {tx_hash_url}
            </a>
          </div>
        );

        showCustomAlert(
          'Revoke Operator Role Success',
          formattedMessage,
          'OK',
          () => { }
        );
      } else {
        showCustomAlert('Revoke Operator Role Failed', 'Failed to revoke operator role', 'OK', () => { });
      }
    } catch (error) {
      console.error('Failed to revoke operator role:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to revoke operator role';
      showCustomAlert('Error', errorMessage, 'OK', () => { });
    }
  };

  return (
    <div className="profile-content">
      {/* 个人信息卡片 */}
      <div className="profile-card">
        <div className="profile-avatar">{userData.name.slice(0, 1)}</div>
        <h2 className="profile-name">{userData.name}</h2>
        <span className="profile-role">{userData.role}</span>
        <p className="profile-bio">{userData.bio}</p>

        <div className="personal-info">
          <div className="info-item">
            <span className="info-icon">📍</span>
            <span className="info-text">{userData.location}</span>
          </div>
          <div className="info-item">
            <span className="info-icon">✉️</span>
            <span className="info-text">{userData.email}</span>
          </div>
          <div className="info-item">
            <span className="info-icon">📅</span>
            <span className="info-text">Member since {userData.member_since}</span>
          </div>
          <div className="info-item">
            <span className="info-icon">💼</span>
            <span className="info-text">{userData.position}</span>
          </div>
          <div className="info-item">
            <span className="info-icon">🏢</span>
            <span className="info-text">{userData.wallet_address}</span>
          </div>
        </div>

        <div className="skills-section">
          <h3 className="section-subtitle">Expertise & Skills</h3>
          <div className="skills-tags">
            {userData.skills.map((skill, index) => (
              <span key={index} className="skill-tag">{skill}</span>
            ))}
          </div>
        </div>

        <div className="profile-actions">
          <button className="generate-profile-btn">
            <span className="btn-icon">✏️</span>
            Generate Profile For My Friends
          </button>
          <button className="settings-btn" onClick={handleSettingsClick}>⚙️</button>
        </div>
      </div>

      {/* 右侧内容区域 */}
      <div className="profile-right">
        {/* 账户管理 */}
        <div className="account-manager">
          {!isLoggedIn && (
            <div
              className="account-manager-overlay"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'transparent',
                zIndex: 999,
                pointerEvents: 'all',
                cursor: 'not-allowed'
              }}
            />
          )}
          <div className="section-header">
            <h3 className="section-title">Account Management</h3>
            <div style={{ position: 'relative' }}>
              <button
                className="section-menu"
                ref={accountButtonRef}
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                title="More options"
              >
                ⋮
              </button>
              {showAccountMenu && (
                <div
                  ref={accountMenuRef}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: '4px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px var(--shadow)',
                    zIndex: 1000,
                    minWidth: '140px',
                    padding: '4px 0',
                  }}
                >
                  <button
                    style={{
                      width: '100%',
                      textAlign: 'left' as const,
                      padding: '8px 16px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#ef4444',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                    }}
                    onClick={() => {
                      setShowAccountMenu(false);
                      // 显示替换私钥对话框
                      showCustomAlert(
                        'Remove Private Key For Use New PK',
                        'Please enter your new private key:',
                        'Confirm',
                        async () => {
                          // 获取用户输入的新私钥
                          const newPrivateKey = (document.getElementById('new-private-key') as HTMLInputElement)?.value;
                          // 校验私钥格式
                          if (!/^[a-fA-F0-9]{64}$/.test(newPrivateKey)) {
                            // 先关闭当前对话框，再显示错误消息
                            closeDialog();
                            setTimeout(() => {
                              showCustomAlert('Invalid Private Key', 'Please enter a valid private key with 64 hexadecimal characters.', 'OK', () => { });
                            }, 100);
                            return;
                          }

                          if (newPrivateKey) {
                            try {
                              const response = await clientAPI.replacePrivateKey({
                                oldWalletAddress: userDataRef.current?.wallet_address || '',
                                newPrivateKey: newPrivateKey
                              });
                              // 显示成功消息
                              showCustomAlert('Success', response.message, 'OK', () => { });
                              // 刷新用户数据
                              fetchUserData();
                            } catch (error) {
                              // 显示错误消息
                              showCustomAlert('Error', `Failed to replace private key: ${error instanceof Error ? error.message : 'Unknown error'}`, 'OK', () => { });
                            }
                          }
                        },
                        false,
                        0,
                        'Cancel',
                        () => { }
                      );
                      // 添加输入框到对话框
                      setTimeout(() => {
                        const dialogBody = document.querySelector('.custom-dialog-body');
                        if (dialogBody) {
                          const input = document.createElement('input');
                          input.type = 'password';
                          input.id = 'new-private-key';
                          input.placeholder = 'Enter new private key';
                          input.style.width = '100%';
                          input.style.padding = '10px';
                          input.style.marginTop = '10px';
                          input.style.backgroundColor = 'var(--bg-tertiary)';
                          input.style.border = '1px solid var(--border)';
                          input.style.borderRadius = '6px';
                          input.style.color = 'var(--text-primary)';
                          dialogBody.appendChild(input);
                        }
                      }, 0);
                    }}
                  >
                    Remove PK
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="manage-wallet">
            <div className="wallet-item" onClick={handleWalletBalanceClick} title="Transferable funds">
              <span className="wallet-label">Wallet Balance</span>
              <span className="wallet-value">{userDataRef.current?.wallet_balance ? (Math.round(userDataRef.current?.wallet_balance / 1e1) / 1e8) + ' ' + userDataRef.current?.chain_name.toUpperCase() : '0 ' + userDataRef.current?.chain_name.toUpperCase()}</span>
            </div>
            <div className="wallet-item">
              <span className="wallet-label">Premium Credits</span>
              <span className="wallet-value">{userData.premium_balance}</span>
            </div>
          </div>

          {/* 新增智能合约权限管理功能，仅 Dev 用户可见 */}
          {/* 实现六个按钮分别对应调用六个API, isPickerOperator, queryPickerByWallet, registerPicker,
          removePicker, grantOperatorRole, revokeOperatorRole */}
          {userData.role === 'Developer' && (
            <div className="profile-section">
              <h3>Smart Contract Permissions</h3>
              <div className="contract-actions">
                {/* isPickerOperator */}
                <div className="contract-action-group">
                  <input
                    type="text"
                    placeholder="Operator Address"
                    value={operatorAddress}
                    onChange={(e) => setOperatorAddress(e.target.value)}
                    className="contract-input"
                  />
                  <button className="settings-btn" onClick={handleIsPickerOperator}>
                    <span className="btn-text">Check Operator</span>
                  </button>
                </div>

                {/* queryPickerByWallet */}
                <div className="contract-action-group">
                  <input
                    type="text"
                    placeholder="Wallet Address"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    className="contract-input"
                  />
                  <button className="settings-btn" onClick={handleQueryPickerByWallet}>
                    <span className="btn-text">Query Picker</span>
                  </button>
                </div>

                {/* registerPicker */}
                <div className="contract-action-group">
                  <input
                    type="text"
                    placeholder="Picker ID"
                    value={registerPickerId}
                    onChange={(e) => setRegisterPickerId(e.target.value)}
                    className="contract-input"
                  />
                  <input
                    type="text"
                    placeholder="Dev User ID"
                    value={devUserId}
                    onChange={(e) => setDevUserId(e.target.value)}
                    className="contract-input"
                  />
                  <input
                    type="text"
                    placeholder="Dev Wallet Address"
                    value={devWalletAddress}
                    onChange={(e) => setDevWalletAddress(e.target.value)}
                    className="contract-input"
                  />
                  <button className="settings-btn" onClick={handleRegisterPicker}>
                    <span className="btn-text">Register Picker</span>
                  </button>
                </div>

                {/* removePicker */}
                <div className="contract-action-group">
                  <input
                    type="text"
                    placeholder="Picker ID"
                    value={removePickerId}
                    onChange={(e) => setRemovePickerId(e.target.value)}
                    className="contract-input"
                  />
                  <button className="settings-btn" onClick={handleRemovePicker}>
                    <span className="btn-text">Remove Picker</span>
                  </button>
                </div>

                {/* grantOperatorRole */}
                <div className="contract-action-group">
                  <input
                    type="text"
                    placeholder="Operator Address"
                    value={grantOperatorAddress}
                    onChange={(e) => setGrantOperatorAddress(e.target.value)}
                    className="contract-input"
                  />
                  <button className="settings-btn" onClick={handleGrantOperatorRole}>
                    <span className="btn-text">Grant Operator</span>
                  </button>
                </div>

                {/* revokeOperatorRole */}
                <div className="contract-action-group">
                  <input
                    type="text"
                    placeholder="Operator Address"
                    value={revokeOperatorAddress}
                    onChange={(e) => setRevokeOperatorAddress(e.target.value)}
                    className="contract-input"
                  />
                  <button className="settings-btn" onClick={handleRevokeOperatorRole}>
                    <span className="btn-text">Revoke Operator</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 最近活动 */}
        <div className="recent-activity">
          <div className="section-header">
            <h3 className="section-title">Recent Activity</h3>
            <button className="section-menu">⋮</button>
          </div>
          <div className="activity-list">
            {recentActivities.map(activity => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="activity-content">
                  <div className="activity-title">{activity.title}</div>
                  <div className="activity-description">{activity.description}</div>
                </div>
                <div className="activity-time">{activity.timestamp}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 已安装工具 */}
        <div className="installed-tools">
          <div className="section-header">
            <h3 className="section-title">Purchased Pickers</h3>
            <button className="section-menu">⋮</button>
          </div>
          <div className="tools-list">
            {installedTools.map(tool => (
              <div key={tool.id} className="tool-item">
                <div className="tool-icon">{getToolTypeIcon(tool.type)}</div>
                <div className="tool-info">
                  <div className="tool-name">{tool.name}</div>
                  <div className="tool-date">Installed on {tool.installedDate}</div>
                </div>
                <button className="tool-remove">🗑️</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 编辑用户信息的模态框 */}
      {isEditing && (
        <div className="modal-overlay" onClick={handleCancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Settings</h2>
              <button className="close-btn" onClick={handleCancelEdit}>×</button>
            </div>
            <div className="modal-body">

              <div className="form-group">
                <label>Bio</label>
                <textarea
                  value={editData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  rows={4}
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={editData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Position</label>
                <input
                  type="text"
                  value={editData.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Expertise</label>
                <div className="skills-editor">
                  <div className="existing-skills">
                    {editData.skills.map((skill, index) => (
                      <div key={index} className="skill-edit-tag">
                        <span>{skill}</span>
                        <button
                          className="remove-skill-btn"
                          onClick={() => handleSkillsChange(skill, false)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="add-skill">
                    <input
                      type="text"
                      placeholder="Add new skill"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddSkill(e.currentTarget.value);
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={handleCancelEdit}>Cancel</button>
              <button className="save-btn" onClick={handleSaveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* 钱包操作模态框 - 使用custom-dialog样式 */}
      {isWalletModalOpen && (
        <div className="custom-dialog-overlay" onClick={handleCloseWalletModal}>
          <div className="custom-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="custom-dialog-header">
              <h3 className="custom-dialog-title" style={{ fontSize: '18px', fontWeight: '600', marginBottom: '10px' }}>{walletAction === 'send' ? 'Send Funds' : walletAction === 'receive' ? 'Receive Funds' : walletAction === 'success' ? '成功' : 'Wallet Actions'}</h3>
              {walletAction !== '' && (
                <button className="close-btn" onClick={handleCloseWalletModal} style={{ float: 'right', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '20px', cursor: 'pointer' }}>×</button>
              )}
            </div>
            {walletAction === '' && (
              <div className="custom-dialog-body">
                <div className="custom-dialog-message">
                  Please choose your wallet action
                </div>
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center' }}>
                  <button className="custom-dialog-button" onClick={() => setWalletAction('send')} style={{ backgroundColor: 'var(--success)', minWidth: '120px', fontSize: '14px', fontWeight: '500' }}>
                    Send
                  </button>
                  <button className="custom-dialog-button" onClick={() => setWalletAction('receive')} style={{ backgroundColor: 'var(--accent-primary)', minWidth: '120px', fontSize: '14px', fontWeight: '500' }}>
                    Receive
                  </button>
                  <button className="custom-dialog-button" onClick={handleCloseWalletModal} style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', minWidth: '120px', fontSize: '14px', fontWeight: '500' }}>
                    Close
                  </button>
                </div>
              </div>
            )}
            {walletAction === 'send' && (
              <div className="custom-dialog-body">
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>Amount</label>
                  <input
                    type="number"
                    placeholder={`Enter amount in ${userData.chain_name.toUpperCase()}`}
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    step="0.01"
                    min="0"
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)' }}>Recipient Address</label>
                  <input
                    type="text"
                    placeholder="Enter recipient wallet address"
                    value={transferAddress}
                    onChange={(e) => setTransferAddress(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <button
                  className="custom-dialog-button"
                  onClick={handleGetMaxTransferableBalance}
                  style={{
                    marginTop: '10px',
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    width: '100%'
                  }}
                >
                  Get Max Transferable Balance
                </button>
              </div>
            )}
            {walletAction === 'receive' && (
              <div className="custom-dialog-body">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                  <div className="qr-code-container">
                    {/* 使用QRCodeSVG组件生成真实的二维码，并在中心插入logo */}
                    <QRCodeSVG
                      value={userData.wallet_address}
                      size={200}
                      fgColor="#000000"
                      bgColor="#ffffff"
                      level="H"
                      includeMargin={true}
                      imageSettings={{
                        src: '/picker_white.jpg',
                        height: 45,
                        width: 45,
                        excavate: true
                      }}
                    />
                  </div>
                  <div style={{ width: '100%' }}>
                    <div style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      padding: '10px',
                      borderRadius: '6px',
                      marginBottom: '10px',
                      wordBreak: 'break-all',
                      color: 'var(--text-primary)'
                    }}>
                      {userData.wallet_address}
                    </div>
                    <button
                      className="custom-dialog-button"
                      onClick={() => copyToClipboard(userData.wallet_address)}
                      style={{ width: '100%', backgroundColor: 'var(--accent-primary)', color: 'white', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
                    >
                      复制地址
                    </button>
                  </div>
                </div>
              </div>
            )}
            {walletAction === 'success' && (
              <div className="custom-dialog-body">
                <div className="custom-dialog-message">
                  地址已复制到剪贴板
                </div>
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', alignItems: 'center' }}>
                  <button className="custom-dialog-button" onClick={handleCloseWalletModal} style={{ backgroundColor: 'var(--accent-primary)', minWidth: '120px', fontSize: '14px', fontWeight: '500' }}>
                    确定
                  </button>
                </div>
              </div>
            )}
            <div className="custom-dialog-footer" style={{ gap: '16px' }}>
              {walletAction !== '' && (
                <>
                  <button className="custom-dialog-button" onClick={() => setWalletAction('')} style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', minWidth: '100px' }}>
                    Back
                  </button>
                  {walletAction === 'send' && (
                    <button
                      className="custom-dialog-button"
                      onClick={handleTransferFunds}
                      disabled={!transferAmount || !transferAddress}
                      style={{ opacity: (!transferAmount || !transferAddress) ? 0.6 : 1, minWidth: '100px' }}
                    >
                      Confirm Send
                    </button>
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* 自定义对话框组件 */}
      {dialogVisible && (
        <div
          className="custom-dialog-overlay"
          onClick={closeDialog}
        >
          <div className="custom-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="custom-dialog-header">
              <h3 className="custom-dialog-title" style={{ fontSize: '18px', fontWeight: '600' }}>{dialogContent.title}</h3>
            </div>
            <div className="custom-dialog-body">
              <div className="custom-dialog-message">
                {dialogContent.message}
              </div>
            </div>
            <div className="custom-dialog-footer" style={{
              justifyContent: dialogContent.optionalButtonText ? 'right' : 'center',
              gap: '16px'
            }}>
              {/* 可选按钮 - 仅当有可选按钮文本时显示 */}
              {dialogContent.optionalButtonText && (
                <button
                  className="custom-dialog-button"
                  onClick={() => {
                    dialogContent.onOptionalButtonClick();
                    closeDialog();
                  }}
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', minWidth: '120px', fontSize: '14px', fontWeight: '500' }}
                >
                  {dialogContent.optionalButtonText}
                </button>
              )}
              {/* 主要确认按钮 */}
              <button
                className="custom-dialog-button"
                onClick={confirmDialog}
                style={{ backgroundColor: 'var(--accent-primary)', minWidth: '120px', fontSize: '14px', fontWeight: '500' }}
              >
                {dialogContent.buttonText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileContent;