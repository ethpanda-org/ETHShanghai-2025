import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseUnits, formatUnits, keccak256, toHex } from "viem";

describe("PonyProtocol", async function () {
  const { viem } = await network.connect();
  const testClient = await viem.getTestClient();
  const publicClient = await viem.getPublicClient();

  // Deploy contracts
  const usdc = await viem.deployContract("MockERC20", ["USD Coin", "USDC", 6]);
  const rewardToken = await viem.deployContract("MockERC20", ["Reward Token", "REWARD", 18]);
  const ctf = await viem.deployContract("MockCTF", [usdc.address, parseUnits("1000000", 6)]);
  const staking = await viem.deployContract("StakingBribe", [ctf.address, usdc.address]);
  const bribeManager = await viem.deployContract("BribeManager", [staking.address]);
  const pony = await viem.deployContract("PonyProtocol", [ctf.address, staking.address, bribeManager.address]);

  const [deployer, alice, bob, sponsor] = await viem.getWalletClients();

  // Mint USDC
  await usdc.write.mint([alice.account.address, parseUnits("100000", 6)]);
  await usdc.write.mint([bob.account.address, parseUnits("100000", 6)]);
  await usdc.write.mint([sponsor.account.address, parseUnits("100000", 6)]);

  // Mint reward tokens
  await rewardToken.write.mint([sponsor.account.address, parseUnits("50000", 18)]);

  // Helper to create market
  async function createMarket(name: string) {
    const currentBlock = await publicClient.getBlock();
    const marketDuration = 365n * 24n * 60n * 60n; // 1 year
    const startTime = 0n;
    const endTime = currentBlock.timestamp + marketDuration;
    const questionId = keccak256(toHex(name));
    await ctf.write.prepareCondition([deployer.account.address, questionId, 2n, parseUnits("0.5", 18), startTime, endTime]);
    const conditionId = await ctf.read.getConditionId([deployer.account.address, questionId, 2n]);
    return { conditionId, questionId, endTime, marketDuration };
  }

  it("Should deposit CTF tokens and mint pony tokens", async function () {
    const { conditionId, endTime } = await createMarket("Pony Test 1");

    // Alice buys YES tokens
    await usdc.write.approve([ctf.address, parseUnits("1000", 6)], { account: alice.account });
    await ctf.write.splitPosition([conditionId, parseUnits("500", 6)], { account: alice.account });

    const depositAmount = parseUnits("100", 6);

    // Approve Pony to spend CTF tokens
    await ctf.write.setApprovalForAll([pony.address, true], { account: alice.account });

    // Deposit to Pony (Pony will handle StakingBribe approval internally)
    await pony.write.deposit([conditionId, 1, depositAmount], { account: alice.account });

    // Check pony token balance
    const tokenId = await pony.read.getTokenId([conditionId, 1]);
    const balance = await pony.read.balanceOf([alice.account.address, tokenId]);

    assert.equal(balance, depositAmount, "Should have pony tokens equal to deposit");

    // Check position info (viem returns structs as arrays)
    const position = await pony.read.positions([tokenId]);
    assert.equal(position[0], conditionId); // conditionId
    assert.equal(position[1], 1); // outcome
    assert.equal(position[2], depositAmount); // totalDeposited
    assert.equal(position[3], depositAmount); // totalPonyMinted

    console.log(`✅ Deposited ${formatUnits(depositAmount, 6)} CTF tokens`);
    console.log(`✅ Minted ${formatUnits(balance as bigint, 6)} pony tokens`);
  });

  it("Should harvest and claim bribes from StakingBribe", async function () {
    const { conditionId } = await createMarket("Pony Test 2");

    // Alice deposits
    await usdc.write.approve([ctf.address, parseUnits("1000", 6)], { account: alice.account });
    await ctf.write.splitPosition([conditionId, parseUnits("500", 6)], { account: alice.account });
    await ctf.write.setApprovalForAll([pony.address, true], { account: alice.account });

    const depositAmount = parseUnits("100", 6);
    await pony.write.deposit([conditionId, 1, depositAmount], { account: alice.account });

    // Sponsor adds bribes
    const bribeAmount = parseUnits("1000", 6);
    await usdc.write.approve([staking.address, bribeAmount], { account: sponsor.account });
    await staking.write.addBribe([conditionId, 1, bribeAmount], { account: sponsor.account });

    // Wait some time for distribution
    await testClient.increaseTime({ seconds: 60 * 60 });
    await testClient.mine({ blocks: 1 });

    // Harvest bribes to Pony
    await pony.write.harvestBribes([conditionId, 1]);

    // Check Alice's pending rewards
    const tokenId = await pony.read.getTokenId([conditionId, 1]);
    const pending = await pony.read.pendingBribeRewards([tokenId, alice.account.address]);

    console.log(`✅ Harvested bribes, Alice pending: ${formatUnits(pending as bigint, 6)} USDC`);
    assert(pending > 0n, "Should have pending rewards");
  });

  it("Should transfer pony tokens and maintain correct rewards", async function () {
    const { conditionId } = await createMarket("Pony Test 3");

    // Alice deposits
    await usdc.write.approve([ctf.address, parseUnits("1000", 6)], { account: alice.account });
    await ctf.write.splitPosition([conditionId, parseUnits("500", 6)], { account: alice.account });
    await ctf.write.setApprovalForAll([pony.address, true], { account: alice.account });

    const depositAmount = parseUnits("100", 6);
    await pony.write.deposit([conditionId, 1, depositAmount], { account: alice.account });

    const tokenId = await pony.read.getTokenId([conditionId, 1]);

    // Add bribes and harvest
    const bribeAmount = parseUnits("1000", 6);
    await usdc.write.approve([staking.address, bribeAmount], { account: sponsor.account });
    await staking.write.addBribe([conditionId, 1, bribeAmount], { account: sponsor.account });

    await testClient.increaseTime({ seconds: 60 * 60 });
    await testClient.mine({ blocks: 1 });

    await pony.write.harvestBribes([conditionId, 1]);

    // Alice transfers half to Bob
    const transferAmount = depositAmount / 2n;
    await pony.write.safeTransferFrom(
      [alice.account.address, bob.account.address, tokenId, transferAmount, "0x"],
      { account: alice.account }
    );

    // Check balances
    const aliceBalance = await pony.read.balanceOf([alice.account.address, tokenId]);
    const bobBalance = await pony.read.balanceOf([bob.account.address, tokenId]);

    assert.equal(aliceBalance, transferAmount, "Alice should have half");
    assert.equal(bobBalance, transferAmount, "Bob should have half");

    console.log(`✅ Alice transferred ${formatUnits(transferAmount, 6)} pony tokens to Bob`);
    console.log(`   Alice balance: ${formatUnits(aliceBalance as bigint, 6)}`);
    console.log(`   Bob balance: ${formatUnits(bobBalance as bigint, 6)}`);
  });

  it("Should handle multiple deposits and proportional rewards", async function () {
    const { conditionId } = await createMarket("Pony Test 4");

    // Alice deposits 100
    await usdc.write.approve([ctf.address, parseUnits("1000", 6)], { account: alice.account });
    await ctf.write.splitPosition([conditionId, parseUnits("500", 6)], { account: alice.account });
    await ctf.write.setApprovalForAll([pony.address, true], { account: alice.account });
    await pony.write.deposit([conditionId, 1, parseUnits("100", 6)], { account: alice.account });

    // Bob deposits 50
    await usdc.write.approve([ctf.address, parseUnits("1000", 6)], { account: bob.account });
    await ctf.write.splitPosition([conditionId, parseUnits("500", 6)], { account: bob.account });
    await ctf.write.setApprovalForAll([pony.address, true], { account: bob.account });
    await pony.write.deposit([conditionId, 1, parseUnits("50", 6)], { account: bob.account });

    // Add bribes
    const bribeAmount = parseUnits("1500", 6); // 150 tokens
    await usdc.write.approve([staking.address, bribeAmount], { account: sponsor.account });
    await staking.write.addBribe([conditionId, 1, bribeAmount], { account: sponsor.account });

    await testClient.increaseTime({ seconds: 60 * 60 });
    await testClient.mine({ blocks: 1 });

    // Harvest
    await pony.write.harvestBribes([conditionId, 1]);

    // Check pending rewards
    const tokenId = await pony.read.getTokenId([conditionId, 1]);
    const alicePending = await pony.read.pendingBribeRewards([tokenId, alice.account.address]);
    const bobPending = await pony.read.pendingBribeRewards([tokenId, bob.account.address]);

    console.log(`✅ Alice pending: ${formatUnits(alicePending as bigint, 6)} USDC (100/150 = 66.7%)`);
    console.log(`✅ Bob pending: ${formatUnits(bobPending as bigint, 6)} USDC (50/150 = 33.3%)`);

    // Alice should get ~2x Bob's rewards (100 vs 50 tokens)
    const ratio = Number(alicePending) / Number(bobPending);
    assert(ratio > 1.9 && ratio < 2.1, `Reward ratio should be ~2:1, got ${ratio}`);
  });
});
