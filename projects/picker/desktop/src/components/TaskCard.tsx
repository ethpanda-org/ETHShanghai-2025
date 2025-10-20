import { useState, useRef, useEffect } from 'react'
import { type TaskConfig } from '../client/taskApi'

interface TaskCardProps {
  task: TaskConfig
  onRunTask?: (id: string) => void
  onStopTask?: (id: string) => void
  onEditEnv?: (id: string) => void
  onDeleteTask?: (id: string) => void
  operatingTaskId?: string
}

const TaskCard = ({ task, onRunTask, onStopTask, onEditEnv, onDeleteTask, operatingTaskId }: TaskCardProps) => {
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

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

  // 获取状态颜色（修复大小写匹配问题）
  const getStatusColor = (status?: string): string => {
    if (!status) return '#6b7280';
    switch (status.toLowerCase()) {
      case 'running': return '#10b981'
      case 'idle': return '#3b82f6'
      case 'error': return '#ef4444'
      default: return '#6b7280'
    }
  }

  // 处理菜单选项点击
  const handleMenuOptionClick = (action: 'edit' | 'delete') => {
    setShowMenu(false)
    
    if (action === 'edit') {
      onEditEnv?.(task.id)
    } else if (action === 'delete') {
      setShowDeleteConfirm(true)
    }
  }

  // 处理删除确认
  const handleDeleteConfirm = () => {
    setShowDeleteConfirm(false)
    onDeleteTask?.(task.id)
  }

  // 处理删除取消
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
  }

  return (
      <>
        <div className="task-card" data-status={task.status}>
      <div className="task-header">
        <h3 className="task-name">{task.name}</h3>
        <div style={{ position: 'relative' }}>
          <button 
            className="task-menu"
            ref={buttonRef}
            onClick={() => setShowMenu(!showMenu)}
            title="More options"
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
              {/* 暂不实现 Edit ENV 功能 */}
              {/* <button
                style={{
                  width: '100%',
                  textAlign: 'left' as const,
                  padding: '8px 16px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease',
                }}
                onClick={() => handleMenuOptionClick('edit')}
                disabled={!onEditEnv || operatingTaskId === task.id}
              >
                Edit ENV
              </button> */}
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
                disabled={!onDeleteTask || operatingTaskId === task.id}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="task-info">
        <div className="info-row">
          <span className="info-icon">🪪</span>
          <span className="info-label">TaskID:</span>
          <span className="info-value">{task.id || 'N/A'}</span>
        </div>
        <div className="info-row">
          <span className="info-icon">📅</span>
          <span className="info-label">Installed:</span>
          <span className="info-value">{task.installed || 'N/A'}</span>
        </div>
        <div className="info-row">
          <span className="info-icon">▶️</span>
          <span className="info-label">Runs:</span>
          <span className="info-value">{task.runs || 0}</span>
        </div>
      </div>

      <div className="task-status">
        <div className="status-indicator">
          <span
            className="status-dot"
            style={{ color: getStatusColor(task.status) }}
          >
            ●
          </span>
          <span className="status-text" style={{ color: getStatusColor(task.status) }}>
            {task.status ? task.status.charAt(0).toUpperCase() + task.status.slice(1) : 'N/A'}
          </span>
        </div>
        <div className="last-run">
          <span className="last-run-icon">🕒</span>
          <span className="last-run-label">Last:</span>
          <span className="last-run-value">{task.last_run || 'Never'}</span>
        </div>
      </div>

      {/* 任务操作按钮 */}
      <div className="task-actions">
        {task.status === 'Running' ? (
          <button
            className="action-button stop-button"
            onClick={() => onStopTask?.(task.id)}
            disabled={operatingTaskId === task.id}
          >
            {operatingTaskId === task.id ? 'Stopping...' : 'Stop'}
          </button>
        ) : (
          <button
            className="action-button run-button"
            onClick={() => onRunTask?.(task.id)}
            disabled={operatingTaskId === task.id}
          >
            {operatingTaskId === task.id ? 'Starting...' : 'Run'}
          </button>
        )}
      </div>
    </div>

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
                Are you sure you want to delete task "{task.name}"?
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
                disabled={operatingTaskId === task.id}
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

export default TaskCard