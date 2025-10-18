import React, { useState } from 'react';
import { Link, Wifi, CheckCircle, XCircle, Clock, Server, Globe } from 'lucide-react';
import { contractAPI } from '../services/contractAPI';

const TestConnection: React.FC = () => {
  const [status, setStatus] = useState<string>('未测试');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleTest = async () => {
    setLoading(true);
    setStatus('测试中...');
    setResult(null);
    
    try {
      const data = await contractAPI.healthCheck();
      setStatus('连接成功');
      setResult(data);
    } catch (error) {
      setStatus('连接失败');
      setResult({ 
        error: error instanceof Error ? error.message : '未知错误',
        tip: '请确保后端服务在 localhost:8080 运行'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (status.includes('成功')) return 'text-green-600';
    if (status.includes('失败') || status.includes('错误')) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getStatusIcon = () => {
    if (status.includes('成功')) return <CheckCircle className="h-6 w-6 text-green-600" />;
    if (status.includes('失败') || status.includes('错误')) return <XCircle className="h-6 w-6 text-red-600" />;
    if (loading) return <Clock className="h-6 w-6 text-yellow-600 animate-pulse" />;
    return <Wifi className="h-6 w-6 text-gray-400" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* 页面头部 */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-3 rounded-2xl shadow-lg">
              <Link className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-4">
            前后端连接测试
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            验证WSL2前端与Windows后端服务的网络连接状态
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 左侧: 连接信息 */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                <div className="flex items-center">
                  <Server className="h-6 w-6 text-white mr-3" />
                  <h2 className="text-xl font-semibold text-white">服务配置</h2>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* 前端信息 */}
                <div className="flex items-center p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <Globe className="h-8 w-8 text-blue-600 mr-4 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-900">前端服务 (WSL2)</p>
                    <p className="text-sm text-blue-600 font-mono">http://127.0.0.1:5173</p>
                    <p className="text-xs text-blue-500">React + Vite开发服务器</p>
                  </div>
                </div>

                {/* 后端信息 */}
                <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-xl">
                  <Server className="h-8 w-8 text-green-600 mr-4 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-900">后端服务 (Windows)</p>
                    <p className="text-sm text-green-600 font-mono">http://localhost:8080</p>
                    <p className="text-xs text-green-500">Spring Boot应用服务器</p>
                  </div>
                </div>

                {/* API端点 */}
                <div className="flex items-center p-4 bg-purple-50 border border-purple-200 rounded-xl">
                  <Link className="h-8 w-8 text-purple-600 mr-4 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-purple-900">健康检查端点</p>
                    <p className="text-sm text-purple-600 font-mono">/security/health</p>
                    <p className="text-xs text-purple-500">用于验证服务可用性</p>
                  </div>
                </div>

                {/* 测试按钮 */}
                <button
                  onClick={handleTest}
                  disabled={loading}
                  className={`w-full flex items-center justify-center px-6 py-4 border border-transparent text-lg font-medium rounded-xl text-white transition-all duration-200 ${
                    loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                  }`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      连接测试中...
                    </>
                  ) : (
                    <>
                      <Wifi className="h-6 w-6 mr-3" />
                      开始连接测试
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* 右侧: 测试结果 */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
                <div className="flex items-center">
                  <CheckCircle className="h-6 w-6 text-white mr-3" />
                  <h2 className="text-xl font-semibold text-white">连接状态</h2>
                </div>
              </div>

              <div className="p-6">
                {/* 状态显示 */}
                <div className="mb-6">
                  <div className="flex items-center justify-center mb-4">
                    {getStatusIcon()}
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${getStatusColor()}`}>
                      {status}
                    </p>
                    {result && !loading && (
                      <p className="text-sm text-gray-500 mt-2">
                        测试时间: {new Date().toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* 结果详情 */}
                {result && !loading && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 border-b pb-2">响应详情</h3>
                    <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-64">
                      <pre className="text-sm font-mono whitespace-pre-wrap">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* 空状态 */}
                {!result && !loading && (
                  <div className="text-center py-8">
                    <div className="bg-gray-100 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                      <Wifi className="h-10 w-10 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">等待测试</h3>
                    <p className="text-gray-500">
                      点击左侧按钮开始连接测试
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 故障排除指南 */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
                <h3 className="text-lg font-semibold text-white">故障排除指南</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3 text-sm">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>确保Windows后端服务在localhost:8080运行</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>检查后端跨域配置是否包含5173端口</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>验证WSL2网络连接是否正常</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>查看浏览器开发者工具Network标签</p>
                  </div>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <p>检查防火墙是否阻止了8080端口</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestConnection;