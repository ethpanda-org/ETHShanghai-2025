import React, { useState } from 'react';
import { Shield, Code, Zap, AlertTriangle, FileText, Plus, X, Briefcase, CheckCircle, DollarSign, Wrench } from 'lucide-react';
import type { ContractFile, BusinessContext, AnalysisRequest, AnalysisResult } from '../services/contractAPI';
import { contractAPI } from '../services/contractAPI';

const AnalysisPage: React.FC = () => {
  const [contracts, setContracts] = useState<ContractFile[]>([]);
  const [currentCode, setCurrentCode] = useState('');
  const [currentFileName, setCurrentFileName] = useState('');
  
  const [businessContext, setBusinessContext] = useState<BusinessContext>({
    projectName: '',
    businessType: 'DeFi',
    businessDescription: '',
    expectedBehavior: '',
    securityRequirements: ''
  });
  
  const [analysisType, setAnalysisType] = useState<'security' | 'gas' | 'business' | 'all'>('all');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'vulnerability' | 'design' | 'business' | 'gas' | 'fix'>('vulnerability');

  const handleAddContract = () => {
    if (!currentCode.trim() || !currentFileName.trim()) {
      alert('请输入文件名和代码');
      return;
    }
    setContracts([...contracts, {
      fileName: currentFileName,
      code: currentCode,
      isMain: contracts.length === 0
    }]);
    setCurrentCode('');
    setCurrentFileName('');
  };

  const handleAnalyze = async () => {
    if (contracts.length === 0 || !businessContext.projectName.trim()) {
      alert('请完善信息');
      return;
    }

    setAnalyzing(true);
    setResult(null);
    setError(null);

    try {
      const response = await contractAPI.analyze({ contracts, businessContext, analysisType });
      setResult(response);
      setActiveTab('vulnerability');
    } catch (error) {
      setError(error instanceof Error ? error.message : '分析失败');
    } finally {
      setAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      CRITICAL: 'bg-red-100 text-red-800 border-red-300',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      LOW: 'bg-blue-100 text-blue-800 border-blue-300',
      SAFE: 'bg-green-100 text-green-800 border-green-300'
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // 加载示例代码
  const loadExample = () => {
    setCurrentCode(`pragma solidity ^0.8.0;

contract VulnerableBank {
    mapping(address => uint) public balances;
    
    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }
    
    function withdraw() public {
        uint amount = balances[msg.sender];
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success);
        balances[msg.sender] = 0;  // 重入攻击漏洞！
    }
}`);
    
    setCurrentFileName('VulnerableBank.sol');
    setBusinessContext({
      projectName: '示例银行合约',
      businessType: 'DeFi',
      businessDescription: '一个简单的存取款银行合约，用户可以存入ETH并随时提取',
      expectedBehavior: '用户存款后应该能够安全地提取自己的资金，系统应该防止重入攻击',
      securityRequirements: '防止重入攻击，确保资金安全，Gas消耗合理'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            ContractGuard AI - 智能合约全面审计
          </h1>
          <p className="text-xl text-gray-600">代码漏洞 + 设计缺陷 + 业务逻辑 + Gas优化 = 全方位保护</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 左侧: 输入区 */}
          <div className="space-y-6">
            
            {/* 业务信息 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Briefcase className="h-6 w-6 mr-2 text-purple-600" />
                业务逻辑
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">项目名称 *</label>
                  <input
                    type="text"
                    value={businessContext.projectName}
                    onChange={(e) => setBusinessContext({...businessContext, projectName: e.target.value})}
                    placeholder="如: DeFi借贷协议"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">业务类型 *</label>
                  <select
                    value={businessContext.businessType}
                    onChange={(e) => setBusinessContext({...businessContext, businessType: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="DeFi">DeFi</option>
                    <option value="NFT">NFT</option>
                    <option value="DAO">DAO</option>
                    <option value="GameFi">GameFi</option>
                    <option value="Other">其他</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">业务描述 * (AI会根据这个判断代码是否符合业务)</label>
                  <textarea
                    value={businessContext.businessDescription}
                    onChange={(e) => setBusinessContext({...businessContext, businessDescription: e.target.value})}
                    placeholder="详细描述业务逻辑,如: 用户质押代币获取收益,收益率为年化10%..."
                    rows={4}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">预期行为 *</label>
                  <textarea
                    value={businessContext.expectedBehavior}
                    onChange={(e) => setBusinessContext({...businessContext, expectedBehavior: e.target.value})}
                    placeholder="合约应该如何工作,如: 用户质押后立即开始计息,可随时提取本金和收益..."
                    rows={3}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">安全要求</label>
                  <textarea
                    value={businessContext.securityRequirements || ''}
                    onChange={(e) => setBusinessContext({...businessContext, securityRequirements: e.target.value})}
                    placeholder="特殊的安全要求或合规需求（可选）"
                    rows={2}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            {/* 合约文件 */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center">
                <Code className="h-6 w-6 mr-2 text-blue-600" />
                合约文件 ({contracts.length})
              </h2>

              {contracts.length > 0 && (
                <div className="space-y-2 mb-4">
                  {contracts.map((contract, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-gray-600" />
                        <span className="font-mono text-sm">{contract.fileName}</span>
                        {contract.isMain && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">主</span>}
                      </div>
                      <button onClick={() => setContracts(contracts.filter((_, i) => i !== index))} className="text-red-600 hover:bg-red-50 p-1 rounded">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <input
                  type="text"
                  value={currentFileName}
                  onChange={(e) => setCurrentFileName(e.target.value)}
                  placeholder="文件名 (如: Token.sol)"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                <textarea
                  value={currentCode}
                  onChange={(e) => setCurrentCode(e.target.value)}
                  placeholder="粘贴 Solidity 代码..."
                  rows={8}
                  className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
                />
                <div className="flex gap-2">
                  <button onClick={handleAddContract} className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                    <Plus className="h-5 w-5 mr-2" />添加合约
                  </button>
                  <button onClick={loadExample} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg">
                    加载示例
                  </button>
                </div>
              </div>
            </div>

            {/* 分析按钮 */}
            <button
              onClick={handleAnalyze}
              disabled={analyzing || contracts.length === 0 || !businessContext.projectName}
              className={`w-full flex items-center justify-center px-6 py-4 rounded-xl text-white font-medium text-lg ${
                analyzing || contracts.length === 0 || !businessContext.projectName
                  ? 'bg-gray-400'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg'
              }`}
            >
              {analyzing ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  AI分析中...
                </>
              ) : (
                <>
                  <Shield className="h-6 w-6 mr-3" />
                  开始全面审计
                </>
              )}
            </button>
          </div>

          {/* 右侧: 分析结果 */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            
            {/* 结果标签 */}
            {result && (
              <div className="flex border-b">
                <button
                  onClick={() => setActiveTab('vulnerability')}
                  className={`flex-1 px-4 py-3 text-sm font-medium ${activeTab === 'vulnerability' ? 'bg-red-50 text-red-700 border-b-2 border-red-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <AlertTriangle className="h-4 w-4 inline mr-1" />
                  代码安全
                </button>
                <button
                  onClick={() => setActiveTab('design')}
                  className={`flex-1 px-4 py-3 text-sm font-medium ${activeTab === 'design' ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Shield className="h-4 w-4 inline mr-1" />
                  设计质量
                </button>
                <button
                  onClick={() => setActiveTab('business')}
                  className={`flex-1 px-4 py-3 text-sm font-medium ${activeTab === 'business' ? 'bg-purple-50 text-purple-700 border-b-2 border-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Briefcase className="h-4 w-4 inline mr-1" />
                  业务逻辑
                </button>
                <button
                  onClick={() => setActiveTab('gas')}
                  className={`flex-1 px-4 py-3 text-sm font-medium ${activeTab === 'gas' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Zap className="h-4 w-4 inline mr-1" />
                  Gas优化
                </button>
                <button
                  onClick={() => setActiveTab('fix')}
                  className={`flex-1 px-4 py-3 text-sm font-medium ${activeTab === 'fix' ? 'bg-green-50 text-green-700 border-b-2 border-green-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                  <Wrench className="h-4 w-4 inline mr-1" />
                  修复方案
                </button>
              </div>
            )}

            <div className="p-6">
              
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {!result && !analyzing && !error && (
                <div className="text-center py-12">
                  <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">填写业务信息,添加合约后开始分析</p>
                </div>
              )}

              {analyzing && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
                  <p className="text-purple-600 font-medium">AI正在深度分析...</p>
                  <p className="text-gray-500 text-sm mt-2">分析代码漏洞 + 设计缺陷 + 业务逻辑 + Gas优化</p>
                </div>
              )}

              {result && (
                <div className="space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto">
                  
                  {/* 综合评分 */}
                  <div className={`p-4 border-2 rounded-lg ${getSeverityColor(result.overallAssessment.riskLevel)}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">综合评分</p>
                        <p className="text-3xl font-bold">{result.overallAssessment.overallScore}/100</p>
                        <p className="text-sm mt-1">风险等级: {result.overallAssessment.riskLevel}</p>
                      </div>
                      <Shield className="h-12 w-12" />
                    </div>
                  </div>

                  {/* 1. 代码安全漏洞 */}
                  {activeTab === 'vulnerability' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-5 gap-2 text-center text-xs">
                        <div className="p-2 bg-gray-100 rounded"><div className="font-bold text-lg">{result.codeVulnerabilityAnalysis.summary.total}</div>总计</div>
                        <div className="p-2 bg-red-100 rounded"><div className="font-bold text-lg">{result.codeVulnerabilityAnalysis.summary.critical}</div>严重</div>
                        <div className="p-2 bg-orange-100 rounded"><div className="font-bold text-lg">{result.codeVulnerabilityAnalysis.summary.high}</div>高危</div>
                        <div className="p-2 bg-yellow-100 rounded"><div className="font-bold text-lg">{result.codeVulnerabilityAnalysis.summary.medium}</div>中危</div>
                        <div className="p-2 bg-blue-100 rounded"><div className="font-bold text-lg">{result.codeVulnerabilityAnalysis.summary.low}</div>低危</div>
                      </div>

                      {result.codeVulnerabilityAnalysis.vulnerabilities.map((vuln) => (
                        <div key={vuln.id} className={`p-4 border rounded-lg mb-3 ${getSeverityColor(vuln.severity)}`}>
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold">{vuln.title}</span>
                            <span className="text-xs px-2 py-1 rounded">{vuln.severity}</span>
                          </div>
                          <p className="text-sm mb-2">{vuln.description}</p>
                          <p className="text-xs">位置: {vuln.location.contractFile} {vuln.location.function && `- ${vuln.location.function}()`}</p>
                          <p className="text-sm mt-2"><strong>影响:</strong> {vuln.impact}</p>
                          {vuln.exploitScenario && <p className="text-sm mt-1"><strong>攻击场景:</strong> {vuln.exploitScenario}</p>}
                          <div className="mt-2 p-2 bg-black/5 rounded text-xs font-mono">{vuln.affectedCode}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 2. 设计缺陷 */}
                  {activeTab === 'design' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="p-2 bg-gray-100 rounded"><div className="font-bold text-lg">{result.designFlawAnalysis.summary.total}</div>总计</div>
                        <div className="p-2 bg-red-100 rounded"><div className="font-bold text-lg">{result.designFlawAnalysis.summary.architectural}</div>架构</div>
                        <div className="p-2 bg-orange-100 rounded"><div className="font-bold text-lg">{result.designFlawAnalysis.summary.upgradeability}</div>升级</div>
                        <div className="p-2 bg-yellow-100 rounded"><div className="font-bold text-lg">{result.designFlawAnalysis.summary.emergencyControl}</div>应急</div>
                      </div>

                      {result.designFlawAnalysis.flaws.map((flaw) => (
                        <div key={flaw.id} className={`p-4 border rounded-lg mb-3 ${getSeverityColor(flaw.severity)}`}>
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold">{flaw.title}</span>
                            <span className="text-xs px-2 py-1 rounded bg-white/50">{flaw.category}</span>
                          </div>
                          <p className="text-sm mt-2">{flaw.description}</p>
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="p-3 bg-red-100 rounded-lg">
                              <p className="text-xs font-semibold text-red-800 mb-2">当前设计</p>
                              <p className="text-sm text-red-900">{flaw.currentDesign}</p>
                            </div>
                            <div className="p-3 bg-green-100 rounded-lg">
                              <p className="text-xs font-semibold text-green-800 mb-2">推荐设计</p>
                              <p className="text-sm text-green-900">{flaw.recommendedDesign}</p>
                            </div>
                          </div>
                          <p className="text-sm mt-2"><strong>设计影响:</strong> {flaw.designImpact}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 3. 业务逻辑分析 */}
                  {activeTab === 'business' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="p-2 bg-gray-100 rounded"><div className="font-bold text-lg">{result.businessLogicAnalysis.summary.totalIssues}</div>总问题</div>
                        <div className="p-2 bg-red-100 rounded"><div className="font-bold text-lg">{result.businessLogicAnalysis.summary.logicMismatches}</div>逻辑不符</div>
                        <div className="p-2 bg-orange-100 rounded"><div className="font-bold text-lg">{result.businessLogicAnalysis.summary.missingFeatures}</div>缺失功能</div>
                        <div className="p-2 bg-yellow-100 rounded"><div className="font-bold text-lg">{result.businessLogicAnalysis.summary.implementationGaps}</div>实现差距</div>
                      </div>

                      {result.businessLogicAnalysis.issues.map((issue) => (
                        <div key={issue.id} className={`p-4 border rounded-lg mb-3 ${getSeverityColor(issue.severity)}`}>
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold">{issue.title}</span>
                            <span className="text-xs px-2 py-1 rounded bg-white/50">{issue.category}</span>
                          </div>
                          <p className="text-sm mt-2">{issue.description}</p>
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="p-3 bg-blue-100 rounded-lg">
                              <p className="text-xs font-semibold text-blue-800 mb-2">预期行为</p>
                              <p className="text-sm text-blue-900">{issue.expectedBehavior}</p>
                            </div>
                            <div className="p-3 bg-red-100 rounded-lg">
                              <p className="text-xs font-semibold text-red-800 mb-2">实际实现</p>
                              <p className="text-sm text-red-900">{issue.actualImplementation}</p>
                            </div>
                          </div>
                          <p className="text-sm mt-2"><strong>差异说明:</strong> {issue.discrepancy}</p>
                          <p className="text-sm mt-1"><strong>业务影响:</strong> {issue.businessImpact}</p>
                          {issue.examples && issue.examples.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium mb-1">具体场景:</p>
                              <ul className="text-sm space-y-1">
                                {issue.examples.map((ex, i) => (
                                  <li key={i} className="pl-4">• {ex}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 4. Gas优化分析 */}
                  {activeTab === 'gas' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-yellow-50 rounded-lg">
                          <p className="text-sm text-gray-600">总Gas</p>
                          <p className="text-2xl font-bold">{result.gasAnalysis.currentGasReport.totalEstimatedGas.toLocaleString()}</p>
                        </div>
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <p className="text-sm text-gray-600">Gas价格</p>
                          <p className="text-2xl font-bold">{result.gasAnalysis.currentGasReport.averageGasPrice}</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                          <p className="text-sm text-gray-600">总成本</p>
                          <p className="text-2xl font-bold">${result.gasAnalysis.currentGasReport.estimatedCostUSD}</p>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">高消耗函数</h3>
                        {result.gasAnalysis.currentGasReport.highGasFunctions.map((func, i) => (
                          <div key={i} className="p-3 border rounded-lg mb-2">
                            <div className="flex justify-between">
                              <span className="font-mono text-sm">{func.functionName}()</span>
                              <span className={`text-xs px-2 py-1 rounded ${func.gasLevel === 'HIGH' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                                {func.gasLevel}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{func.contractFile}</p>
                            <div className="flex justify-between mt-2 text-sm">
                              <span>Gas: {func.estimatedGas.toLocaleString()}</span>
                              <span>成本: {func.costETH} ETH</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">优化建议</h3>
                        {result.gasAnalysis.optimizations.map((opt) => (
                          <div key={opt.id} className="border rounded-lg p-4 mb-3">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold">{opt.title}</h4>
                              <span className={`text-xs px-2 py-1 rounded ${opt.priority === 'HIGH' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                                {opt.priority}
                              </span>
                            </div>
                            
                            <p className="text-sm mb-2">{opt.description}</p>

                            <div className="grid grid-cols-3 gap-2 mb-3 text-center text-sm">
                              <div className="p-2 bg-red-50 rounded">
                                <div className="text-xs text-gray-600">当前</div>
                                <div className="font-bold">{opt.gasComparison.currentGas.toLocaleString()}</div>
                              </div>
                              <div className="p-2 bg-green-50 rounded">
                                <div className="text-xs text-gray-600">优化后</div>
                                <div className="font-bold">{opt.gasComparison.optimizedGas.toLocaleString()}</div>
                              </div>
                              <div className="p-2 bg-blue-50 rounded">
                                <div className="text-xs text-gray-600">节省</div>
                                <div className="font-bold text-green-600">{opt.gasComparison.savingsPercentage}</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <div>
                                <p className="text-xs text-red-600 mb-1">优化前:</p>
                                <pre className="text-xs bg-red-50 p-2 rounded overflow-x-auto">{opt.implementation.beforeCode}</pre>
                              </div>
                              <div>
                                <p className="text-xs text-green-600 mb-1">优化后:</p>
                                <pre className="text-xs bg-green-50 p-2 rounded overflow-x-auto">{opt.implementation.afterCode}</pre>
                              </div>
                            </div>
                            
                            <p className="text-sm text-gray-600">{opt.explanation}</p>
                          </div>
                        ))}
                      </div>
                      
                      <p className="text-sm text-gray-600">{result.gasAnalysis.currentGasReport.analysis}</p>
                    </div>
                  )}

                  {/* 5. 修复方案 */}
                  {activeTab === 'fix' && (
                    <div className="space-y-4">
                      {result.fixSolutions.map((solution, i) => (
                        <div key={i} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold">{solution.solutionTitle}</h3>
                            <span className={`text-xs px-2 py-1 rounded ${solution.priority === 'URGENT' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                              {solution.priority}
                            </span>
                          </div>
                          
                          <p className="text-sm mb-3">{solution.solutionDescription}</p>
                          
                          <div className="space-y-2 mb-3">
                            <p className="text-sm font-medium">修复步骤:</p>
                            {solution.implementationSteps.map((step, j) => (
                              <p key={j} className="text-sm pl-4">{j + 1}. {step}</p>
                            ))}
                          </div>

                          {solution.codeChanges.map((change, j) => (
                            <div key={j} className="mb-3">
                              <p className="text-sm font-medium mb-1">{change.file}</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <p className="text-xs text-red-600 mb-1">修改前:</p>
                                  <pre className="text-xs bg-red-50 p-2 rounded overflow-x-auto">{change.beforeCode}</pre>
                                </div>
                                <div>
                                  <p className="text-xs text-green-600 mb-1">修改后:</p>
                                  <pre className="text-xs bg-green-50 p-2 rounded overflow-x-auto">{change.afterCode}</pre>
                                </div>
                              </div>
                              <p className="text-sm mt-2 text-gray-600">{change.explanation}</p>
                            </div>
                          ))}

                          <p className="text-sm mt-2"><strong>预计工作量:</strong> {solution.estimatedEffort}</p>
                          <p className="text-sm"><strong>测试建议:</strong> {solution.testingAdvice}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI洞察 */}
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h3 className="font-semibold mb-2">AI综合分析</h3>
                    <p className="text-sm whitespace-pre-wrap">{result.overallAssessment.aiInsights}</p>
                  </div>

                  {/* 优先级建议 */}
                  {result.overallAssessment.priorityRecommendations.length > 0 && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h3 className="font-semibold mb-2">优先级建议</h3>
                      <ol className="list-decimal list-inside space-y-1">
                        {result.overallAssessment.priorityRecommendations.map((rec, i) => (
                          <li key={i} className="text-sm">{rec}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;