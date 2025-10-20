import { useState, useRef, useEffect } from 'react'
import PickerCard from './PickerCard'
import type { PickerInfo, Category } from '../types'
import { clientAPI } from '../client/api'
import './MarketplaceContent.css'

interface MarketplaceContentProps {
  activeTab?: string;
}

const MarketplaceContent = ({ activeTab }: MarketplaceContentProps) => {
  const [activeCategory, setActiveCategory] = useState<Category>('All')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [pickers, setPickers] = useState<PickerInfo[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  
  // 发布相关状态
  const [showUploadDialog, setShowUploadDialog] = useState<boolean>(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [pickerAlias, setPickerAlias] = useState<string>('')
  const [pickerDescription, setPickerDescription] = useState<string>('')
  const [pickerVersion, setPickerVersion] = useState<string>('1.0.0')
  const [pickerPrice, setPickerPrice] = useState<number>(1)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  
  // 自定义对话框状态
  const [dialogVisible, setDialogVisible] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [operatingPickerId, setOperatingPickerId] = useState<string | null>(null)
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
  
  // 使用useRef管理定时器，避免内存泄漏
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // 关闭对话框
  const closeDialog = () => {
    setDialogVisible(false)
  }
  
  // 确认对话框
  const confirmDialog = () => {
    dialogContent.onConfirm()
    setDialogVisible(false)
  }
  
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

  // 从API获取产品数据
  const fetchPickers = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const pickerListResponse = await clientAPI.getPickerMarketplace()
      // const pickersTotal = pickerListResponse.total
      const pickersData = pickerListResponse.pickers

      if (Array.isArray(pickersData)) {
        setPickers(pickersData as PickerInfo[])
      } else {
        setError('Invalid picker data received. Please try again later.')
      }
    } catch (err) {
      console.error('Failed to fetch pickers:', err)
      setError('Failed to load pickers. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  };

  useEffect(() => {
    fetchPickers()
  }, [])

  // 监听界面切换，当切换到marketplace时重新获取数据
  useEffect(() => {
    if (activeTab === 'marketplace') {
      fetchPickers()
    }
  }, [activeTab])

  const categories: Category[] = ['All', 'Popular', 'New']

  // 搜索过滤查找包含关键词的pickers
  const filteredPickers = pickers.filter(picker => {
    const matchesSearch = picker.alias.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         picker.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // 分开实现，先根据下载次数排序
  const sortedPickersByDownloadCount = [...filteredPickers].sort((a, b) => {
    // 确保download_count是数字类型并处理可能的undefined/null值
    const aCount = Number(a.download_count) || 0;
    const bCount = Number(b.download_count) || 0;
    // 降序排列，下载次数多的排在前面
    return bCount - aCount;
  })

  // 再根据创建时间排序
  const sortedPickersByCreatedAt = [...filteredPickers].sort((a, b) => {
    // 确保正确处理created_at日期并转换为时间戳
    const aTime = new Date(a.created_at).getTime();
    const bTime = new Date(b.created_at).getTime();
    // 降序排列，创建时间晚的排在前面
    return bTime - aTime;
  })

  // 处理Publish按钮点击
  const handlePublishClick = async () => {
    try {
      // 1. 检查登录状态
      const isLoggedIn = await clientAPI.checkLoginStatus();
      if (!isLoggedIn) {
        alert('Please log in first');
        return;
      }
      
      // 2. 验证Dev用户权限
      const isDevUser = await clientAPI.checkDevUserStatus();
      if (!isDevUser) {
        alert('Only developers can publish pickers');
        return;
      }
      
      // 3. 显示上传对话框
      setShowUploadDialog(true);
    } catch (error) {
      console.error('Error during publish check:', error);
      alert('Failed to check permissions. Please try again.');
    }
  };
  
  // 处理文件上传
  const handleUpload = async () => {
    // 表单验证
    const trimmedAlias = pickerAlias.trim();
    const trimmedDescription = pickerDescription.trim();
    const trimmedVersion = pickerVersion.trim();
    
    if (!selectedFile) {
      alert('Please select a picker file');
      return;
    }
    if (!trimmedAlias) {
      alert('Please enter a picker alias');
      return;
    }
    if (!trimmedDescription) {
      alert('Please enter a picker description');
      return;
    }
    if (!trimmedVersion) {
      alert('Please enter a picker version');
      return;
    }
    if (pickerPrice < 0) {
      alert('Price cannot be negative');
      return;
    }
    
    try {
      setIsUploading(true);
      setIsProcessing(true); // 设置处理中状态，显示全局遮罩层
      setUploadProgress(0);
      
      // 模拟进度更新
      progressIntervalRef.current = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current);
              progressIntervalRef.current = null;
            }
            return prev;
          }
          return prev + 10;
        });
      }, 500);
      
      // 调用上传接口
      await clientAPI.uploadLocalPicker(
        trimmedAlias,
        trimmedDescription,
        trimmedVersion,
        pickerPrice,
        selectedFile,
        selectedImage || undefined
      );
      
      // 清除定时器
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setUploadProgress(100);
      
      // 上传成功后刷新页面或提示
      setTimeout(() => {
        resetForm();
        setIsProcessing(false); // 上传成功后设置处理完成
        // 显示成功提示 - 使用showCustomAlert
        showCustomAlert('Success', 'Picker published successfully!', 'OK', async () => {
          // get picker list
          const pickerListResponse = await clientAPI.getPickerMarketplace();
          if (Array.isArray(pickerListResponse.pickers)) {
            setPickers(pickerListResponse.pickers as PickerInfo[]);
          }
          });
      }, 500);
    } catch (error) {
      console.error('Error uploading picker:', error);
      // 清除定时器
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      // 提供更详细的错误信息
      const errorMessage = error instanceof Error ? error.message : 'Failed to publish picker. Please try again.';
      alert(`Upload failed: ${errorMessage}`);
      setIsUploading(false);
      setIsProcessing(false); // 错误时也要设置处理完成
    }
  };
  
  // 重置表单
  const resetForm = () => {
    setShowUploadDialog(false);
    setSelectedFile(null);
    setSelectedImage(null);
    setPickerAlias('');
    setPickerDescription('');
    setPickerVersion('1.0.0');
    setPickerPrice(0);
    setUploadProgress(0);
    setIsUploading(false);
  };
  
  // 处理删除Picker
  const handleDeletePicker = async (pickerId: string) => {
    setOperatingPickerId(pickerId);
    try {
      const response = await clientAPI.deletePicker(pickerId);
      // 弹出删除成功提示
      showCustomAlert('Success', response || 'Picker deleted successfully!', 'OK', () => {});

      // 删除成功后刷新Picker列表
      const pickerListResponse = await clientAPI.getPickerMarketplace();
      if (Array.isArray(pickerListResponse.pickers)) {
        setPickers(pickerListResponse.pickers as PickerInfo[]);
      }
    } catch (error) {
      console.error('Failed to delete picker:', error);
      showCustomAlert('Error', 'Failed to delete picker. ' + (error instanceof Error ? error.message : 'Please try again.'), 'OK', () => {});
    } finally {
      setOperatingPickerId(null);
    }
  };
  
  // 清理函数，组件卸载时清除定时器
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, []);

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
                  <div className="progress-bar" style={{ width: `${dialogContent.progress}%` }}></div>
                  <span className="progress-text">{dialogContent.progress}%</span>
                </div>
              )}
            </div>
            <div className="custom-dialog-footer">
              {dialogContent.optionalButtonText && (
                <button 
                  className="custom-dialog-button"
                  onClick={dialogContent.onOptionalButtonClick}
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
      
      <div className="marketplace-content">
      {/* Header */}
      <div className="content-header">
        {/* <h1 className="page-title">Marketplace</h1> */}
        <div className="header-controls">
          <div className="category-tabs">
            {categories.map(category => (
              <button
                key={category}
                className={`category-tab ${activeCategory === category ? 'active' : ''}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="search-container">
            <input
              type="text"
              placeholder="Search picker, tools, extensions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
          {/* Publish Button */}
          <button className="publish-button" onClick={handlePublishClick}>
            Publish
          </button>
        </div>
      </div>

      {/* Picker Grid */}
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading pickers...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <p>{error}</p>
          <button className="retry-button" onClick={() => window.location.reload()}>Retry</button>
        </div>
      ) : filteredPickers.length === 0 ? (
        <div className="no-pickers">No pickers found</div>
      ) : (
        <div className="picker-grid">
          {/* 根据activeCategory选择不同的数据源 */}
          {(activeCategory === 'All' ? filteredPickers : 
            activeCategory === 'Popular' ? sortedPickersByDownloadCount : 
            sortedPickersByCreatedAt).map(picker => (
            <PickerCard key={picker.picker_id} picker={picker} onDeletePicker={handleDeletePicker} operatingPickerId={operatingPickerId || undefined} />
          ))}
        </div>
      )}
      
      {/* Upload Dialog */}
      {showUploadDialog && (
        <div className="global-overlay" onClick={() => setShowUploadDialog(false)}>
          <div className="custom-dialog-overlay">
            <div className="custom-dialog" onClick={(e) => e.stopPropagation()}>
              <h2>Publish Picker</h2>
              
              <div className="dialog-content">
                <div className="form-group">
                  <label>Alias:</label>
                  <input
                    type="text"
                    value={pickerAlias}
                    onChange={(e) => setPickerAlias(e.target.value)}
                    placeholder="Unique identifier for your picker"
                    disabled={isUploading}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Description:</label>
                  <textarea
                    value={pickerDescription}
                    onChange={(e) => setPickerDescription(e.target.value)}
                    rows={4}
                    placeholder="Describe what your picker does"
                    disabled={isUploading}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Version:</label>
                  <input
                    type="text"
                    value={pickerVersion}
                    onChange={(e) => setPickerVersion(e.target.value)}
                    placeholder="e.g., 1.0.0"
                    disabled={isUploading}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Price:</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={pickerPrice}
                    onChange={(e) => setPickerPrice(parseFloat(e.target.value) || 1)}
                    placeholder="0 for free"
                    disabled={isUploading}
                    className="form-input"
                  />
                </div>
                
                <div className="form-group">
                  <label>Picker File (Required):</label>
                  <div className="file-input-container">
                    <input
                      type="file"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      disabled={isUploading}
                      className="file-input"
                      accept=".zip,.tar.gz"
                    />
                    {selectedFile && (
                      <span className="file-name">{selectedFile.name}</span>
                    )}
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Preview Image (Optional):</label>
                  <div className="file-input-container">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                      disabled={isUploading}
                      className="file-input"
                    />
                    {selectedImage && (
                      <span className="file-name">{selectedImage.name}</span>
                    )}
                  </div>
                </div>
              </div>
              
              {isUploading && (
                <div className="progress-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div className="progress-text">{uploadProgress}%</div>
                </div>
              )}
              
              <div className="dialog-actions">
                <button 
                  className="cancel-button" 
                  onClick={resetForm}
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button 
                  className="confirm-button" 
                  onClick={handleUpload}
                  disabled={isUploading || !selectedFile || !pickerAlias.trim() || !pickerDescription.trim()}
                >
                  {isUploading ? 'Uploading...' : 'Publish'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="pagination">
        <button className="pagination-btn active">1</button>
        <button className="pagination-btn">2</button>
        <button className="pagination-btn">3</button>
        <span className="pagination-ellipsis">...</span>
        <button className="pagination-btn">10</button>
      </div>
    </div>
    </>
  )
}



export default MarketplaceContent