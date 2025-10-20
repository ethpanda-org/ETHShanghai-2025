import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { parseUnits, keccak256, toHex } from "viem";

describe("MockCTF - Total Supply Tracking", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();

  // Deploy contracts
  const usdc = await viem.deployContract("MockERC20", ["USD Coin", "USDC", 6]);
  const ctf = await viem.deployContract("MockCTF", [usdc.address, parseUnits("1000000", 6)]);

  const [deployer, alice, bob] = await viem.getWalletClients();

  // Mint USDC for testing
  await usdc.write.mint([alice.account.address, parseUnits("100000", 6)]);
  await usdc.write.mint([bob.account.address, parseUnits("100000", 6)]);

  // Helper to create market
  async function createMarket(name: string) {
    const currentBlock = await publicClient.getBlock();
    const marketDuration = 365n * 24n * 60n * 60n; // 1 year
    const startTime = 0n; // 0 = use current block timestamp
    const endTime = currentBlock.timestamp + marketDuration;
    const questionId = keccak256(toHex(name));
    await ctf.write.prepareCondition([
      deployer.account.address,
      questionId,
      2n,
      parseUnits("0.5", 18),
      startTime,
      endTime,
    ]);
    const conditionId = await ctf.read.getConditionId([deployer.account.address, questionId, 2n]);
    return { conditionId, questionId, endTime, marketDuration };
  }

  it("Should track total supply when splitting positions", async function () {
    const { conditionId } = await createMarket("Split Test");

    // Alice splits 1000 USDC into YES/NO tokens
    await usdc.write.approve([ctf.address, parseUnits("1000", 6)], { account: alice.account });
    await ctf.write.splitPosition([conditionId, parseUnits("1000", 6)], { account: alice.account });

    // Check total supply for both YES (outcome=1) and NO (outcome=0)
    const yesSupply = await ctf.read.getOutcomeSupply([conditionId, 1]);
    const noSupply = await ctf.read.getOutcomeSupply([conditionId, 0]);

    assert.equal(yesSupply, parseUnits("1000", 6), "YES total supply should be 1000");
    assert.equal(noSupply, parseUnits("1000", 6), "NO total supply should be 1000");
  });

  it("Should increase total supply when buying tokens", async function () {
    const { conditionId } = await createMarket("Buy Test");

    // Alice buys 500 YES tokens
    await usdc.write.approve([ctf.address, parseUnits("10000", 6)], { account: alice.account });
    await ctf.write.buyYes([conditionId, parseUnits("500", 6)], { account: alice.account });

    // Bob buys 300 NO tokens
    await usdc.write.approve([ctf.address, parseUnits("10000", 6)], { account: bob.account });
    await ctf.write.buyNo([conditionId, parseUnits("300", 6)], { account: bob.account });

    // Check total supply
    // buyYes creates 500 YES + 500 NO, buyNo creates 300 YES + 300 NO
    const yesSupply = await ctf.read.getOutcomeSupply([conditionId, 1]);
    const noSupply = await ctf.read.getOutcomeSupply([conditionId, 0]);

    assert.equal(yesSupply, parseUnits("800", 6), "YES total supply should be 800 (500+300)");
    assert.equal(noSupply, parseUnits("800", 6), "NO total supply should be 800 (500+300)");
  });

  it("Should decrease total supply when merging positions", async function () {
    const { conditionId } = await createMarket("Merge Test");

    // Alice splits 1000 USDC
    await usdc.write.approve([ctf.address, parseUnits("1000", 6)], { account: alice.account });
    await ctf.write.splitPosition([conditionId, parseUnits("1000", 6)], { account: alice.account });

    // Check initial supply
    let yesSupply = await ctf.read.getOutcomeSupply([conditionId, 1]);
    let noSupply = await ctf.read.getOutcomeSupply([conditionId, 0]);
    assert.equal(yesSupply, parseUnits("1000", 6));
    assert.equal(noSupply, parseUnits("1000", 6));

    // Alice merges 400 tokens back
    await ctf.write.mergePositions([conditionId, parseUnits("400", 6)], { account: alice.account });

    // Check supply after merge
    yesSupply = await ctf.read.getOutcomeSupply([conditionId, 1]);
    noSupply = await ctf.read.getOutcomeSupply([conditionId, 0]);
    assert.equal(yesSupply, parseUnits("600", 6), "YES supply should be 600 after merging 400");
    assert.equal(noSupply, parseUnits("600", 6), "NO supply should be 600 after merging 400");
  });

  it("Should decrease total supply when redeeming after resolution", async function () {
    const { conditionId, questionId } = await createMarket("Redeem Test");

    // Alice splits 1000 USDC
    await usdc.write.approve([ctf.address, parseUnits("1000", 6)], { account: alice.account });
    await ctf.write.splitPosition([conditionId, parseUnits("1000", 6)], { account: alice.account });

    // Resolve market: YES wins (payout [0, 1]) - use deployer as oracle
    await ctf.write.reportPayouts([questionId, [0n, parseUnits("1", 18)]], { account: deployer.account });

    // Alice redeems her YES tokens (indexSet: [1] for YES)
    await ctf.write.redeemPositions([conditionId, [1n]], { account: alice.account });

    // Check supply after redemption
    const yesSupply = await ctf.read.getOutcomeSupply([conditionId, 1]);
    const noSupply = await ctf.read.getOutcomeSupply([conditionId, 0]);

    // After redeeming YES tokens, YES supply should be 0, but NO tokens remain
    assert.equal(yesSupply, 0n, "YES supply should be 0 after redemption");
    assert.equal(noSupply, parseUnits("1000", 6), "NO supply should still be 1000 (not redeemed)");
  });

  it("Should track supply correctly across multiple users", async function () {
    const { conditionId } = await createMarket("Multi User Test");

    // Alice splits 1000
    await usdc.write.approve([ctf.address, parseUnits("1000", 6)], { account: alice.account });
    await ctf.write.splitPosition([conditionId, parseUnits("1000", 6)], { account: alice.account });

    // Bob buys 500 YES
    await usdc.write.approve([ctf.address, parseUnits("10000", 6)], { account: bob.account });
    await ctf.write.buyYes([conditionId, parseUnits("500", 6)], { account: bob.account });

    // Total supply should be 1000 (Alice split) + 500 (Bob buy) = 1500 for both YES and NO
    const yesSupply = await ctf.read.getOutcomeSupply([conditionId, 1]);
    const noSupply = await ctf.read.getOutcomeSupply([conditionId, 0]);

    assert.equal(yesSupply, parseUnits("1500", 6), "YES total supply should be 1500");
    assert.equal(noSupply, parseUnits("1500", 6), "NO total supply should be 1500");

    // Alice merges 300
    await ctf.write.mergePositions([conditionId, parseUnits("300", 6)], { account: alice.account });

    // Supply should now be 1500 - 300 = 1200
    const yesSupplyAfter = await ctf.read.getOutcomeSupply([conditionId, 1]);
    const noSupplyAfter = await ctf.read.getOutcomeSupply([conditionId, 0]);

    assert.equal(yesSupplyAfter, parseUnits("1200", 6), "YES supply should be 1200 after merge");
    assert.equal(noSupplyAfter, parseUnits("1200", 6), "NO supply should be 1200 after merge");
  });
});
