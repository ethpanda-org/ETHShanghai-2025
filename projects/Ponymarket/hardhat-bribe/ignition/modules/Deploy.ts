import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DeployModule = buildModule("DeployModule", (m) => {
  // Deploy MockERC20 (USDC with 6 decimals)
  const mockUSDC = m.contract("MockERC20", ["USD Coin", "USDC", 6], { id: "MockUSDC" });

  // Deploy Mock Reward Token (18 decimals) for bribe testing
  const rewardToken = m.contract("MockERC20", ["Reward Token", "REWARD", 18], { id: "RewardToken" });

  // Deploy MockCTF with 1,000,000 USDC initial liquidity for AMM
  const initialLiquidity = 1_000_000n * 10n ** 6n; // 1M USDC (6 decimals)
  const mockCTF = m.contract("MockCTF", [mockUSDC, initialLiquidity]);

  // Deploy StakingBribe contract
  const stakingBribe = m.contract("StakingBribe", [mockCTF, mockUSDC]);

  // Deploy BribeManager contract
  const bribeManager = m.contract("BribeManager", [stakingBribe]);

  // Deploy PonyProtocol contract
  const ponyProtocol = m.contract("PonyProtocol", [mockCTF, stakingBribe, bribeManager]);

  return { mockUSDC, rewardToken, mockCTF, stakingBribe, bribeManager, ponyProtocol };
});

export default DeployModule;
