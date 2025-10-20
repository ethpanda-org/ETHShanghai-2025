const hre = require("hardhat");

async function main() {
  console.log("=== Protocol Bank Integration Test ===\n");

  const [deployer, alice, bob] = await hre.ethers.getSigners();
  
  console.log("Test accounts:");
  console.log("- Deployer:", deployer.address);
  console.log("- Alice (sender):", alice.address);
  console.log("- Bob (recipient):", bob.address);
  console.log();

  // Deploy contracts
  console.log("1. Deploying contracts...");
  
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
  const mockUSDC = await MockERC20.deploy("Mock USDC", "USDC", 6);
  await mockUSDC.waitForDeployment();
  const usdcAddress = await mockUSDC.getAddress();
  console.log("   Mock USDC deployed:", usdcAddress);

  const StreamPayment = await hre.ethers.getContractFactory("StreamPayment");
  const streamPayment = await StreamPayment.deploy();
  await streamPayment.waitForDeployment();
  const streamAddress = await streamPayment.getAddress();
  console.log("   StreamPayment deployed:", streamAddress);
  console.log();

  // Mint tokens to Alice
  console.log("2. Minting tokens to Alice...");
  const mintAmount = hre.ethers.parseUnits("10000", 6); // 10,000 USDC
  await mockUSDC.mint(alice.address, mintAmount);
  const aliceBalance = await mockUSDC.balanceOf(alice.address);
  console.log("   Alice USDC balance:", hre.ethers.formatUnits(aliceBalance, 6));
  console.log();

  // Alice approves StreamPayment
  console.log("3. Alice approves StreamPayment contract...");
  const streamAmount = hre.ethers.parseUnits("1000", 6); // 1,000 USDC
  await mockUSDC.connect(alice).approve(streamAddress, streamAmount);
  console.log("   Approved:", hre.ethers.formatUnits(streamAmount, 6), "USDC");
  console.log();

  // Alice creates a stream to Bob
  console.log("4. Alice creates stream to Bob...");
  const duration = 3600; // 1 hour
  const tx = await streamPayment.connect(alice).createStream(
    bob.address,
    usdcAddress,
    streamAmount,
    duration,
    "Test Stream Payment"
  );
  const receipt = await tx.wait();
  
  // Get stream ID from event
  const event = receipt.logs.find(
    log => log.fragment && log.fragment.name === "StreamCreated"
  );
  const streamId = event.args.streamId;
  
  console.log("   Stream created with ID:", streamId.toString());
  console.log("   Amount:", hre.ethers.formatUnits(streamAmount, 6), "USDC");
  console.log("   Duration:", duration, "seconds");
  console.log("   Rate:", hre.ethers.formatUnits(streamAmount / BigInt(duration), 6), "USDC/second");
  console.log();

  // Get stream info
  console.log("5. Checking stream information...");
  const stream = await streamPayment.getStream(streamId);
  console.log("   Sender:", stream.sender);
  console.log("   Recipient:", stream.recipient);
  console.log("   Total Amount:", hre.ethers.formatUnits(stream.totalAmount, 6), "USDC");
  console.log("   Status:", ["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"][stream.status]);
  console.log();

  // Wait some time
  console.log("6. Simulating time passage (10 seconds)...");
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Increase time in hardhat network
  if (hre.network.name === "hardhat" || hre.network.name === "localhost") {
    await hre.network.provider.send("evm_increaseTime", [10]);
    await hre.network.provider.send("evm_mine");
  }
  console.log("   Time advanced");
  console.log();

  // Check available balance
  console.log("7. Checking available balance for withdrawal...");
  const availableBalance = await streamPayment.balanceOf(streamId);
  console.log("   Available:", hre.ethers.formatUnits(availableBalance, 6), "USDC");
  console.log();

  // Bob withdraws
  if (availableBalance > 0) {
    console.log("8. Bob withdraws available funds...");
    const bobBalanceBefore = await mockUSDC.balanceOf(bob.address);
    await streamPayment.connect(bob).withdrawFromStream(streamId);
    const bobBalanceAfter = await mockUSDC.balanceOf(bob.address);
    const withdrawn = bobBalanceAfter - bobBalanceBefore;
    console.log("   Withdrawn:", hre.ethers.formatUnits(withdrawn, 6), "USDC");
    console.log("   Bob's new balance:", hre.ethers.formatUnits(bobBalanceAfter, 6), "USDC");
    console.log();
  }

  // Alice pauses the stream
  console.log("9. Alice pauses the stream...");
  await streamPayment.connect(alice).pauseStream(streamId);
  const streamAfterPause = await streamPayment.getStream(streamId);
  console.log("   Status:", ["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"][streamAfterPause.status]);
  console.log();

  // Alice resumes the stream
  console.log("10. Alice resumes the stream...");
  await streamPayment.connect(alice).resumeStream(streamId);
  const streamAfterResume = await streamPayment.getStream(streamId);
  console.log("    Status:", ["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"][streamAfterResume.status]);
  console.log();

  // Get user streams
  console.log("11. Checking user streams...");
  const aliceStreams = await streamPayment.getStreamsBySender(alice.address);
  const bobStreams = await streamPayment.getStreamsByRecipient(bob.address);
  console.log("    Alice's outgoing streams:", aliceStreams.length);
  console.log("    Bob's incoming streams:", bobStreams.length);
  console.log();

  // Alice cancels the stream
  console.log("12. Alice cancels the stream...");
  const aliceBalanceBefore = await mockUSDC.balanceOf(alice.address);
  await streamPayment.connect(alice).cancelStream(streamId);
  const aliceBalanceAfter = await mockUSDC.balanceOf(alice.address);
  const refund = aliceBalanceAfter - aliceBalanceBefore;
  console.log("    Refunded to Alice:", hre.ethers.formatUnits(refund, 6), "USDC");
  
  const streamAfterCancel = await streamPayment.getStream(streamId);
  console.log("    Status:", ["ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"][streamAfterCancel.status]);
  console.log();

  // Final balances
  console.log("=== Final Balances ===");
  const aliceFinal = await mockUSDC.balanceOf(alice.address);
  const bobFinal = await mockUSDC.balanceOf(bob.address);
  console.log("Alice:", hre.ethers.formatUnits(aliceFinal, 6), "USDC");
  console.log("Bob:", hre.ethers.formatUnits(bobFinal, 6), "USDC");
  console.log();

  console.log("✅ Integration test completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });

