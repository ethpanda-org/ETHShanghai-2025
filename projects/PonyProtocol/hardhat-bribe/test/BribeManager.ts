import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { network } from 'hardhat';
import { parseUnits, formatUnits, keccak256, toHex } from 'viem';

describe('BribeManager', async function () {
  const { viem } = await network.connect();
  const testClient = await viem.getTestClient();
  const publicClient = await viem.getPublicClient();

  // Deploy MockERC20 (USDC)
  const usdc = await viem.deployContract('MockERC20', ['USD Coin', 'USDC', 6n]);

  // Deploy another ERC20 for bribe rewards
  const rewardToken = await viem.deployContract('MockERC20', ['Reward Token', 'REWARD', 18n]);

  // Deploy MockCTF
  const ctf = await viem.deployContract('MockCTF', [usdc.address, parseUnits('1000000', 6)]);

  // Deploy StakingBribe
  const staking = await viem.deployContract('StakingBribe', [ctf.address, usdc.address]);

  // Deploy BribeManager
  const bribeManager = await viem.deployContract('BribeManager', [staking.address]);

  const [deployer, alice, bob, sponsor] = await viem.getWalletClients();

  // Mint tokens
  await usdc.write.mint([deployer.account.address, parseUnits('100000', 6)]);
  await usdc.write.mint([alice.account.address, parseUnits('100000', 6)]);
  await usdc.write.mint([bob.account.address, parseUnits('100000', 6)]);
  await usdc.write.mint([sponsor.account.address, parseUnits('100000', 6)]);

  await rewardToken.write.mint([sponsor.account.address, parseUnits('10000', 18)]);

  async function createMarket(name: string) {
    const currentBlock = await publicClient.getBlock();
    const marketDuration = 365n * 24n * 60n * 60n; // 1 year
    const startTime = 0n;
    const endTime = currentBlock.timestamp + marketDuration;
    const questionId = keccak256(toHex(name));

    await ctf.write.prepareCondition([
      deployer.account.address,
      questionId,
      2n,
      parseUnits('0.5', 18),
      startTime,
      endTime
    ]);

    const conditionId = await ctf.read.getConditionId([deployer.account.address, questionId, 2n]);
    return { conditionId, questionId, endTime, marketDuration };
  }

  it('Should create a bribe pool with arbitrary ERC20', async () => {
    const { conditionId, endTime: marketEndTime } = await createMarket('BribeTest 1');

    // Alice stakes YES tokens first to create the pool
    await usdc.write.approve([ctf.address, parseUnits('1000', 6)], { account: alice.account });
    await ctf.write.splitPosition([conditionId, parseUnits('200', 6)], { account: alice.account });
    await ctf.write.setApprovalForAll([staking.address, true], { account: alice.account });
    await staking.write.stakePermanent([conditionId, 1, parseUnits('100', 6)], { account: alice.account });

    // Sponsor creates a bribe pool
    const currentBlock = await publicClient.getBlock();
    const bribeStartTime = currentBlock.timestamp + 3600n; // 1 hour from now
    const bribeEndTime = marketEndTime; // Use market end time as bribe end time
    const bribeAmount = parseUnits('1000', 18);

    await rewardToken.write.approve([bribeManager.address, bribeAmount], { account: sponsor.account });

    const hash = await bribeManager.write.createBribePool(
      [conditionId, 1, rewardToken.address, bribeAmount, bribeStartTime, bribeEndTime],
      { account: sponsor.account }
    );

    // Check bribe pool was created
    const bribePool = await bribeManager.read.getBribePool([0n]);
    assert.equal(bribePool.sponsor.toLowerCase(), sponsor.account.address.toLowerCase());
    assert.equal(bribePool.token.toLowerCase(), rewardToken.address.toLowerCase());
    assert.equal(bribePool.totalAmount, bribeAmount);
    assert.equal(bribePool.conditionId, conditionId);
    assert.equal(bribePool.outcome, 1);

    console.log(`Bribe pool created: ${formatUnits(bribePool.totalAmount, 18)} REWARD`);
  });

  it('Should calculate released amount using quadratic curve', async () => {
    const { conditionId, endTime: marketEndTime } = await createMarket('BribeTest 2');

    // Alice stakes
    await usdc.write.approve([ctf.address, parseUnits('1000', 6)], { account: alice.account });
    await ctf.write.splitPosition([conditionId, parseUnits('200', 6)], { account: alice.account });
    await ctf.write.setApprovalForAll([staking.address, true], { account: alice.account });
    await staking.write.stakePermanent([conditionId, 1, parseUnits('100', 6)], { account: alice.account });

    // Create bribe pool
    const currentBlock = await publicClient.getBlock();
    const bribeStartTime = currentBlock.timestamp + 10n; // Small offset to ensure it's in future
    const duration = 100n * 24n * 60n * 60n; // 100 days
    const bribeEndTime = bribeStartTime + duration > marketEndTime ? marketEndTime : bribeStartTime + duration;
    const bribeAmount = parseUnits('1000', 18);

    await rewardToken.write.approve([bribeManager.address, bribeAmount], { account: sponsor.account });
    await bribeManager.write.createBribePool(
      [conditionId, 1, rewardToken.address, bribeAmount, bribeStartTime, bribeEndTime],
      { account: sponsor.account }
    );

    const bribePoolId = 1n; // Second pool

    // Check at start: 0 released
    let pending = await bribeManager.read.pendingBribeRewards([bribePoolId, alice.account.address]);
    assert.equal(pending, 0n, 'Should have 0 rewards at start');

    // Fast forward 50 days (50% of duration)
    await testClient.increaseTime({ seconds: 50 * 24 * 60 * 60 });
    await testClient.mine({ blocks: 1 });

    // At 50% progress, quadratic curve should release:
    // released = totalAmount * 0.5 * (2 - 0.5) = totalAmount * 0.5 * 1.5 = 75%
    pending = await bribeManager.read.pendingBribeRewards([bribePoolId, alice.account.address]);
    const expected75 = (bribeAmount * 75n) / 100n;

    // Allow 1% variance
    assert(pending > expected75 * 99n / 100n, `Should have ~75% at 50% time, got ${formatUnits(pending, 18)}`);
    assert(pending < expected75 * 101n / 100n, `Should have ~75% at 50% time, got ${formatUnits(pending, 18)}`);

    console.log(`At 50% time: ${formatUnits(pending, 18)} / ${formatUnits(bribeAmount, 18)} (${Number(pending * 100n / bribeAmount)}%)`);

    // Fast forward to end (add extra time to account for start offset)
    await testClient.increaseTime({ seconds: 50 * 24 * 60 * 60 + 100 });
    await testClient.mine({ blocks: 1 });

    // At end: 100% released
    pending = await bribeManager.read.pendingBribeRewards([bribePoolId, alice.account.address]);
    assert.equal(pending, bribeAmount, 'Should have 100% at end');
  });

  it('Should distribute bribes proportionally by weight', async () => {
    const { conditionId, endTime: marketEndTime } = await createMarket('BribeTest 3');

    // Alice: permanent lock (2x weight)
    await usdc.write.approve([ctf.address, parseUnits('1000', 6)], { account: alice.account });
    await ctf.write.splitPosition([conditionId, parseUnits('200', 6)], { account: alice.account });
    await ctf.write.setApprovalForAll([staking.address, true], { account: alice.account });
    await staking.write.stakePermanent([conditionId, 1, parseUnits('100', 6)], { account: alice.account });

    // Bob: temporary lock (0.5x weight, locks for half duration)
    await usdc.write.approve([ctf.address, parseUnits('1000', 6)], { account: bob.account });
    await ctf.write.splitPosition([conditionId, parseUnits('200', 6)], { account: bob.account });
    await ctf.write.setApprovalForAll([staking.address, true], { account: bob.account });

    const currentBlock = await publicClient.getBlock();
    const remainingTime = marketEndTime - currentBlock.timestamp;
    await staking.write.stake([conditionId, 1, parseUnits('100', 6), remainingTime - (2n * 24n * 60n * 60n)], { account: bob.account });

    // Create bribe pool
    const bribeStartTime = currentBlock.timestamp + 10n; // Small offset to ensure it's in future
    const bribeEndTime = bribeStartTime + (30n * 24n * 60n * 60n) > marketEndTime ? marketEndTime : bribeStartTime + (30n * 24n * 60n * 60n);
    const bribeAmount = parseUnits('1000', 18);

    await rewardToken.write.approve([bribeManager.address, bribeAmount], { account: sponsor.account });
    await bribeManager.write.createBribePool(
      [conditionId, 1, rewardToken.address, bribeAmount, bribeStartTime, bribeEndTime],
      { account: sponsor.account }
    );

    const bribePoolId = 2n;

    // Fast forward to end
    await testClient.increaseTime({ seconds: 30 * 24 * 60 * 60 });
    await testClient.mine({ blocks: 1 });

    const alicePending = await bribeManager.read.pendingBribeRewards([bribePoolId, alice.account.address]);
    const bobPending = await bribeManager.read.pendingBribeRewards([bribePoolId, bob.account.address]);

    console.log(`Alice (2x weight): ${formatUnits(alicePending, 18)} REWARD`);
    console.log(`Bob (0.5x weight): ${formatUnits(bobPending, 18)} REWARD`);

    // Alice should get more than Bob
    assert(alicePending > bobPending, 'Alice should get more than Bob');

    // Total should be 100%
    const total = alicePending + bobPending;
    assert(total >= bribeAmount * 99n / 100n, 'Total should be ~100%');
    assert(total <= bribeAmount, 'Total should not exceed 100%');
  });

  it('Should allow claiming bribe rewards', async () => {
    const { conditionId, endTime: marketEndTime } = await createMarket('BribeTest 4');

    // Alice stakes
    await usdc.write.approve([ctf.address, parseUnits('1000', 6)], { account: alice.account });
    await ctf.write.splitPosition([conditionId, parseUnits('200', 6)], { account: alice.account });
    await ctf.write.setApprovalForAll([staking.address, true], { account: alice.account });
    await staking.write.stakePermanent([conditionId, 1, parseUnits('100', 6)], { account: alice.account });

    // Create bribe pool
    const currentBlock = await publicClient.getBlock();
    const bribeStartTime = currentBlock.timestamp + 10n; // Small offset to ensure it's in future
    const bribeEndTime = bribeStartTime + (30n * 24n * 60n * 60n) > marketEndTime ? marketEndTime : bribeStartTime + (30n * 24n * 60n * 60n);
    const bribeAmount = parseUnits('1000', 18);

    await rewardToken.write.approve([bribeManager.address, bribeAmount], { account: sponsor.account });
    await bribeManager.write.createBribePool(
      [conditionId, 1, rewardToken.address, bribeAmount, bribeStartTime, bribeEndTime],
      { account: sponsor.account }
    );

    const bribePoolId = 3n;

    // Fast forward halfway
    await testClient.increaseTime({ seconds: 15 * 24 * 60 * 60 });
    await testClient.mine({ blocks: 1 });

    const beforeBalance = await rewardToken.read.balanceOf([alice.account.address]);

    // Claim
    await bribeManager.write.claimBribePool([bribePoolId], { account: alice.account });

    const afterBalance = await rewardToken.read.balanceOf([alice.account.address]);
    const claimed = afterBalance - beforeBalance;

    console.log(`Claimed: ${formatUnits(claimed, 18)} REWARD`);
    assert(claimed > 0n, 'Should have claimed some rewards');

    // Try to claim again immediately - should get nothing
    const pendingAgain = await bribeManager.read.pendingBribeRewards([bribePoolId, alice.account.address]);
    assert.equal(pendingAgain, 0n, 'Should have no pending rewards after claim');
  });
});
