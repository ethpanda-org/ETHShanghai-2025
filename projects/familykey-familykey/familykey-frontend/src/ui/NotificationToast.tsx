import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { API_BASE_URL } from '../config/api';

interface Notification {
  id: string;
  type: 'HEARTBEAT_REMINDER' | 'CLAIM_ALERT' | 'CHALLENGE_PERIOD_ALERT';
  message: string;
  actionUrl: string;
  priority: 'high' | 'medium' | 'low';
  minutesRemaining?: number;
  moduleAddress: string;
  safeAddress: string;
  createdAt: Date;
}

type PrivyWallet = {
  address?: string;
  walletClientType?: string;
  type?: string;
  connectorType?: string;
};

export function NotificationToast() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { address: eoaAddress } = useAccount();
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();

  // 获取 Privy 嵌入式钱包地址
  const privyAddress = useMemo<string | undefined>(() => {
    if (!authenticated || !wallets || wallets.length === 0) return undefined;
    const embeddedWallet = wallets.find((w: PrivyWallet) => {
      return w?.walletClientType === 'privy' || w?.type === 'privy' || w?.connectorType === 'privy';
    });
    return embeddedWallet?.address;
  }, [authenticated, wallets]);

  // 合并所有需要查询的地址
  const allAddresses = useMemo(() => {
    const addresses: string[] = [];
    if (eoaAddress) addresses.push(eoaAddress);
    if (privyAddress) addresses.push(privyAddress);
    return addresses;
  }, [eoaAddress, privyAddress]);

  // 每5秒轮询
  useEffect(() => {
    if (allAddresses.length === 0) return;

    const pollNotifications = async () => {
      try {
        // 并行请求所有地址的通知
        const responses = await Promise.all(
          allAddresses.map((addr) =>
            fetch(`${API_BASE_URL}api/notifications/pending?address=${addr}`).then((r) => r.json())
          )
        );

        // 合并所有通知，使用 id 去重
        const allNotifications = responses.flatMap((data) => data.notifications || []);
        const uniqueNotifications = Array.from(
          new Map(allNotifications.map((n: Notification) => [n.id, n])).values()
        );

        console.log('[NotificationToast] Fetched notifications for addresses:', allAddresses);
        console.log('[NotificationToast] Unique notifications:', uniqueNotifications);
        setNotifications(uniqueNotifications);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    // 立即执行一次
    pollNotifications();

    // 每5秒轮询
    const interval = setInterval(pollNotifications, 5000);

    return () => clearInterval(interval);
  }, [allAddresses]);

  const handleDismiss = async (notif: Notification) => {
    try {
      await fetch(`${API_BASE_URL}api/notifications/${notif.id}/dismiss`, {
        method: 'POST',
      });

      // 从本地状态移除
      setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  };

  const handleClick = async (notif: Notification) => {
    // 标记为已读并跳转
    await handleDismiss(notif);
    window.location.href = notif.actionUrl;
  };

  console.log('[NotificationToast] Current notifications:', notifications);

  if (notifications.length === 0) return null;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'HEARTBEAT_REMINDER':
        return '⏰';
      case 'CLAIM_ALERT':
        return '🔔';
      case 'CHALLENGE_PERIOD_ALERT':
        return '⚠️';
      default:
        return '🔔';
    }
  };

  return (
    <div className="notification-container">
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`notification-toast priority-${notif.priority}`}
          onClick={() => handleClick(notif)}
        >
          <div className="notification-icon">
            {getNotificationIcon(notif.type)}
          </div>
          <div className="notification-content">
            <p className="notification-message">{notif.message}</p>
          </div>
          <button
            className="notification-close"
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss(notif);
            }}
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
