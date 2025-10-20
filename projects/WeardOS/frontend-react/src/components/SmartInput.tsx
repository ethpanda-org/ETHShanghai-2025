import React, { useState, useRef } from 'react';
import { Input, Button, Tooltip, Dropdown, MenuProps } from 'antd';
import {
  SendOutlined,
  StopOutlined,
  PaperClipOutlined,
  SmileOutlined,
  AudioOutlined,
  PictureOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import './SmartInput.scss';

const { TextArea } = Input;

interface SmartInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  maxLength?: number;
  showAttachments?: boolean;
  showVoice?: boolean;
  showEmoji?: boolean;
}

const SmartInput: React.FC<SmartInputProps> = ({
  value,
  onChange,
  onSend,
  onStop,
  placeholder = "输入消息...",
  disabled = false,
  loading = false,
  maxLength = 4000,
  showAttachments = true,
  showVoice = true,
  showEmoji = true
}) => {
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey) {
      e.preventDefault();
      if (value.trim() && !loading) {
        onSend();
      }
    }
  };

  // 附件上传菜单
  const attachmentMenuItems: MenuProps['items'] = [
    {
      key: 'image',
      icon: <PictureOutlined />,
      label: '上传图片',
      onClick: () => {
        // 处理图片上传
        console.log('上传图片');
      }
    },
    {
      key: 'file',
      icon: <FileTextOutlined />,
      label: '上传文件',
      onClick: () => {
        // 处理文件上传
        console.log('上传文件');
      }
    }
  ];

  // 计算字符数
  const characterCount = value.length;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isOverLimit = characterCount > maxLength;

  return (
    <div className={`smart-input ${focused ? 'focused' : ''} ${loading ? 'loading' : ''}`}>
      <div className="input-container">
        {/* 左侧工具栏 */}
        <div className="input-toolbar left">
          {showAttachments && (
            <Dropdown
              menu={{ items: attachmentMenuItems }}
              trigger={['click']}
              placement="topLeft"
            >
              <Button
                type="text"
                icon={<PaperClipOutlined />}
                className="toolbar-btn"
                disabled={disabled || loading}
              />
            </Dropdown>
          )}
        </div>

        {/* 输入区域 */}
        <div className="input-wrapper">
          <TextArea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            autoSize={{ minRows: 1, maxRows: 6 }}
            className="message-textarea"
            maxLength={maxLength}
          />
          
          {/* 字符计数 */}
          {(isNearLimit || isOverLimit) && (
            <div className={`character-count ${isOverLimit ? 'over-limit' : ''}`}>
              {characterCount}/{maxLength}
            </div>
          )}
        </div>

        {/* 右侧工具栏 */}
        <div className="input-toolbar right">
          {showEmoji && (
            <Tooltip title="表情">
              <Button
                type="text"
                icon={<SmileOutlined />}
                className="toolbar-btn"
                disabled={disabled || loading}
                onClick={() => {
                  // 处理表情选择
                  console.log('选择表情');
                }}
              />
            </Tooltip>
          )}

          {showVoice && (
            <Tooltip title="语音输入">
              <Button
                type="text"
                icon={<AudioOutlined />}
                className="toolbar-btn"
                disabled={disabled || loading}
                onClick={() => {
                  // 处理语音输入
                  console.log('语音输入');
                }}
              />
            </Tooltip>
          )}

          {/* 发送/停止按钮 */}
          <div className="send-button-wrapper">
            {loading ? (
              <Tooltip title="停止生成">
                <Button
                  type="text"
                  icon={<StopOutlined />}
                  onClick={onStop}
                  className="stop-btn"
                />
              </Tooltip>
            ) : (
              <Tooltip title={value.trim() ? "发送消息 (Enter)" : "请输入消息"}>
                <Button
                  type="text"
                  icon={<SendOutlined />}
                  onClick={onSend}
                  disabled={!value.trim() || disabled || isOverLimit}
                  className="send-btn"
                />
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* 底部提示 */}
      <div className="input-footer">
        <div className="input-hints">
          <span className="hint-text">
            按 Enter 发送，Shift+Enter 换行
          </span>
          {showVoice && (
            <span className="hint-divider">•</span>
          )}
          {showVoice && (
            <span className="hint-text">
              支持语音输入
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartInput;