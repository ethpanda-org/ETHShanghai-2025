"use client";

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Check, ClipboardCopy, X, ExternalLink, CheckCircle } from "lucide-react";
import { useAccount, useConnect, useDisconnect, useWalletClient } from "wagmi";
import { baseSepolia, polygonAmoy, sepolia } from "wagmi/chains";
import { CodeHighlighter } from "@/components/ui/code-highlighter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Address } from "viem";

const CHAINS = [
  { id: sepolia.id, label: "Ethereum Sepolia" },
  { id: baseSepolia.id, label: "BSC Testnet" },
  { id: polygonAmoy.id, label: "Avalanche Fuji" },
];

const RISK_PROVIDERS = [
  { id: "chainalysis", label: "Chainalysis + Chainlink" },
  { id: "elliptic", label: "Elliptic + Chainlink" },
  { id: "trm", label: "TRM Labs + Chainlink" },
  { id: "manual", label: "Manual Whitelist Only" },
];

const UWA_TEMPLATE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "./ChainlinkRisk.sol";

/// @notice ERC-7943 接口，即 uRWA。
interface IERC7943 /*is IERC165*/ {
    /// @notice 当代币从一个地址转移到另一个地址时发出。
    event ForcedTransfer(address indexed from, address indexed to, uint256 tokenId, uint256 amount);

    /// @notice 当调用 \`setFrozen\` 时发出，改变 \`user\` 的 \`tokenId\` 代币的冻结 \`amount\`。
    event Frozen(address indexed user, uint256 indexed tokenId, uint256 amount);

    /// @notice 当用户不允许交互时回滚的错误。
    error ERC7943NotAllowedUser(address account);

    /// @notice 当由于现有限制而不允许转账时回滚的错误。
    error ERC7943NotAllowedTransfer(address from, address to, uint256 tokenId, uint256 amount);

    /// @notice 当尝试从 \`user\` 转移 \`tokenId\` 的 \`amount\` 小于或等于其余额但大于其未冻结余额时回滚的错误。
    error ERC7943InsufficientUnfrozenBalance(address user, uint256 tokenId, uint256 amount, uint256 unfrozen);

    /// @notice 将代币从一个地址转移到另一个地址。
    function forceTransfer(address from, address to, uint256 tokenId, uint256 amount) external;

    /// @notice 更改属于 \`user\` 的 \`tokenId\` 代币的 \`amount\` 的冻结状态。
    function setFrozen(address user, uint256 tokenId, uint256 amount) external;

    /// @notice 检查特定 \`tokenId\` 的冻结状态/数量。
    function getFrozen(address user, uint256 tokenId) external view returns (uint256 amount);

    /// @notice 检查根据代币规则当前是否可以进行转账。
    function isTransferAllowed(address from, address to, uint256 tokenId, uint256 amount) external view returns (bool allowed);

    /// @notice 检查是否允许特定用户根据代币规则进行交互。
    function isUserAllowed(address user) external view returns (bool allowed);
}

/// @title uRWA - 统一现实世界资产代币 (集成 Chainlink 风险评估)
/// @notice 实现 ERC-20 和 ERC-7943 标准的合规代币合约，集成 Chainlink 预言机进行实时风险评估
/// @dev 支持白名单、冻结机制、强制转账功能和 Chainlink 链下数据验证
contract {{CONTRACT_NAME}} is Context, ERC20, Ownable, IERC7943 {
    mapping(address user => bool whitelisted) public isWhitelisted;
    mapping(address user => uint256 amount) internal _frozenTokens;

    // Chainlink 风险评估合约
    ChainlinkRisk public immutable riskAssessment;

    // 风险评估模式开关
    bool public enableRiskAssessment = {{ENABLE_RISK_ASSESSMENT}};

    // 传统白名单模式开关 (向后兼容)
    bool public enableWhitelist = {{ENABLE_WHITELIST}};

    event Whitelisted(address indexed account, bool status);
    event RiskAssessmentModeToggled(bool enabled);
    event WhitelistModeToggled(bool enabled);
    error NotZeroAddress();
    error InsufficientRole(address caller, string role);
    error RiskAssessmentRequired(address user, string reason);
    error WhitelistRequired(address user);

    /// @notice 构造函数 - 无参数，所有配置硬编码
    constructor() ERC20("{{TOKEN_NAME}}", "{{TOKEN_SYMBOL}}") Ownable({{OWNER_ADDRESS}}) {
        if ({{RISK_ASSESSMENT_ADDRESS}} == address(0)) {
            revert NotZeroAddress();
        }

        riskAssessment = ChainlinkRisk({{RISK_ASSESSMENT_ADDRESS}});

        // 将部署者设置为初始管理员，并自动加入白名单
        isWhitelisted[{{OWNER_ADDRESS}}] = true;
        emit Whitelisted({{OWNER_ADDRESS}}, true);

        // 铸造初始供应量给部署者
        _mint({{OWNER_ADDRESS}}, {{INITIAL_SUPPLY}} * (10 ** {{DECIMALS}}));
    }

    // ========== 管理员功能 ==========

    /// @notice 切换风险评估模式
    /// @param enabled 是否启用风险评估
    function toggleRiskAssessment(bool enabled) external onlyOwner {
        enableRiskAssessment = enabled;
        emit RiskAssessmentModeToggled(enabled);
    }

    /// @notice 切换白名单模式
    /// @param enabled 是否启用白名单
    function toggleWhitelist(bool enabled) external onlyOwner {
        enableWhitelist = enabled;
        emit WhitelistModeToggled(enabled);
    }

    /// @notice 更改用户白名单状态
    /// @param account 用户地址
    /// @param status 白名单状态
    function changeWhitelist(address account, bool status) external onlyOwner {
        require(account != address(0), NotZeroAddress());
        isWhitelisted[account] = status;
        emit Whitelisted(account, status);
    }

    // ========== 风险评估查询 ==========

    /// @notice 检查用户是否被允许交互 (集成风险评估)
    /// @param user 用户地址
    /// @return allowed 是否允许用户交互
    function isUserAllowed(address user) public virtual view returns (bool allowed) {
        // 如果启用了风险评估，优先使用风险评估
        if (enableRiskAssessment) {
            try riskAssessment.isUserAllowed(user) returns (bool riskAllowed, string memory) {
                allowed = riskAllowed;
            } catch {
                // 风险评估合约调用失败，回退到白名单模式
                if (enableWhitelist) {
                    allowed = isWhitelisted[user];
                } else {
                    allowed = true; // 默认允许
                }
            }
        } else if (enableWhitelist) {
            // 仅使用白名单模式
            allowed = isWhitelisted[user];
        } else {
            // 两种模式都禁用，默认允许所有用户
            allowed = true;
        }
    }

    /// @notice 检查转账是否被允许 (集成风险评估)
    /// @param from 发送方地址
    /// @param to 接收方地址
    /// @param amount 转账金额
    /// @return allowed 是否允许转账
    function isTransferAllowed(address from, address to, uint256, uint256 amount) public virtual view returns (bool allowed) {
        // 检查冻结余额
        if (amount > balanceOf(from) - _frozenTokens[from]) {
            return false;
        }

        // 检查用户权限
        if (!isUserAllowed(from) || !isUserAllowed(to)) {
            return false;
        }

        // 如果启用了风险评估，进行更详细的检查
        if (enableRiskAssessment) {
            try riskAssessment.isTransferAllowed(from, to, amount) returns (bool riskAllowed, string memory) {
                allowed = riskAllowed;
            } catch {
                // 风险评估合约调用失败，使用基本检查结果
                // allowed 已经通过前面的基本检查
            }
        }
    }

    // ========== 标准代币功能 ==========

    /// @notice 铸造代币到指定地址
    /// @param to 接收代币的地址
    /// @param amount 要铸造的数量
    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), NotZeroAddress());

        if (!isUserAllowed(to)) {
            if (enableRiskAssessment) {
                try riskAssessment.isUserAllowed(to) returns (bool allowed, string memory reason) {
                    if (!allowed) {
                        revert RiskAssessmentRequired(to, reason);
                    }
                } catch {
                    // 风险评估调用失败，检查白名单
                    if (enableWhitelist && !isWhitelisted[to]) {
                        revert WhitelistRequired(to);
                    }
                }
            } else if (enableWhitelist && !isWhitelisted[to]) {
                revert WhitelistRequired(to);
            }
        }

        _mint(to, amount);
    }

    /// @notice 设置用户的冻结代币数量
    /// @param user 用户地址
    /// @param amount 要冻结的数量
    function setFrozen(address user, uint256, uint256 amount) external onlyOwner {
        require(amount <= balanceOf(user), IERC20Errors.ERC20InsufficientBalance(user, balanceOf(user), amount));
        _frozenTokens[user] = amount;
        emit Frozen(user, 0, amount);
    }

    /// @notice 强制转账
    /// @param from 发送方地址
    /// @param to 接收方地址
    /// @param amount 转账金额
    function forceTransfer(address from, address to, uint256, uint256 amount) external onlyOwner {
        if (!isUserAllowed(to)) {
            if (enableRiskAssessment) {
                try riskAssessment.isUserAllowed(to) returns (bool allowed, string memory reason) {
                    if (!allowed) {
                        revert RiskAssessmentRequired(to, reason);
                    }
                } catch {
                    if (enableWhitelist && !isWhitelisted[to]) {
                        revert WhitelistRequired(to);
                    }
                }
            } else if (enableWhitelist && !isWhitelisted[to]) {
                revert WhitelistRequired(to);
            }
        }

        _excessFrozenUpdate(from, amount);
        super._update(from, to, amount);
        emit ForcedTransfer(from, to, 0, amount);
    }

    /// @notice 更新过剩的冻结代币数量（内部函数）
    /// @param user 用户地址
    /// @param amount 转账金额
    function _excessFrozenUpdate(address user, uint256 amount) internal {
        uint256 unfrozenBalance = balanceOf(user) - _frozenTokens[user];
        if(amount > unfrozenBalance && amount <= balanceOf(user)) {
            // Protect from underflow: if amount > balanceOf(user) the call will revert in super._update with insufficient balance error
            // 防止下溢：如果 amount > balanceOf(user)，则调用将在 super._update 中回滚，并出现余额不足错误
            _frozenTokens[user] -= amount - unfrozenBalance; // Reduce by excess amount
            // 减少过剩数量
            emit Frozen(user, 0, _frozenTokens[user]);
        }
    }

    /// @notice 更新代币余额（重写ERC20的_update函数，集成风险评估）
    /// @param from 发送方地址
    /// @param to 接收方地址
    /// @param amount 转账金额
    function _update(address from, address to, uint256 amount) internal virtual override {
        if (from != address(0) && to != address(0)) { // Transfer
            // 转账
            require(amount <= balanceOf(from), IERC20Errors.ERC20InsufficientBalance(from, balanceOf(from), amount));
            require(amount <= balanceOf(from) - _frozenTokens[from], ERC7943InsufficientUnfrozenBalance(from, 0, amount, balanceOf(from) - _frozenTokens[from]));
            require(isTransferAllowed(from, to, 0, amount), ERC7943NotAllowedTransfer(from, to, 0, amount));
        } else if (from == address(0)) { // Mint
            // 铸造
            if (!isUserAllowed(to)) {
                if (enableRiskAssessment) {
                    try riskAssessment.isUserAllowed(to) returns (bool allowed, string memory reason) {
                        if (!allowed) {
                            revert RiskAssessmentRequired(to, reason);
                        }
                    } catch {
                        if (enableWhitelist && !isWhitelisted[to]) {
                            revert WhitelistRequired(to);
                        }
                    }
                } else if (enableWhitelist && !isWhitelisted[to]) {
                    revert WhitelistRequired(to);
                }
            }
        } else { // Burn
            // 销毁
            _excessFrozenUpdate(from, amount);
        }

        super._update(from, to, amount);
    }

    // ========== 查询功能 ==========

    /// @notice 获取用户的冻结代币数量
    /// @param user 用户地址
    /// @return amount 冻结的代币数量
    function getFrozen(address user, uint256) external view returns (uint256 amount) {
        amount = _frozenTokens[user];
    }

    /// @notice 检查是否支持特定接口
    /// @param interfaceId 接口ID
    /// @return true 如果支持接口，否则 false
    function supportsInterface(bytes4 interfaceId) public view virtual returns (bool) {
        return interfaceId == type(IERC7943).interfaceId ||
            interfaceId == type(IERC20).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }
}`;

type DeploymentStatus = "idle" | "preparing" | "submitting" | "success" | "error";

export function ContractGenerator() {
  const [mounted, setMounted] = useState(false);
  const [tokenName, setTokenName] = useState("XAU Gold Token");
  const [symbol, setSymbol] = useState("XAU");
  const [initialSupply, setInitialSupply] = useState(1_000_000);
  const [decimals, setDecimals] = useState(18);
  const [ownerAddress, setOwnerAddress] = useState("0x1F0fb44Ae473FC4D986d61a3bFb9e4e5A9EBA828");
  const [riskAssessmentAddress, setRiskAssessmentAddress] = useState("0x6bf75A484710E1bF3bC4152752c71DDF987a1b2B");
  const [enableRiskAssessment, setEnableRiskAssessment] = useState(true);
  const [enableWhitelist, setEnableWhitelist] = useState(false);
  const [defaultWhitelisted, setDefaultWhitelisted] = useState("0x1F0fb44Ae473FC4D986d61a3bFb9e4e5A9EBA828");
  const [selectedChain, setSelectedChain] = useState<number>(CHAINS[0]?.id ?? sepolia.id);
  const [selectedRiskProvider, setSelectedRiskProvider] = useState(RISK_PROVIDERS[0]?.id ?? "chainalysis");
  const [copiedCode, setCopiedCode] = useState(false);
  const [status, setStatus] = useState<DeploymentStatus>("idle");
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [deploymentOutput, setDeploymentOutput] = useState<string>("");
  const [deploymentOutputOpen, setDeploymentOutputOpen] = useState(false);
  const [highlightedSections, setHighlightedSections] = useState<string[]>([]);
  const [flashSection, setFlashSection] = useState<string | null>(null);
  const codeContainerRef = useRef<HTMLDivElement>(null);

  const { address, isConnected } = useAccount();
  const { connect, connectors, error: connectError, isLoading: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();

  // Fix hydration error by ensuring component only renders on client
  useEffect(() => {
    setMounted(true);
  }, []);

  const contractSource = useMemo(() => {
    return UWA_TEMPLATE
      .replace(/{{CONTRACT_NAME}}/g, `${symbol}_uRWA_Token`)
      .replace(/{{TOKEN_NAME}}/g, `"${tokenName}"`)
      .replace(/{{TOKEN_SYMBOL}}/g, `"${symbol}"`)
      .replace(/{{OWNER_ADDRESS}}/g, ownerAddress)
      .replace(/{{RISK_ASSESSMENT_ADDRESS}}/g, riskAssessmentAddress)
      .replace(/{{DECIMALS}}/g, decimals.toString())
      .replace(/{{INITIAL_SUPPLY}}/g, initialSupply.toString())
      .replace(/{{ENABLE_RISK_ASSESSMENT}}/g, enableRiskAssessment.toString())
      .replace(/{{ENABLE_WHITELIST}}/g, enableWhitelist.toString())
      .replace(/400">/g, '>')
      .replace(/\d+">/g, '>'); // Remove all "number"> patterns
  }, [symbol, tokenName, decimals, initialSupply, ownerAddress, riskAssessmentAddress, enableRiskAssessment, enableWhitelist]);

  // Function to trigger highlight when parameter changes
  const highlightChange = useCallback((section: string) => {
    setHighlightedSections([section]);
    setFlashSection(section);

    // Clear highlight after 3 seconds
    setTimeout(() => setHighlightedSections([]), 3000);

    // Clear flash after 2 seconds (shorter duration)
    setTimeout(() => setFlashSection(null), 2000);
  }, []);

  // Function to scroll highlighted section into view
  const scrollToHighlightedSection = useCallback(() => {
    if (codeContainerRef.current && flashSection) {
      const highlightedElements = codeContainerRef.current.querySelectorAll('.flash-highlight');
      if (highlightedElements.length > 0) {
        const element = highlightedElements[0] as HTMLElement;
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center'
        });
      }
    }
  }, [flashSection]);

  // Auto-scroll when flash section changes
  useEffect(() => {
    if (flashSection) {
      const timer = setTimeout(() => {
        scrollToHighlightedSection();
      }, 100); // Small delay to ensure DOM is updated
      return () => clearTimeout(timer);
    }
  }, [flashSection, scrollToHighlightedSection]);

  // Auto-configure risk assessment when provider changes
  useEffect(() => {
    if (selectedRiskProvider === "manual") {
      setEnableRiskAssessment(false);
      setEnableWhitelist(true);
      setRiskAssessmentAddress("0x0000000000000000000000000000000000000000");
    } else {
      setEnableRiskAssessment(true);
      setRiskAssessmentAddress("0x6bf75A484710E1bF3bC4152752c71DDF987a1b2B");
    }
  }, [selectedRiskProvider]);

  // Track parameter changes and trigger highlights
  useEffect(() => {
    highlightChange("contract {{CONTRACT_NAME}} is");
  }, [symbol, highlightChange]);

  useEffect(() => {
    highlightChange(`ERC20("${tokenName}"`);
  }, [tokenName, highlightChange]);

  useEffect(() => {
    highlightChange(`"${symbol}"`);
  }, [symbol, highlightChange]);

  useEffect(() => {
    highlightChange(`Ownable(${ownerAddress})`);
  }, [ownerAddress, highlightChange]);

  useEffect(() => {
    highlightChange(`riskAssessment = ChainlinkRisk(${riskAssessmentAddress})`);
  }, [riskAssessmentAddress, highlightChange]);

  useEffect(() => {
    highlightChange(`(10 ** ${decimals})`);
  }, [decimals, highlightChange]);

  useEffect(() => {
    highlightChange(`${initialSupply} * (10 ** ${decimals})`);
  }, [initialSupply, decimals, highlightChange]);

  useEffect(() => {
    highlightChange(`bool public enableRiskAssessment = ${enableRiskAssessment}`);
  }, [enableRiskAssessment, highlightChange]);

  useEffect(() => {
    highlightChange(`bool public enableWhitelist = ${enableWhitelist}`);
  }, [enableWhitelist, highlightChange]);

  const handleCopy = useCallback(async (value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }, []);

  const deployContract = useCallback(async () => {
    try {
      setStatus("preparing");
      setDeploymentOutput(""); // Clear previous output
      setDeploymentOutputOpen(true); // Open the output dialog

      // Prepare deployment parameters
      const deploymentParams = {
        tokenName,
        symbol,
        ownerAddress: address ?? ownerAddress,
        riskAssessmentAddress,
        chain: selectedChain
      };

      console.log("Deploying uRWA contract with parameters:", deploymentParams);

      setStatus("submitting");

      // Call the deployment API with Server-Sent Events
      const response = await fetch('/api/contract/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deploymentParams),
      });

      if (!response.body) {
        throw new Error("Response body is null");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let fullOutput = "";
      let transactionHash: string | undefined = undefined;
      let contractAddress: string | undefined = undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'output' || data.type === 'error') {
                fullOutput += data.output;
                setDeploymentOutput(prev => prev + data.output);
              } else if (data.type === 'success') {
                transactionHash = data.transactionHash;
                contractAddress = data.contractAddress;
                fullOutput = data.output;
                setDeploymentOutput(data.output);
              }
            } catch (e) {
              // 如果不是JSON格式，直接添加到输出
              setDeploymentOutput(prev => prev + line + '\n');
            }
          }
        }
      }

      // Deployment completed
      if (transactionHash && contractAddress) {
        setStatus("success");
        setTransactionHash(transactionHash);
        setContractAddress(contractAddress);
      } else {
        setStatus("error");
        setDeploymentOutput(prev => prev + "\nDeployment failed or incomplete.");
      }
    } catch (error: any) {
      console.error("Deployment failed:", error);
      setStatus("error");
      setDeploymentOutput(prev => prev + `\nDeployment failed: ${error.message || "Unknown error"}`);
    }
  }, [
    tokenName,
    symbol,
    address,
    ownerAddress,
    riskAssessmentAddress,
    selectedChain
  ]);

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-2xl h-[calc(100vh-120px)]">
      <div className="flex flex-col lg:flex-row h-full">
        <aside className="w-full border-b border-border/60 bg-card/95 px-4 py-4 backdrop-blur lg:w-[34%] lg:border-b-0 lg:border-r lg:px-4 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Contract configuration</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Configure RWA token parameters before generating smart contract code.
              </p>
            </div>
            <div className="space-y-3">
              {/* Network and Risk Provider moved to top */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Select Network</Label>
                  <select
                    value={selectedChain}
                    onChange={(event) => setSelectedChain(Number(event.target.value))}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                  >
                    {CHAINS.map((chain) => (
                      <option key={chain.id} value={chain.id}>
                        {chain.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Risk Provider</Label>
                  <select
                    value={selectedRiskProvider}
                    onChange={(event) => setSelectedRiskProvider(event.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs"
                  >
                    {RISK_PROVIDERS.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-border/20 pt-2">
                <div className="grid gap-2">
                  {/* Basic Token Configuration */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">🪙 Token Configuration</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="tokenName" className="text-xs">Token Name</Label>
                        <Input
                          id="tokenName"
                          value={tokenName}
                          placeholder="e.g. XAU Gold Token"
                          onChange={(event) => setTokenName(event.target.value)}
                          className="rounded-lg border-border bg-background h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="symbol" className="text-xs">Symbol</Label>
                        <Input
                          id="symbol"
                          value={symbol}
                          placeholder="e.g. XAU"
                          onChange={(event) => setSymbol(event.target.value)}
                          className="rounded-lg border-border bg-background h-7 text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="initialSupply" className="text-xs">Initial Supply</Label>
                        <Input
                          id="initialSupply"
                          type="number"
                          value={initialSupply}
                          min={1}
                          onChange={(event) => setInitialSupply(Number(event.target.value))}
                          className="rounded-lg border-border bg-background h-7 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="decimals" className="text-xs">Decimals</Label>
                        <Input
                          id="decimals"
                          type="number"
                          value={decimals}
                          min={0}
                          max={18}
                          onChange={(event) => setDecimals(Number(event.target.value))}
                          className="rounded-lg border-border bg-background h-7 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Risk Assessment Configuration */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">🛡️ Risk Assessment</div>
                    <div className="space-y-1">
                      <Label htmlFor="riskAssessmentAddress" className="text-xs">Chainlink Risk Contract</Label>
                      <Input
                        id="riskAssessmentAddress"
                        value={riskAssessmentAddress}
                        placeholder="0x..."
                        onChange={(event) => setRiskAssessmentAddress(event.target.value)}
                        className="rounded-lg border-border bg-background font-mono text-xs h-7"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="enableRiskAssessment"
                            checked={enableRiskAssessment}
                            onChange={(event) => setEnableRiskAssessment(event.target.checked)}
                            className="rounded border-border"
                          />
                          <Label htmlFor="enableRiskAssessment" className="text-xs">Enable Risk Assessment</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="enableWhitelist"
                            checked={enableWhitelist}
                            onChange={(event) => setEnableWhitelist(event.target.checked)}
                            className="rounded border-border"
                          />
                          <Label htmlFor="enableWhitelist" className="text-xs">Enable Whitelist</Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Administrator Configuration */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">👤 Administrator</div>
                    <div className="space-y-1">
                      <Label htmlFor="ownerAddress" className="text-xs">Owner Address</Label>
                      <Input
                        id="ownerAddress"
                        value={ownerAddress}
                        placeholder="0x..."
                        onChange={(event) => setOwnerAddress(event.target.value)}
                        className="rounded-lg border-border bg-background font-mono text-xs h-7"
                      />
                    </div>
                  </div>

                  {/* Whitelist Configuration */}
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">📋 Whitelist Settings</div>
                    <div className="space-y-1">
                      <Label htmlFor="defaultWhitelisted" className="text-xs">Default Whitelisted Addresses</Label>
                      <Textarea
                        id="defaultWhitelisted"
                        value={defaultWhitelisted}
                        placeholder="0x..., 0x..., 0x..."
                        onChange={(event) => setDefaultWhitelisted(event.target.value)}
                        className="min-h-[40px] rounded-lg border-border bg-background font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
        
        <section className="flex-1 bg-gradient-to-b from-muted/30 via-background to-background px-4 py-4 lg:px-6 flex flex-col min-h-0">
          <div className="rounded-3xl border border-border/60 bg-card/95 shadow-xl flex-1 flex flex-col min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-6 py-3">
              <div>
                <h4 className="text-base font-semibold text-foreground">uRWA Contract - Real-time Generated</h4>
                <p className="text-sm text-muted-foreground">
                  ERC-7943 compliant RWA token with Chainlink risk assessment integration.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => handleCopy(contractSource)}
              >
                {copiedCode ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <ClipboardCopy className="mr-2 h-4 w-4" />
                    Copy code
                  </>
                )}
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full px-4 py-3" ref={codeContainerRef}>
                <CodeHighlighter
                  code={contractSource}
                  highlightedSections={highlightedSections}
                  flashSection={flashSection}
                  className="text-foreground/90 text-xs font-mono"
                />
              </ScrollArea>
            </div>
            <div className="border-t border-border/60 px-6 py-3">
              <Button
                type="button"
                className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={deployContract}
                disabled={status === "submitting" || status === "preparing"}
              >
                {status === "preparing" ? "Preparing..." : 
                 status === "submitting" ? "Deploying..." : 
                 status === "success" ? "Deploy Another Contract" :
                 status === "error" ? "Retry Deployment" :
                 "Deploy Contract"}
              </Button>
              {transactionHash && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Deployment submitted: <span className="font-mono">{transactionHash}</span>
                </p>
              )}
              {status === "error" && (
                <p className="mt-2 text-xs text-destructive">
                  Deployment failed. Please check your configuration and try again.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Deployment Output Dialog */}
        <Dialog open={deploymentOutputOpen} onOpenChange={setDeploymentOutputOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <DialogHeader className="flex-1">
                <DialogTitle className="text-lg font-semibold text-foreground">
                  {status === "success" ? "Contract Deployed Successfully!" : "Contract Deployment in Progress"}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {status === "success"
                    ? "Your uRWA contract has been deployed to the blockchain."
                    : "Please wait while your contract is being deployed..."}
                </DialogDescription>
              </DialogHeader>
              <button
                onClick={() => setDeploymentOutputOpen(false)}
                className="rounded-full p-2 hover:bg-muted transition-colors"
                disabled={status === "submitting"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-hidden flex flex-col">
              <div className="rounded-lg border bg-muted/50 p-4 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {status === "success" ? "Deployment Results" : "Deployment Output"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {status === "submitting" ? "Deploying..." : status === "success" ? "Success" : status === "error" ? "Failed" : "Preparing..."}
                  </span>
                </div>
                <ScrollArea className="flex-1 font-mono text-xs text-foreground break-all max-h-96">
                  <pre className="whitespace-pre-wrap p-2">{deploymentOutput || "Waiting for deployment to start..."}</pre>
                </ScrollArea>
              </div>
            </div>

            {/* 显示部署成功后的结果信息 */}
            {status === "success" && (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Transaction Hash</span>
                      <span className="text-xs text-muted-foreground">Sepolia Testnet</span>
                    </div>
                    <div className="font-mono text-xs text-foreground break-all">
                      {transactionHash}
                    </div>
                  </div>
                </div>

                {contractAddress && (
                  <div className="rounded-lg border bg-muted/50 p-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Contract Address</span>
                        <span className="text-xs text-muted-foreground">Sepolia Testnet</span>
                      </div>
                      <div className="font-mono text-xs text-foreground break-all">
                        {contractAddress}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      // Open blockchain explorer
                      const explorerUrl = `https://sepolia.etherscan.io/tx/${transactionHash}`;
                      window.open(explorerUrl, '_blank');
                    }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View on Explorer
                  </Button>
                  <Button
                    onClick={() => {
                      // 关闭对话框并重置状态以允许重新部署
                      setDeploymentOutputOpen(false);
                      setStatus("idle");
                    }}
                    className="flex-1"
                  >
                    Deploy Another
                  </Button>
                </div>
              </div>
            )}

            {/* 只在成功状态显示部署另一个按钮，其他状态显示关闭按钮 */}
            {status === "success" ? null : (
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={() => setDeploymentOutputOpen(false)}
                  disabled={status === "submitting"}
                  className="flex-1"
                >
                  {status === "submitting" ? "Deploying..." : "Close"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}