import React, { useState } from 'react';
import { 
  Button, 
  List, 
  Typography, 
  Dropdown, 
  Space, 
  Modal, 
  Input,
  Tooltip,
  Badge
} from 'antd';
import { useTranslation } from 'react-i18next';
import {
  PlusOutlined,
  MessageOutlined,
  MoreOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import './ChatSidebar.scss';

const { Text, Title } = Typography;
const { confirm } = Modal;

interface ChatConversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messages: any[];
}

interface ChatSidebarProps {
  conversations: ChatConversation[];
  currentConversationId: string | null;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  collapsed: boolean;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations,
  currentConversationId,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  collapsed
}) => {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // 格式化时间显示
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) { // 1分钟内
      return t('chat.timeGroups.justNow', '刚刚');
    } else if (diff < 3600000) { // 1小时内
      return `${Math.floor(diff / 60000)}${t('chat.timeGroups.minutesAgo', '分钟前')}`;
    } else if (diff < 86400000) { // 1天内
      return `${Math.floor(diff / 3600000)}${t('chat.timeGroups.hoursAgo', '小时前')}`;
    } else if (diff < 604800000) { // 1周内
      return `${Math.floor(diff / 86400000)}${t('chat.timeGroups.daysAgo', '天前')}`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // 开始编辑标题
  const startEdit = (conversation: ChatConversation) => {
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };

  // 保存编辑
  const saveEdit = () => {
    // 这里应该调用更新对话标题的方法
    // 暂时只是取消编辑状态
    setEditingId(null);
    setEditTitle('');
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  // 删除对话确认
  const handleDelete = (conversation: ChatConversation) => {
    confirm({
      title: t('chat.delete'),
      icon: <ExclamationCircleOutlined />,
      content: t('chat.deleteConfirm').replace('{title}', conversation.title),
      okText: t('chat.delete'),
      okType: 'danger',
      cancelText: t('common.cancel', '取消'),
      onOk() {
        onDeleteConversation(conversation.id);
      },
    });
  };

  // 对话操作菜单
  const getConversationMenu = (conversation: ChatConversation): MenuProps => ({
    items: [
      {
        key: 'edit',
        label: t('chat.rename'),
        icon: <EditOutlined />,
        onClick: () => startEdit(conversation)
      },
      {
        key: 'delete',
        label: t('chat.delete'),
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => handleDelete(conversation)
      }
    ]
  });

  // 按时间分组对话
  const groupedConversations = React.useMemo(() => {
    const groups: { [key: string]: ChatConversation[] } = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const thisWeek = new Date(today.getTime() - 6 * 86400000);

    conversations.forEach(conv => {
      const convDate = new Date(conv.timestamp);
      if (convDate >= today) {
        groups.today.push(conv);
      } else if (convDate >= yesterday) {
        groups.yesterday.push(conv);
      } else if (convDate >= thisWeek) {
        groups.thisWeek.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  }, [conversations]);

  // 渲染对话组
  const renderConversationGroup = (title: string, conversations: ChatConversation[]) => {
    if (conversations.length === 0) return null;

    return (
      <div key={title} className="conversation-group">
        {!collapsed && (
          <div className="group-title">
            <Text type="secondary" className="group-label">
              {title}
            </Text>
          </div>
        )}
        <List
          className="conversation-list"
          dataSource={conversations}
          renderItem={(conversation) => (
            <List.Item
              className={`conversation-item ${
                conversation.id === currentConversationId ? 'active' : ''
              }`}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <div className="conversation-content">
                <div className="conversation-header">
                  <div className="conversation-icon">
                    <MessageOutlined />
                  </div>
                  
                  {!collapsed && (
                    <div className="conversation-info">
                      {editingId === conversation.id ? (
                        <Input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onPressEnter={saveEdit}
                          onBlur={cancelEdit}
                          className="edit-input"
                          autoFocus
                        />
                      ) : (
                        <div className="conversation-title">
                          <Text ellipsis={{ tooltip: conversation.title }}>
                            {conversation.title}
                          </Text>
                        </div>
                      )}
                      
                      {conversation.lastMessage && (
                        <div className="conversation-preview">
                          <Text type="secondary" ellipsis>
                            {conversation.lastMessage}
                          </Text>
                        </div>
                      )}
                      
                      <div className="conversation-meta">
                        <Text type="secondary" className="conversation-time">
                          {formatTime(conversation.timestamp)}
                        </Text>
                        {conversation.messages.length > 0 && (
                          <Badge 
                            count={conversation.messages.length} 
                            size="small"
                            className="message-count"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {!collapsed && (
                  <div className="conversation-actions">
                    <Dropdown 
                      menu={getConversationMenu(conversation)} 
                      trigger={['click']}
                      placement="bottomRight"
                    >
                      <Button 
                        type="text" 
                        size="small" 
                        icon={<MoreOutlined />}
                        className="action-button"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Dropdown>
                  </div>
                )}
              </div>
            </List.Item>
          )}
        />
      </div>
    );
  };

  return (
    <div className="chat-sidebar-content">
      {/* 头部 */}
      <div className="sidebar-header">
        {!collapsed && (
          <Title level={4} className="sidebar-title">
            {t('chat.title')}
          </Title>
        )}
        
        <Tooltip title={t('chat.newChat')} placement="right">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onNewConversation}
            className="new-chat-button"
            size={collapsed ? 'small' : 'middle'}
          >
            {!collapsed && t('chat.newChat')}
          </Button>
        </Tooltip>
      </div>

      {/* 对话列表 */}
      <div className="sidebar-content">
        {!collapsed && conversations.length === 0 ? (
          <div className="empty-state">
            <MessageOutlined className="empty-icon" />
            <Text type="secondary">{t('chat.emptyState.noConversations')}</Text>
            <Text type="secondary" className="empty-tip">
              {t('chat.emptyState.noConversationsTip')}
            </Text>
          </div>
        ) : (
          <div className="conversations-container">
            {renderConversationGroup(t('chat.timeGroups.today'), groupedConversations.today)}
            {renderConversationGroup(t('chat.timeGroups.yesterday'), groupedConversations.yesterday)}
            {renderConversationGroup(t('chat.timeGroups.thisWeek'), groupedConversations.thisWeek)}
            {renderConversationGroup(t('chat.timeGroups.older'), groupedConversations.older)}
          </div>
        )}
      </div>

      {/* 底部信息 */}
      {!collapsed && (
        <div className="sidebar-footer">
          <div className="connection-status">
            <Space>
              <div className="status-indicator online" />
              <Text type="secondary" className="status-text">
                {t('chat.connectionStatus.online')}
              </Text>
            </Space>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSidebar;
