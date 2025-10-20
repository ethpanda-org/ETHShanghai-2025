// FlowAI 前端应用
class FlowAIApp {
    constructor() {
        this.apiBase = '/api';
        this.web3 = null;
        this.currentUserAddress = null;
        this.isAutoWorkMode = false;
        this.pendingExecutionSignatures = [];
        this.pendingSubmissions = [];
        this.isTestnet = false;
        this.networkInfo = null;
        this.pendingPayment = null;
        
        this.init();
    }

    async init() {
        console.log('🚀 FlowAI 应用初始化...');
        
        // 绑定事件监听器
        this.bindEventListeners();
        
        // 加载网络信息
        await this.loadNetworkInfo();
        
        // 检查钱包连接状态
        await this.checkWalletConnection();
        
        // 加载任务列表
        await this.loadTasks();
        
        console.log('✅ FlowAI 应用初始化完成');
    }

    bindEventListeners() {
        // 标签切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // 钱包连接
        document.getElementById('connectWalletBtn').addEventListener('click', () => {
            this.connectWallet();
        });

        document.getElementById('disconnectWalletBtn').addEventListener('click', () => {
            this.disconnectWallet();
        });

        // 发布任务表单
        document.getElementById('publishTaskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.publishTask();
        });

        // AI Agent 控制
        document.getElementById('startAgentBtn').addEventListener('click', () => {
            this.startAutoWork();
        });

        document.getElementById('stopAgentBtn').addEventListener('click', () => {
            this.stopAutoWork();
        });

        document.getElementById('syncAgentBtn').addEventListener('click', () => {
            this.syncAgentWork();
        });

        // 刷新按钮
        document.getElementById('refreshTasksBtn').addEventListener('click', () => {
            this.loadTasks();
        });

        // 模态框关闭
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                this.closeModal();
            });
        });

        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });
    }

    async loadNetworkInfo() {
        try {
            const response = await fetch(`${this.apiBase}/network/info`);
            const data = await response.json();
            this.networkInfo = data;
            this.isTestnet = data.network_type === 'testnet';
            console.log('🌐 网络信息:', data);
        } catch (error) {
            console.error('❌ 加载网络信息失败:', error);
        }
    }

    async checkWalletConnection() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    this.currentUserAddress = accounts[0];
                    this.updateWalletUI();
                }
            } catch (error) {
                console.error('❌ 检查钱包连接失败:', error);
            }
        }
    }

    async connectWallet() {
        if (typeof window.ethereum === 'undefined') {
            this.showNotification('请安装 MetaMask 钱包', 'error');
            return;
        }

        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts.length > 0) {
                this.currentUserAddress = accounts[0];
                this.updateWalletUI();
                this.showNotification('钱包连接成功', 'success');
                
                // 检查网络
                await this.checkNetwork();
            }
        } catch (error) {
            console.error('❌ 连接钱包失败:', error);
            this.showNotification('连接钱包失败', 'error');
        }
    }

    async checkNetwork() {
        if (this.networkInfo && this.networkInfo.supports_metamask) {
            try {
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                const expectedChainId = this.isTestnet ? '0xaa36a7' : '0x1'; // Sepolia: 11155111, Mainnet: 1
                
                if (chainId !== expectedChainId) {
                    const networkName = this.isTestnet ? 'Sepolia 测试网' : '以太坊主网';
                    this.showNotification(`请切换到 ${networkName}`, 'warning');
                }
            } catch (error) {
                console.error('❌ 检查网络失败:', error);
            }
        }
    }

    updateWalletUI() {
        const connectBtn = document.getElementById('connectWalletBtn');
        const walletInfo = document.getElementById('walletInfo');
        const walletAddress = document.getElementById('walletAddress');

        if (this.currentUserAddress) {
            connectBtn.style.display = 'none';
            walletInfo.style.display = 'flex';
            walletAddress.textContent = `${this.currentUserAddress.substring(0, 6)}...${this.currentUserAddress.substring(38)}`;
        } else {
            connectBtn.style.display = 'block';
            walletInfo.style.display = 'none';
        }
    }

    disconnectWallet() {
        this.currentUserAddress = null;
        this.updateWalletUI();
        this.showNotification('钱包已断开连接', 'info');
    }

    switchTab(tabName) {
        // 隐藏所有标签内容
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // 移除所有标签按钮的激活状态
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // 显示选中的标签内容
        document.getElementById(`${tabName}Tab`).classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // 根据标签加载相应数据
        if (tabName === 'tasks') {
            this.loadTasks();
        } else if (tabName === 'stats') {
            this.loadStats();
        }
    }

    async loadTasks() {
        try {
            this.showNotification('加载任务中...', 'info');
            const response = await fetch(`${this.apiBase}/tasks`);
            const data = await response.json();
            
            this.displayTasks(data.tasks);
            this.showNotification('任务加载完成', 'success');
        } catch (error) {
            console.error('❌ 加载任务失败:', error);
            this.showNotification('加载任务失败', 'error');
        }
    }

    displayTasks(tasks) {
        const tasksList = document.getElementById('tasksList');
        
        if (tasks.length === 0) {
            tasksList.innerHTML = '<div class="no-tasks">暂无可用任务</div>';
            return;
        }

        tasksList.innerHTML = tasks.map(task => `
            <div class="task-card" data-task-id="${task.id}">
                <div class="task-header">
                    <h3 class="task-title">${task.title}</h3>
                    <div class="task-reward">${(task.reward / 1e18).toFixed(4)} ETH</div>
                </div>
                <div class="task-description">${task.description}</div>
                <div class="task-meta">
                    <span class="task-type">${task.task_type}</span>
                    <span class="task-deadline">截止: ${new Date(task.deadline * 1000).toLocaleString()}</span>
                </div>
                <div class="task-actions">
                    <button class="btn btn-primary" onclick="window.flowAIApp.viewTask(${task.id})">
                        查看详情
                    </button>
                    ${task.publisher === this.currentUserAddress ? 
                        `<button class="btn btn-success" onclick="window.flowAIApp.selectWinner(${task.id}, 0)">
                            选择获胜者
                        </button>` : 
                        `<button class="btn btn-secondary" onclick="window.flowAIApp.claimTask(${task.id})">
                            认领任务
                        </button>`
                    }
                </div>
            </div>
        `).join('');
    }

    async viewTask(taskId) {
        try {
            const response = await fetch(`${this.apiBase}/tasks/${taskId}`);
            const task = await response.json();
            
            this.showTaskModal(task);
        } catch (error) {
            console.error('❌ 获取任务详情失败:', error);
            this.showNotification('获取任务详情失败', 'error');
        }
    }

    showTaskModal(task) {
        const modal = document.getElementById('taskModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = task.title;
        
        modalBody.innerHTML = `
            <div class="task-details">
                <div class="task-info">
                    <h4>任务信息</h4>
                    <p><strong>描述:</strong> ${task.description}</p>
                    <p><strong>类型:</strong> ${task.task_type}</p>
                    <p><strong>奖励:</strong> ${(task.reward / 1e18).toFixed(4)} ETH</p>
                    <p><strong>截止时间:</strong> ${new Date(task.deadline * 1000).toLocaleString()}</p>
                    <p><strong>发布者:</strong> ${task.publisher}</p>
                    <p><strong>状态:</strong> ${task.is_completed ? '已完成' : '进行中'}</p>
                </div>
                
                <div class="task-executions">
                    <h4>执行记录</h4>
                    <div id="executionsList">
                        ${this.renderExecutions(task.executions, task)}
                    </div>
                </div>
            </div>
        `;

        modal.style.display = 'block';
    }

    renderExecutions(executions, task) {
        if (!executions || executions.length === 0) {
            return '<div class="no-executions">暂无执行记录</div>';
        }

        return executions.map((exec, index) => `
            <div class="execution-item">
                <div class="execution-header">
                    <span class="executor">执行者: ${exec.executor}</span>
                    <span class="execution-time">${new Date(exec.executedAt * 1000).toLocaleString()}</span>
                </div>
                <div class="execution-result">${exec.result}</div>
                <div class="execution-actions">
                    ${task.publisher === this.currentUserAddress && !task.is_completed ? 
                        `<button class="btn btn-success" onclick="window.flowAIApp.selectWinner(${task.id}, ${index})">
                            选择为获胜者
                        </button>` : 
                        exec.isWinner ? '<span class="winner-badge">🏆 获胜者</span>' : ''
                    }
                </div>
            </div>
        `).join('');
    }

    async selectWinner(taskId, executionIndex) {
        if (!this.currentUserAddress) {
            this.showNotification('请先连接钱包', 'error');
            return;
        }

        // 打开支付确认模态框
        await this.showPaymentModal(taskId, executionIndex);
    }

    async showPaymentModal(taskId, executionIndex) {
        try {
            // 获取任务详情
            const response = await fetch(`${this.apiBase}/tasks/${taskId}`);
            const task = await response.json();
            
            if (!task.executions || executionIndex >= task.executions.length) {
                this.showNotification('无效的执行记录', 'error');
                return;
            }

            const execution = task.executions[executionIndex];
            
            // 设置支付信息
            document.getElementById('paymentTaskId').textContent = taskId;
            document.getElementById('paymentExecutor').textContent = execution.executor;
            document.getElementById('paymentAmount').textContent = (task.reward / 1e18).toFixed(4);
            
            // 存储待支付信息
            this.pendingPayment = { taskId, executionIndex };
            
            // 显示模态框
            document.getElementById('paymentModal').style.display = 'block';
            
            // 绑定确认按钮事件
            const confirmBtn = document.getElementById('confirmPaymentBtn');
            confirmBtn.onclick = () => this.confirmPayment();
            
        } catch (error) {
            console.error('显示支付模态框失败:', error);
            this.showNotification('显示支付确认失败', 'error');
        }
    }

    closePaymentModal() {
        document.getElementById('paymentModal').style.display = 'none';
        this.pendingPayment = null;
    }

    async confirmPayment() {
        if (!this.pendingPayment) return;
        
        const { taskId, executionIndex } = this.pendingPayment;
        
        // 读取gas参数
        const gasLimit = parseInt(document.getElementById('paymentGasLimit').value);
        const gasPriceGwei = parseFloat(document.getElementById('paymentGasPrice').value);
        const gasPriceWei = Math.floor(gasPriceGwei * 1e9);
        
        console.log('支付Gas参数:', { gasLimit, gasPriceGwei, gasPriceWei });
        
        try {
            // 关闭支付模态框
            this.closePaymentModal();
            
            this.showNotification('正在处理支付...', 'info');
            
            const response = await fetch(`${this.apiBase}/tasks/${taskId}/select-winner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    execution_index: executionIndex,
                    publisher_address: this.currentUserAddress,
                    gas_limit: gasLimit,
                    gas_price: gasPriceWei
                })
            });

            const result = await response.json();
            console.log('选择获胜者API返回结果:', result);
            
            if (response.ok) {
                // 检查AI审核结果
                if (result.status === 'audit_failed') {
                    console.log('❌ AI审核不通过:', result.audit_result);
                    this.showAuditFailedModal(result.audit_result);
                    return;
                }
                
                // 检查是否需要MetaMask签名
                if (result.status === 'pending_signature' && result.pending_signature) {
                    console.log('🦊 选择获胜者需要 MetaMask 签名:', result.pending_signature);
                    this.showNotification('请在 MetaMask 中签名选择获胜者并支付奖金', 'info');
                    await this.signAndSendWinnerSelectionTransaction(result.pending_signature);
                } else if (result.status === 'success') {
                    const rewardEth = (result.reward / 1e18).toFixed(4);
                    this.showNotification(
                        `🎉 成功！获胜者已选定，${rewardEth} ETH 已支付给 ${result.winner.substring(0, 10)}...（AI审核通过）`,
                        'success'
                    );
                    
                    // 显示审核信息
                    if (result.audit_result) {
                        console.log('✅ AI审核通过:', result.audit_result);
                    }
                    
                    // 刷新任务详情
                    this.closeModal();
                    await this.loadTasks();
                    
                    // 重新打开模态框显示更新后的状态
                    const updatedTask = await this.getTaskDetails(taskId);
                    if (updatedTask) {
                        this.showTaskModal(updatedTask);
                    }
                }
            } else {
                this.showNotification(`选择失败: ${result.detail || result.message}`, 'error');
            }
        } catch (error) {
            console.error('选择获胜者失败:', error);
            this.showNotification('选择获胜者失败，请检查网络连接', 'error');
        }
    }
    
    showAuditFailedModal(auditResult) {
        // 显示AI审核失败的模态框
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'auditFailedModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🤖 AI公平性审核结果</h3>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="audit-result">
                        <div class="audit-status audit-failed">
                            <h4>❌ 审核不通过</h4>
                            <p><strong>置信度:</strong> ${(auditResult.confidence * 100).toFixed(1)}%</p>
                        </div>
                        
                        <div class="audit-details">
                            <h4>📋 审核原因:</h4>
                            <p>${auditResult.reason}</p>
                            
                            ${auditResult.risk_factors && auditResult.risk_factors.length > 0 ? `
                            <h4>⚠️ 识别的风险因素:</h4>
                            <ul>
                                ${auditResult.risk_factors.map(factor => `<li>${factor}</li>`).join('')}
                            </ul>
                            ` : ''}
                            
                            ${auditResult.recommendations && auditResult.recommendations.length > 0 ? `
                            <h4>💡 改进建议:</h4>
                            <ul>
                                ${auditResult.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                            </ul>
                            ` : ''}
                        </div>
                        
                        <div class="audit-actions">
                            <button class="btn btn-primary" onclick="this.closest('.modal').remove()">
                                我知道了
                            </button>
                            <button class="btn btn-secondary" onclick="this.closest('.modal').remove(); window.flowAIApp.loadTasks();">
                                重新选择
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // 点击模态框外部关闭
        modal.onclick = function(event) {
            if (event.target === modal) {
                modal.remove();
            }
        };
    }

    async getTaskDetails(taskId) {
        try {
            const currentLang = window.i18n ? window.i18n.currentLanguage : 'zh';
            const response = await fetch(`${this.apiBase}/tasks/${taskId}?lang=${currentLang}`);
            if (response.ok) {
                return await response.json();
            }
            return null;
        } catch (error) {
            console.error('获取任务详情失败:', error);
            return null;
        }
    }

    async publishTask() {
        if (!this.currentUserAddress) {
            this.showNotification('请先连接钱包', 'error');
            return;
        }

        const formData = new FormData(document.getElementById('publishTaskForm'));
        const taskData = {
            title: formData.get('title'),
            description: formData.get('description'),
            task_type: formData.get('task_type'),
            requirements: formData.get('requirements'),
            reward: parseFloat(formData.get('reward')),
            deadline: new Date(formData.get('deadline')).getTime() / 1000,
            publisher_address: this.currentUserAddress,
            submission_link: formData.get('submission_link')
        };

        try {
            this.showNotification('发布任务中...', 'info');
            
            const response = await fetch(`${this.apiBase}/tasks/publish`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });

            const result = await response.json();
            
            if (response.ok) {
                if (result.status === 'pending_signature') {
                    this.showNotification('请在 MetaMask 中签名发布任务', 'info');
                    await this.signAndSendPublishTransaction(result);
                } else if (result.status === 'success') {
                    this.showNotification('任务发布成功', 'success');
                    document.getElementById('publishTaskForm').reset();
                    await this.loadTasks();
                }
            } else {
                this.showNotification(`发布失败: ${result.detail || result.message}`, 'error');
            }
        } catch (error) {
            console.error('发布任务失败:', error);
            this.showNotification('发布任务失败，请检查网络连接', 'error');
        }
    }

    async signAndSendPublishTransaction(result) {
        try {
            const tx = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [result.transaction]
            });
            
            this.showNotification('交易已提交，等待确认...', 'info');
            
            // 等待交易确认
            const receipt = await this.waitForTransactionReceipt(tx);
            
            if (receipt.status === '0x1') {
                this.showNotification('任务发布成功', 'success');
                await this.loadTasks();
            } else {
                this.showNotification('交易失败', 'error');
            }
        } catch (error) {
            console.error('签名交易失败:', error);
            this.showNotification('签名交易失败', 'error');
        }
    }

    async signAndSendWinnerSelectionTransaction(result) {
        try {
            const tx = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [result.transaction]
            });
            
            this.showNotification('交易已提交，等待确认...', 'info');
            
            // 等待交易确认
            const receipt = await this.waitForTransactionReceipt(tx);
            
            if (receipt.status === '0x1') {
                this.showNotification('获胜者选择成功', 'success');
                await this.loadTasks();
            } else {
                this.showNotification('交易失败', 'error');
            }
        } catch (error) {
            console.error('签名交易失败:', error);
            this.showNotification('签名交易失败', 'error');
        }
    }

    async waitForTransactionReceipt(txHash) {
        return new Promise((resolve, reject) => {
            const checkReceipt = async () => {
                try {
                    const receipt = await window.ethereum.request({
                        method: 'eth_getTransactionReceipt',
                        params: [txHash]
                    });
                    
                    if (receipt) {
                        resolve(receipt);
                    } else {
                        setTimeout(checkReceipt, 2000);
                    }
                } catch (error) {
                    reject(error);
                }
            };
            
            checkReceipt();
        });
    }

    async claimTask(taskId) {
        if (!this.currentUserAddress) {
            this.showNotification('请先连接钱包', 'error');
            return;
        }

        try {
            this.showNotification('认领任务中...', 'info');
            
            const response = await fetch(`${this.apiBase}/tasks/${taskId}/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_address: this.currentUserAddress
                })
            });

            const result = await response.json();
            
            if (response.ok) {
                this.showNotification('任务认领成功', 'success');
                await this.loadTasks();
            } else {
                this.showNotification(`认领失败: ${result.detail || result.message}`, 'error');
            }
        } catch (error) {
            console.error('认领任务失败:', error);
            this.showNotification('认领任务失败，请检查网络连接', 'error');
        }
    }

    async startAutoWork() {
        if (!this.currentUserAddress) {
            this.showNotification('请先连接钱包', 'error');
            return;
        }

        try {
            this.isAutoWorkMode = true;
            this.pendingExecutionSignatures = [];
            this.pendingSubmissions = [];
            
            document.getElementById('startAgentBtn').disabled = true;
            document.getElementById('stopAgentBtn').disabled = false;
            document.getElementById('agentStatus').textContent = '运行中';
            document.getElementById('agentStatus').className = 'status-indicator running';
            
            this.showNotification('AI Agent 已启动', 'success');
            this.addAgentLog('AI Agent 已启动，开始扫描任务...');
            
            // 开始工作循环
            this.executeAutoWorkCycle();
            
        } catch (error) {
            console.error('启动AI Agent失败:', error);
            this.showNotification('启动AI Agent失败', 'error');
        }
    }

    async stopAutoWork() {
        this.isAutoWorkMode = false;
        
        document.getElementById('startAgentBtn').disabled = false;
        document.getElementById('stopAgentBtn').disabled = true;
        document.getElementById('agentStatus').textContent = '已停止';
        document.getElementById('agentStatus').className = 'status-indicator stopped';
        
        this.showNotification('AI Agent 已停止', 'info');
        this.addAgentLog('AI Agent 已停止');
        
        // 处理待提交的任务
        if (this.pendingSubmissions.length > 0) {
            this.showNotification(`处理 ${this.pendingSubmissions.length} 个待提交任务...`, 'info');
            await this.processPendingSubmissions();
        }
    }

    async processPendingSubmissions() {
        if (!this.currentUserAddress) {
            this.showNotification('请先连接钱包', 'error');
            return;
        }

        for (const submission of this.pendingSubmissions) {
            try {
                console.log('处理待提交任务:', submission);
                
                const response = await fetch(`${this.apiBase}/agent/work/submit-execution`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        task_id: submission.taskId,
                        executor_address: submission.executor || this.currentUserAddress,
                        result: submission.result,
                        gas_limit: submission.gasLimit,
                        gas_price: submission.gasPrice
                    })
                });

                const result = await response.json();
                console.log('提交执行结果API返回:', result);
                
                if (response.ok && result.status === 'pending_signature' && result.pending_signature) {
                    console.log('需要MetaMask签名提交执行结果:', result.pending_signature);
                    await this.signAndSendExecutionTransaction(result.pending_signature);
                } else if (response.ok) {
                    this.showNotification('执行结果提交成功', 'success');
                } else {
                    console.error('提交执行结果失败:', result);
                }
                
            } catch (error) {
                console.error('处理待提交任务失败:', error);
            }
        }
        
        this.pendingSubmissions = [];
    }

    async signAndSendExecutionTransaction(pendingSignature) {
        try {
            console.log('签名执行交易:', pendingSignature);
            
            // 检查MetaMask连接
            if (!window.ethereum) {
                throw new Error('MetaMask未安装');
            }
            
            // 获取账户
            let accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length === 0) {
                accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            }
            
            if (accounts.length === 0) {
                throw new Error('未连接MetaMask账户');
            }
            
            console.log('当前账户:', accounts[0]);
            
            // 发送交易
            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [pendingSignature.transaction]
            });
            
            console.log('执行交易已提交:', txHash);
            this.showNotification('执行结果已提交到区块链', 'success');
            
        } catch (error) {
            console.error('签名执行交易失败:', error);
            this.showNotification('提交执行结果失败', 'error');
        }
    }

    async executeAutoWorkCycle() {
        if (!this.isAutoWorkMode) return;
        
        try {
            const response = await fetch(`${this.apiBase}/agent/work/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    claimed_task_ids: [],
                    execution_order: 'ai',
                    completed_task_ids: [],
                    is_manual_execution: false,
                    executor_address: this.currentUserAddress,
                    gas_limit: 200000,
                    gas_price: 20000000000
                })
            });

            const result = await response.json();
            
            if (result.execution_completed && result.pending_submission) {
                console.log('任务执行完成，添加到待提交队列:', result.pending_submission);
                this.pendingSubmissions.push(result.pending_submission);
                this.addAgentLog(`任务执行完成: ${result.pending_submission.taskId}`);
            }
            
            // 继续下一个循环
            setTimeout(() => this.executeAutoWorkCycle(), 5000);
            
        } catch (error) {
            console.error('执行工作周期失败:', error);
            this.addAgentLog(`执行失败: ${error.message}`);
            setTimeout(() => this.executeAutoWorkCycle(), 10000);
        }
    }

    async syncAgentWork() {
        try {
            this.showNotification('同步AI Agent工作...', 'info');
            
            const response = await fetch(`${this.apiBase}/agent/work/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    claimed_task_ids: [],
                    execution_order: 'ai',
                    completed_task_ids: [],
                    is_manual_execution: true,
                    executor_address: this.currentUserAddress,
                    gas_limit: 200000,
                    gas_price: 20000000000
                })
            });

            const result = await response.json();
            this.showNotification('同步完成', 'success');
            this.addAgentLog('手动同步完成');
            
        } catch (error) {
            console.error('同步AI Agent工作失败:', error);
            this.showNotification('同步失败', 'error');
        }
    }

    addAgentLog(message) {
        const logsContainer = document.getElementById('agentLogs');
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `<span class="log-time">[${timestamp}]</span> <span class="log-message">${message}</span>`;
        
        logsContainer.appendChild(logEntry);
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    async loadStats() {
        try {
            const response = await fetch(`${this.apiBase}/worker/stats`);
            const stats = await response.json();
            
            document.getElementById('totalTasks').textContent = stats.total_tasks || 0;
            document.getElementById('activeWorkers').textContent = stats.active_workers || 0;
            document.getElementById('completedTasks').textContent = '-';
            document.getElementById('totalRewards').textContent = '-';
            
        } catch (error) {
            console.error('加载统计信息失败:', error);
        }
    }

    closeModal() {
        document.getElementById('taskModal').style.display = 'none';
        document.getElementById('paymentModal').style.display = 'none';
    }

    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        notifications.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.flowAIApp = new FlowAIApp();
});
