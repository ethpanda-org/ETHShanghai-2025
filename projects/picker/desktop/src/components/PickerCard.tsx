// 首先导入Tauri的模块
import type { PickerInfo } from '../types/index'
import './PickerCard.css'
import { clientAPI } from '../client/api'
import { taskAPI } from '../client/taskApi'
import { useState, useEffect, useRef } from 'react'
import { extractFileNameAndPath } from '../utils/utils';
import { open } from '@tauri-apps/plugin-dialog';

interface PickerCardProps {
  picker: PickerInfo
  onDeletePicker?: (id: string) => void
  operatingPickerId?: string
}

const PickerCard = ({ picker, onDeletePicker, operatingPickerId }: PickerCardProps) => {
  const [dialogVisible, setDialogVisible] = useState(false)
  // 更新dialogContent状态接口，添加可选按钮相关字段
  const [dialogContent, setDialogContent] = useState({
    title: '',
    message: '',
    buttonText: 'OK',
    onConfirm: () => {},
    showProgress: false,
    progress: 0,
    // 新增可选按钮字段
    optionalButtonText: '',
    onOptionalButtonClick: () => {}
  })
  const [paymentDialogVisible, setPaymentDialogVisible] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false) // 添加处理状态标记，从支付确认后开始，到整个下载流程结束
  const [showMenu, setShowMenu] = useState(false) // 添加菜单显示状态
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false) // 添加删除确认对话框状态
  const [downloadCount, setDownloadCount] = useState(picker.download_count) // 添加下载计数状态
  const paymentMethodResolveRef = useRef<(value: string | null) => void>(() => {})
  const menuRef = useRef<HTMLDivElement>(null) // 添加菜单引用
  const buttonRef = useRef<HTMLButtonElement>(null) // 添加按钮引用
  
  // 创建任务相关状态
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false)
  const [taskName, setTaskName] = useState('')
  const [selectedTaskFile, setSelectedTaskFile] = useState<File | null>(null)
  const [currentDownloadPath, setCurrentDownloadPath] = useState<string>('')
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // 创建任务相关函数 - 移到组件主体中
  const browseFiles = async (defaultPath: string) => {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [
          { name: 'Compressed Files', extensions: ['zip', 'rar', '7z', 'tar', 'gz', 'tar.gz'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        defaultPath: defaultPath || 'C:\\Users\\aiqubit\\Downloads\\'
      });
      
      if (selected) {
        // 将文件路径转换为File对象
        const filePath = Array.isArray(selected) ? selected[0] : selected;
        const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || 'unknown_file';
        
        // 只有当taskName为空时，才自动从文件名提取任务名（去掉扩展名）
        if (!taskName.trim()) {
          const fileName = filePath.split(/[\\/]/).pop() || '';
          const taskNameFromFile = fileName.replace(/\.[^/.]+$/, '');
          setTaskName(taskNameFromFile);
        }
        
        // 创建一个简单的File对象模拟
        const fileObj = new File([''], fileName, { type: 'application/zip' });
        // 设置文件路径作为自定义属性
        Object.defineProperty(fileObj, 'path', { value: filePath });
        setSelectedTaskFile(fileObj);
      }
    } catch (error) {
      console.error('Error browsing files:', error);
      alert('Failed to browse files. Please try again.');
    }
  };
  
  const submitCreateTask = async () => {
    if (!selectedTaskFile) {
      showCustomAlert('Validation Error', 'Please select a compressed file.', 'OK', () => {});
      return;
    }

    try {
      // 设置处理中状态
      setIsProcessing(true);
      setUploadProgress(10);

      // 调用后端创建任务，将选择的文件路径直接传递给后端
      await taskAPI.createTask(taskName, (selectedTaskFile as File & { path: string }).path);

      setUploadProgress(100);
      setTimeout(() => {
        // 关闭模态框
        setShowCreateTaskDialog(false);
        resetTaskForm();

        // 显示成功提示，并在用户点击确认后跳转到Home页面
        showCustomAlert('Success', 'Task created successfully!', 'OK', () => {
          setIsProcessing(false); // 确保在回调中也设置处理完成
          // 刷新页面，由于Home是默认页面，刷新后会自动显示Home页面
          window.location.reload();
        });
        
        // 确保处理完成
        setIsProcessing(false);
      }, 500);
    } catch (error) {
      console.error('Error creating task:', error);
      showCustomAlert('Error', 'Failed to create task. ' + (error instanceof Error ? error.message : 'Please try again.'), 'OK', () => {
        setIsProcessing(false); // 确保在回调中也设置处理完成
      });
      setUploadProgress(0);
      setIsProcessing(false);
    }
  };
  
  const resetTaskForm = () => {
    setShowCreateTaskDialog(false);
    setTaskName('');
    setSelectedTaskFile(null);
    setUploadProgress(0);
  };
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const renderStars = (score: number) => {
    const stars = []
    // 根据score的十位数确定星星数量
    let starCount = 1; // 默认1颗星
    
    if (score >= 10 && score <= 20) {
      starCount = 2;
    } else if (score > 20 && score <= 30) {
      starCount = 3;
    } else if (score > 30 && score <= 40) {
      starCount = 4;
    } else if (score > 40) {
      starCount = 5;
    }

    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= starCount ? 'star filled' : 'star'}>
          ★
        </span>
      )
    }
    return stars
  }

  // 检查登录状态并处理购买流程
  const handlePurchase = async () => {
    try {
      // 检查用户登录状态
      const isLoggedIn = await clientAPI.checkLoginStatus()
      if (!isLoggedIn) {
        showCustomAlert('Login Required', 'Please log in to purchase items.')
        return
      }
      
      // 显示支付方式选择弹窗
      const payType = await showPaymentModal()
      
      if (payType) {
        // 调用创建订单API
        const createOrderResponse = await clientAPI.createOrder(picker.picker_id, payType)
        
        // 显示下载进度对话框，设置初始进度为0
        showCustomAlert('Download Progress', 'Downloading...', 'Cancel', () => {
          // 清理定时器
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
            progressIntervalRef.current = null
          }
          setIsProcessing(false) // 取消时也要重置处理状态
        }, true, 0)
        
        // 模拟下载进度
        let progress = 0
        
        // 清除之前可能存在的定时器
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
        }
        
        progressIntervalRef.current = setInterval(() => {
          progress += 5
          if (progress >= 100) {
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current)
              progressIntervalRef.current = null
            }
            // 调用 Picker 下载接口，获取真实的下载路径
            clientAPI.downloadFile(createOrderResponse.token).then(downloadResult => {
              // 下载完成后更新对话框内容，显示确认按钮和打开目录按钮
              if (downloadResult) {
                const { fileName, path } = extractFileNameAndPath(downloadResult);
            
                // 保存当前下载路径并打开创建任务模态框
                const handleCreateTask = () => {
                  // 保存下载路径
                  if (path) {
                    setCurrentDownloadPath(path);
                  } else {
                    // 默认路径
                    setCurrentDownloadPath('C:\\Users\\aiqubit\\Downloads\\');
                  }
                  // 打开创建任务模态框
                  setShowCreateTaskDialog(true);
                };
            
                // 下载完成后立即设置isProcessing为false，取消全局遮罩层
                setIsProcessing(false);
                // 增加下载计数
                setDownloadCount(prev => prev + 1);
                showCustomAlert('Download Complete', `${createOrderResponse.message} \n File ${fileName} downloaded to:\n${path || 'Local storage'}`, 'OK', () => {
                  // 点击OK后关闭对话框
                }, false, 0, 'Select file Create task', () => {
                  // 调用handleCreateTask并确保对话框关闭
                  handleCreateTask();
                })
              } else {
                // 下载完成后立即设置isProcessing为false，取消全局遮罩层
                setIsProcessing(false);
                // 增加下载计数
                setDownloadCount(prev => prev + 1);
                showCustomAlert('Download Complete', `File downloaded to:\n 'Local storage'}`, 'OK', () => {
                  // 点击OK后关闭对话框
                }, false, 0, 'Select file Create task', () => {
                  // 直接关闭对话框
                })
              }
            }).catch(error => {
              // 显示下载错误信息
              const errorMessage = error instanceof Error ? 
                (error.message || 'Download failed.') : 
                'An unexpected error occurred during download.'
              // 下载错误时立即设置isProcessing为false，取消全局遮罩层
                setIsProcessing(false);
                showCustomAlert('Download Error', errorMessage, 'OK', () => {
                  // 点击OK后关闭对话框
                })
            })
          } else {
            // 更新进度条
            setDialogContent(prev => ({
              ...prev,
              progress
            }))
          }
        }, 200) // 每200ms更新一次进度
      }
    } catch (error) {
      // 显示错误信息
      const errorMessage = error instanceof Error ? 
        (error.message || 'Purchase failed.') : 
        'An unexpected error occurred.'
      showCustomAlert('Error', errorMessage, 'OK', () => {
        setIsProcessing(false)
      })
    }
  }
  
  // 复制文本到剪贴板的函数
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // 可以添加一个短暂的提示，表示已复制
      const originalMessage = dialogContent.message;
      const originalTitle = dialogContent.title;
      
      // 显示复制成功提示
      setDialogContent(prev => ({
        ...prev,
        title: 'Copied!',
        message: 'Path copied to clipboard.'
      }));
      
      // 短暂延迟后恢复原消息
      setTimeout(() => {
        setDialogContent(prev => ({
          ...prev,
          title: originalTitle,
          message: originalMessage
        }));
      }, 1500);
    }).catch(err => {
      console.error('Failed to copy text:', err);
    });
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // 处理菜单选项点击
  const handleMenuOptionClick = (action: 'delete') => {
    setShowMenu(false)
    
    if (action === 'delete') {
      setShowDeleteConfirm(true)
    }
  }

  // 处理删除确认
  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false)
    onDeletePicker?.(picker.picker_id)
  }

  // 处理删除取消
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
  };

  // 更新showCustomAlert函数，添加进度条相关参数
  const showCustomAlert = (
    title: string, 
    message: string, 
    buttonText = 'OK', 
    onConfirm?: () => void, 
    showProgress = false, 
    progress = 0,
    // 新增可选按钮参数
    optionalButtonText = '',
    onOptionalButtonClick?: () => void
  ) => {
    setDialogContent({
      title,
      message,
      buttonText,
      onConfirm: onConfirm || (() => {}),
      showProgress,
      progress,
      optionalButtonText,
      onOptionalButtonClick: onOptionalButtonClick || (() => {})
    })
    setDialogVisible(true)
  }

  // 关闭对话框
  const closeDialog = () => {
    // 只有非处理状态下才允许关闭对话框
    if (!isProcessing || dialogContent.title === 'Download Complete' || dialogContent.title === 'Download Error') {
      setDialogVisible(false)
    }
  }

  // 确认对话框操作
  const confirmDialog = () => {
    dialogContent.onConfirm()
    closeDialog()
  }

  // 支付方式选择弹窗 - 使用自定义对话框实现
  const showPaymentModal = (): Promise<string | null> => {
    return new Promise((resolve) => {
      paymentMethodResolveRef.current = resolve  // 使用ref存储resolve
      setPaymentDialogVisible(true)
    })
  }

  // 选择支付方式
  const selectPaymentMethod = (method: string) => {
    // 选择支付方式后立即设置为处理中状态，开始阻止用户交互
    setIsProcessing(true)
    
    if (typeof paymentMethodResolveRef.current === 'function') {
      paymentMethodResolveRef.current(method)
    }
    setPaymentDialogVisible(false)
  }

  // 取消支付方式选择
  const cancelPaymentMethod = () => {
    if (typeof paymentMethodResolveRef.current === 'function') {
      paymentMethodResolveRef.current(null)
    }
    setPaymentDialogVisible(false)
  }

  return (
    <>
      <div className="picker-card">
        {/* Card Header */}
        <div className="picker-header">
          <div className="picker-category">{picker.version}</div>
          <div className="picker-actions">
            <div style={{ position: 'relative' }}>
              <button 
                className="picker-menu" 
                ref={buttonRef}
                title="More options" 
                onClick={() => setShowMenu(!showMenu)}
                disabled={isProcessing}
              >
                 ⋮
              </button>
              {showMenu && (
                <div 
                  ref={menuRef}
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
                    onClick={() => handleMenuOptionClick('delete')}
                    disabled={!onDeletePicker || operatingPickerId === picker.picker_id}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Picker Info Container with Image */}
        <div className="picker-info-container">
          <div className="picker-info">
            <h3 className="picker-name">{picker.alias}</h3>
            <p className="picker-description">{picker.description}</p>
            <div className="picker-developer">Author ID: {picker.dev_user_id.slice(0,13)}</div>
            <div className="picker-developer">Created Time: {picker.created_at.slice(0,10)}</div>
            <div className="picker-developer">Updated Time: {picker.updated_at.slice(0,10)}</div>
            {/* Installation Info */}
            <div className="picker-downloads">
              <span className="downloads-text">Download Count: {downloadCount}</span>
            </div>
          </div>
          <div className="picker-image-container">
            {picker.image_path && (
              <img 
                src={picker.image_path} 
                alt={picker.alias} 
                className="picker-image" 
              />
            )}
          </div>
        </div>

        {/* Picker Details */}
        <div className="picker-details">
          <div className="picker-price">
            <span className="wallet-badge">Price: {picker.price}</span>
          </div>
          <div className="picker-rating">
            <div className="stars">
              {renderStars(Number(downloadCount))} {/* 暂时使用固定评分 */}
            </div>
            {/* <span className="rating-count">({downloadCount})</span> */}
          </div>
        </div>

        {/* Action Button */}
        <button 
          className={`action-button ${picker.status === 'active' ? 'active' : 'inactive'}`}
          onClick={handlePurchase}
          disabled={picker.status !== 'active' || isProcessing}
        >
          {picker.status === 'active' ? 'For Sale' : 'Discontinued'}
        </button>
      </div>
      
      {/* 全局遮罩层 - 当isProcessing为true时显示，阻止整个页面的交互 */}
      {(isProcessing || showCreateTaskDialog) && (
        <div 
          className="global-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: showCreateTaskDialog ? 'rgba(0, 0, 0, 0.5)' : 'transparent',
            zIndex: 999,
            pointerEvents: 'all',
            cursor: isProcessing ? 'wait' : 'default'
          }}
        />
      )}
      
      {/* 自定义对话框组件，添加进度条显示 */}
      {dialogVisible && (
        <div 
          className="custom-dialog-overlay"
          // 只有在处理完成时才允许点击关闭
          onClick={!isProcessing || dialogContent.title === 'Download Complete' || dialogContent.title === 'Download Error' ? closeDialog : undefined}
          style={{
            cursor: isProcessing && dialogContent.title === 'Download Progress' ? 'wait' : 'pointer'
          }}
        >
          <div className="custom-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="custom-dialog-header">
              <h3 className="custom-dialog-title">{dialogContent.title}</h3>
            </div>
            <div className="custom-dialog-body">
              <p className="custom-dialog-message">
                {dialogContent.title === 'Download Complete' && dialogContent.message.includes('downloaded to:') ? (
                  // 处理下载完成消息，提取路径并添加复制功能
                  dialogContent.message.split('downloaded to:').map((part, index) => {
                    if (index === 0) return part + 'downloaded to:';
                    
                    // 提取并显示可点击的路径
                    const path = part.trim();
                    return (
                      <span key={index}>
                        <br />
                        <span 
                          className="copyable-path"
                          style={{
                            backgroundColor: '#1f2937',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            color: '#3b82f6',
                            textDecoration: 'underline',
                            userSelect: 'text',
                            display: 'inline-block',
                            maxWidth: '100%',
                            overflow: 'auto',
                            whiteSpace: 'pre-wrap'
                          }}
                          onClick={() => copyToClipboard(path)}
                          title="Click to copy path"
                        >
                          {path}
                        </span>
                      </span>
                    );
                  })
                ) : (
                  // 普通消息直接显示
                  dialogContent.message
                )}
              </p>
              
              {/* 下载进度条 */}
              {dialogContent.showProgress && (
                <div className="progress-container">
                  <div 
                    className="progress-bar"
                    style={{ width: `${dialogContent.progress}%` }}
                  ></div>
                  <span className="progress-text">{dialogContent.progress}%</span>
                </div>
              )}
            </div>
            <div className="custom-dialog-footer" style={{
              justifyContent: dialogContent.optionalButtonText ? 'right' : 'center',
              gap: '16px'
            }}>
              {/* 可选按钮 - 仅当有可选按钮文本时显示 */}
              {dialogContent.optionalButtonText && (
                <button 
                  className="custom-dialog-button"
                  onClick={dialogContent.onOptionalButtonClick}
                >
                  {dialogContent.optionalButtonText}
                </button>
              )}
              {/* 主要确认按钮 */}
              <button 
                className="custom-dialog-button"
                onClick={confirmDialog}
              >
                {dialogContent.buttonText}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 支付方式选择对话框 */}
      {paymentDialogVisible && (
        <div className="custom-dialog-overlay" onClick={cancelPaymentMethod}>
          <div className="custom-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="custom-dialog-header">
              <h3 className="custom-dialog-title">Select Payment Method</h3>
            </div>
            <div className="custom-dialog-body">
              <p className="custom-dialog-message">Please choose your preferred payment method</p>
            </div>
            <div className="custom-dialog-footer" style={{ justifyContent: 'center', gap: '16px' }}>
              <button 
                className="custom-dialog-button"
                onClick={() => selectPaymentMethod('wallet')}
                style={{ backgroundColor: '#10b981', minWidth: '100px' }}
              >
                Wallet
              </button>
              <button 
                className="custom-dialog-button"
                onClick={() => selectPaymentMethod('premium')}
                style={{ backgroundColor: '#8b5cf6', minWidth: '100px' }}
              >
                Premium
              </button>
              <button 
                className="custom-dialog-button"
                onClick={cancelPaymentMethod}
                style={{ backgroundColor: '#6b7280', minWidth: '100px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 创建任务模态框 */}
      {showCreateTaskDialog && (
        <div className="modal-overlay" onClick={resetTaskForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Task</h2>
              <button className="modal-close" onClick={resetTaskForm}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="task-name">Task Name</label>
                <input
                  type="text"
                  id="task-name"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="Enter task name"
                />
              </div>
              <div className="form-group">
                <label>Select Compressed File</label>
                <button
                  className="modal-button secondary file-select-btn"
                  onClick={() => browseFiles(currentDownloadPath)}
                  style={{ marginBottom: '10px' }}
                >
                  Browse Files
                </button>
                {selectedTaskFile && (
                  <div className="selected-file-path">
                    Selected: {selectedTaskFile.name}
                  </div>
                )}
              </div>
              {uploadProgress > 0 && (
                <div className="progress-container">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <span className="progress-text">{uploadProgress}%</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="modal-button secondary"
                onClick={resetTaskForm}
              >
                Cancel
              </button>
              <button
                className="modal-button primary"
                onClick={submitCreateTask}
                disabled={uploadProgress > 0 && uploadProgress < 100}
              >
                {uploadProgress > 0 && uploadProgress < 100 ? 'Processing...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div 
          className="custom-dialog-overlay"
          onClick={handleDeleteCancel}
        >
          <div 
            className="custom-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="custom-dialog-header">
              <h3 className="custom-dialog-title">Confirm Delete</h3>
            </div>
            <div className="custom-dialog-body">
              <p className="custom-dialog-message">
                Are you sure you want to delete picker "{picker.alias}"?
                <br /><br />
                This action cannot be undone.
              </p>
            </div>
            <div className="custom-dialog-footer" style={{ gap: '12px' }}>
              <button 
                className="custom-dialog-button"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                onClick={handleDeleteCancel}
              >
                Cancel
              </button>
              <button 
                className="custom-dialog-button"
                style={{ backgroundColor: 'var(--error)' }}
                onClick={handleDeleteConfirm}
                disabled={!onDeletePicker || operatingPickerId === picker.picker_id || isProcessing}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default PickerCard
