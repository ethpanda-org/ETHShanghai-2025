import React, { useState, useEffect, useRef, useCallback } from 'react'
import './MainContent.css'
import TaskCard from './TaskCard'
import { taskAPI, type TaskConfig } from '../client/taskApi'
import { open } from '@tauri-apps/plugin-dialog'
// import { deleteAllChatSessions } from '../client/chatBotApi'

interface MainContentProps {
  activeTab?: string;
}

const MainContent: React.FC<MainContentProps> = ({ activeTab }) => {
  const [tasks, setTasks] = useState<TaskConfig[]>([])
  const [activeFilter, setActiveFilter] = useState<'All' | 'Running' | 'Idle' | 'Error'>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [operatingTaskId, setOperatingTaskId] = useState<string | null>(null)

  // 创建任务模态框状态
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [selectedFilePath, setSelectedFilePath] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // 添加处理中状态 - 与PickerCard.tsx保持一致
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 自定义对话框状态 - 与PickerCard.tsx保持一致
  const [dialogVisible, setDialogVisible] = useState(false)
  const [dialogContent, setDialogContent] = useState({
    title: '',
    message: '',
    buttonText: 'OK',
    onConfirm: () => {},
    showProgress: false,
    progress: 0,
    optionalButtonText: '',
    onOptionalButtonClick: () => {}
  })

  // 简化的状态管理
  const fetchTimeoutRef = useRef<number | null>(null);

  // 简化的获取任务列表函数
  const fetchTasks = useCallback(async (force: boolean = false) => {
    // 简单的重复请求保护
    if (!force && isLoading) {
      return;
    }

    setIsLoading(true);
    try {
      const taskList = await taskAPI.listTasks();
      setTasks(taskList);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      if (force) {
        showCustomAlert('Error', 'Failed to load tasks. ' + (error instanceof Error ? error.message : 'Please try again.'), 'OK', () => {});
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // 自定义对话框函数 - 与PickerCard.tsx保持一致
  const showCustomAlert = (
    title: string, 
    message: string, 
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
    setDialogVisible(false)
  }

  // 确认对话框操作
  const confirmDialog = () => {
    dialogContent.onConfirm()
    closeDialog()
  }

  // 可选按钮点击处理
  const handleOptionalButtonClick = () => {
    dialogContent.onOptionalButtonClick()
    closeDialog()
  }

  // 状态监听器
  const statusListenerRef = useRef<((tasks: TaskConfig[]) => void) | null>(null);

  // 初始化和清理
  useEffect(() => {
    // 创建状态监听器
    statusListenerRef.current = (updatedTasks: TaskConfig[]) => {
      setTasks(updatedTasks);
      setOperatingTaskId(null); // 清除操作状态
    };

    // 注册监听器并初始加载 - 只在activeTab为'home'时执行一次
    const initializeComponent = async () => {
      try {
        await taskAPI.addStatusListener(statusListenerRef.current!);
      } catch (error) {
        console.error('Failed to initialize component:', error);
      }
    };

    // 每次进入Home界面时都执行初始化
    if (activeTab === 'home') {
      initializeComponent();
    }

    // 清理函数
    return () => {
      if (statusListenerRef.current) {
        taskAPI.removeStatusListener(statusListenerRef.current);
      }
      if (fetchTimeoutRef.current) {
        window.clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [activeTab]); // 依赖activeTab而不是fetchTasks


  // 任务状态轮询 - 仅在当前界面是Home时启动
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (activeTab === 'home') {
      // 设置定时轮询，每10秒获取一次任务状态
      intervalId = setInterval(() => {
        fetchTasks();
      }, 3000); // 3秒轮询一次
    }

    // 清理函数，在组件卸载或activeTab改变时清除定时器
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [activeTab, fetchTasks]);

  // 任务操作处理函数（增强版）
  const handleRunTask = async (taskId: string) => {
    if (operatingTaskId) return; // 防止重复操作

    setOperatingTaskId(taskId);
    try {
      await taskAPI.runTask(taskId);
      // 调用轮询机制
      try {
        await taskAPI.addStatusListener(statusListenerRef.current!);
      } catch (error) {
        console.error('Failed to initialize component:', error);
      }
    } catch (error) {
      console.error('Failed to run task:', error);
      showCustomAlert('Error', 'Failed to run task. ' + (error instanceof Error ? error.message : 'Please try again.'), 'OK', () => {});
      setOperatingTaskId(null);
    }
  }

  // 删除任务处理函数
  const handleDeleteTask = async (taskId: string) => {
    setOperatingTaskId(taskId);
    try {
      await taskAPI.deleteTask(taskId);

      // 删除成功后刷新任务列表
      await fetchTasks(true);

      // // mcp 工具列表变更，删除所有的聊天会话
      // await deleteAllChatSessions();

      // // 先创建一个新会话，再清空 Chatbot 前端会话列表
      // try {
      //   console.log('Clearing chatbot frontend session data...');
      //   // 清空Chatbot相关的localStorage项
      //   localStorage.removeItem('chatbot_active_session');
      //   localStorage.removeItem('chatbot_sessions');
      //   localStorage.removeItem('chatbot_session_messages');
      //   console.log('Chatbot frontend session data cleared');
      // } catch (error) {
      //   console.error('Failed to clear chatbot frontend session data:', error);
      // }

      // // 从Chatbot前端创建一个新会话，放在会话列表中
    } catch (error) {
      console.error('Failed to delete task:', error);
      showCustomAlert('Error', 'Failed to delete task. ' + (error instanceof Error ? error.message : 'Please try again.'), 'OK', () => {});
    } finally {
      setOperatingTaskId(null);
    }
  };

  const handleStopTask = async (taskId: string) => {
    if (operatingTaskId) return; // 防止重复操作

    setOperatingTaskId(taskId);
    try {
      await taskAPI.stopTask(taskId);
      // 操作状态会在收到状态更新时自动清除，不需要手动设置超时清除
    } catch (error) {
      console.error('Failed to stop task:', error);
      showCustomAlert('Error', 'Failed to stop task. ' + (error instanceof Error ? error.message : 'Please try again.'), 'OK', () => {});
      setOperatingTaskId(null);
    }
  };

  // 过滤和排序任务
  const filteredTasks = tasks
    .filter(task => {
      const matchesFilter = activeFilter === 'All' || task.status === activeFilter
      const matchesSearch = task.name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesFilter && matchesSearch
    })
    .sort((a, b) => {
      // 按安装日期排序，最新安装的排在前面
      const installedA = a.installed || '0'
      const installedB = b.installed || '0'
      return installedB.localeCompare(installedA) // 降序排列，最新的在前
    })

  // 打开创建任务模态框
  const handleOpenCreateTaskModal = () => {
    setTaskName('');
    setSelectedFilePath('');
    setUploadProgress(0);
    setShowCreateTaskModal(true);
  };

  // 选择压缩文件
  const handleSelectFile = async () => {
    try {
      const fileDialogResult = await open({
        title: 'Select a Compressed File',
        multiple: false,
        directory: false,
        filters: [
          { name: 'Compressed Files', extensions: ['zip'] },
          // { name: 'All Files', extensions: ['*'] }
        ]
      });

      if (fileDialogResult) {
        const filePath = Array.isArray(fileDialogResult) ? fileDialogResult[0] : fileDialogResult;
        setSelectedFilePath(filePath);
        // 只有当taskName为空时，才自动从文件名提取任务名（去掉扩展名）
        if (!taskName.trim()) {
          const fileName = filePath.split(/[\\/]/).pop() || '';
          const taskNameFromFile = fileName.replace(/\.[^/.]+$/, '');
          setTaskName(taskNameFromFile);
        }
      }
    } catch (error) {
      console.error('Error selecting file:', error);
      showCustomAlert('Error', 'Failed to select file. Please try again.', 'OK', () => {});
    }
  };

  // 创建新任务
  const handleCreateTask = async () => {
    if (!taskName.trim()) {
      showCustomAlert('Validation Error', 'Task name cannot be empty', 'OK', () => {});
      return;
    }

    if (!selectedFilePath) {
      showCustomAlert('Validation Error', 'Please select a file', 'OK', () => {});
      return;
    }

    try {
      // 设置处理中状态
      setIsProcessing(true);
      setUploadProgress(10);
      
      // 创建任务并获取返回的任务信息
      await taskAPI.createTask(taskName, selectedFilePath);
 
      setUploadProgress(100);
      setTimeout(() => {
        setShowCreateTaskModal(false);
        setUploadProgress(0);
        setTaskName('');
        setSelectedFilePath('');
        
        // 显示成功提示 - 使用showCustomAlert
        showCustomAlert('Success', 'Task created successfully!', 'OK', () => {
          setIsProcessing(false); // 确保在回调中也设置处理完成
          // window.location.reload();
        });
        
        // 确保处理完成
        setIsProcessing(false);
      }, 500);

      // 删除成功后刷新任务列表
      const taskList = await taskAPI.listTasks();
      setTasks(taskList);

      // // 清空 Chatbot 前端会话列表
      // try {
      //   console.log('Clearing chatbot session data...');
      //   // 清空Chatbot相关的localStorage项
      //   localStorage.removeItem('chatbot_active_session');
      //   localStorage.removeItem('chatbot_sessions');
      //   localStorage.removeItem('chatbot_session_messages');
        
      //   // mcp 工具列表变更，删除所有的聊天会话
      //   await deleteAllChatSessions();
      // } catch (error) {
      //   console.error('Failed to clear chatbot session data:', error);
      // }            
    } catch (error) {
      console.error('Error creating task:', error);
      showCustomAlert('Error', 'Failed to create task. ' + (error instanceof Error ? error.message : 'Please try again.'), 'OK', () => {
        setIsProcessing(false); // 确保在回调中也设置处理完成
      });
      setUploadProgress(0);
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* 全局遮罩层 - 当isProcessing为true时显示，阻止整个页面的交互 */}
      {isProcessing && (
        <div 
          className="global-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'transparent',
            zIndex: 999,
            pointerEvents: 'all',
            cursor: 'wait'
          }}
        />
      )}
      
      {/* 自定义对话框 - 与PickerCard.tsx保持一致 */}
      {dialogVisible && (
        <div 
          className="custom-dialog-overlay"
          // 只有在处理完成时才允许点击关闭
          onClick={!isProcessing || dialogContent.title === 'Success' ? closeDialog : undefined}
          style={{
            cursor: isProcessing ? 'wait' : 'pointer'
          }}
        >
          <div className="custom-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="custom-dialog-header">
              <h3 className="custom-dialog-title">{dialogContent.title}</h3>
            </div>
            <div className="custom-dialog-body">
              <p className="custom-dialog-message">{dialogContent.message}</p>
              {dialogContent.showProgress && (
                <div className="progress-container">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${dialogContent.progress}%` }}
                    />
                  </div>
                  <span className="progress-text">{dialogContent.progress}%</span>
                </div>
              )}
            </div>
            <div className="custom-dialog-footer">
              {dialogContent.optionalButtonText && (
                <button 
                  className="custom-dialog-button secondary"
                  onClick={handleOptionalButtonClick}
                >
                  {dialogContent.optionalButtonText}
                </button>
              )}
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
      
      <div className="main-content-wrapper">
        <div className="content-header">
          <div className="header-controls">
            <div className="filter-tabs">
              {(['All', 'Running', 'Idle', 'Error'] as const).map(filter => (
                <button
                  key={filter}
                  className={`filter-tab ${activeFilter === filter ? 'active' : ''}`}
                  onClick={() => setActiveFilter(filter)}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
            <div className="search-container">
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
            <button
              className="refresh-button"
              onClick={() => fetchTasks(true)}
              disabled={isLoading}
              title="Refresh tasks"
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              {isLoading ? '⟳' : '↻'}
            </button>
          </div>
        </div>

        <div className="task-grid">
          {filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onRunTask={handleRunTask}
              onStopTask={handleStopTask}
              onDeleteTask={handleDeleteTask}
              operatingTaskId={operatingTaskId || undefined}
            />
          ))}
        </div>

        <button
          className="add-button"
          onClick={handleOpenCreateTaskModal}
        >
          <span className="add-icon">+</span>
        </button>

        {/* Create Task Modal */}
        {showCreateTaskModal && (
          <div className="modal-overlay" onClick={() => setShowCreateTaskModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Create New Task</h2>
                <button className="modal-close" onClick={() => setShowCreateTaskModal(false)}>×</button>
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
                    onClick={handleSelectFile}
                    style={{ marginBottom: '10px' }}
                  >
                    Browse Files
                  </button>
                  {selectedFilePath && (
                    <div className="selected-file-path">
                      Selected: {selectedFilePath.split(/[\\/]/).pop()}
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
                  onClick={() => setShowCreateTaskModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="modal-button primary"
                  onClick={handleCreateTask}
                  disabled={uploadProgress > 0 && uploadProgress < 100}
                >
                  {uploadProgress > 0 && uploadProgress < 100 ? 'Processing...' : 'Create Task'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default MainContent