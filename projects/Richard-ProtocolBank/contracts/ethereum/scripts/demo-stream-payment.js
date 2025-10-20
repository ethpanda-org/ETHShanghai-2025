const hre = require("hardhat");

async function main() {
  console.log("\n🚀 Protocol Bank - 流支付完整演示\n");
  console.log("=" .repeat(60));

  // 获取部署信息
  const fs = require("fs");
  const path = require("path");
  const deploymentsDir = path.join(__dirname, "../deployments");
  const files = fs.readdirSync(deploymentsDir).filter(f => f.startsWith("localhost"));
  const latestDeployment = files.sort().reverse()[0];
  const deploymentInfo = JSON.parse(
    fs.readFileSync(path.join(deploymentsDir, latestDeployment), "utf8")
  );

  console.log("\n📋 已部署的合约地址:");
  console.log("- Mock USDC:", deploymentInfo.contracts.mockUSDC);
  console.log("- Mock DAI:", deploymentInfo.contracts.mockDAI);
  console.log("- StreamPayment:", deploymentInfo.contracts.streamPayment);

  // 获取账户
  const [deployer, alice, bob, charlie] = await hre.ethers.getSigners();
  
  console.log("\n👥 测试账户:");
  console.log("- Deployer:", deployer.address);
  console.log("- Alice (雇主):", alice.address);
  console.log("- Bob (员工):", bob.address);
  console.log("- Charlie (承包商):", charlie.address);

  // 连接到合约
  const mockUSDC = await hre.ethers.getContractAt(
    "MockERC20",
    deploymentInfo.contracts.mockUSDC
  );
  const mockDAI = await hre.ethers.getContractAt(
    "MockERC20",
    deploymentInfo.contracts.mockDAI
  );
  const streamPayment = await hre.ethers.getContractAt(
    "StreamPayment",
    deploymentInfo.contracts.streamPayment
  );

  console.log("\n" + "=".repeat(60));
  console.log("第1步: 为Alice和Bob分配测试代币");
  console.log("=".repeat(60));

  // 给Alice一些USDC
  const aliceAmount = hre.ethers.parseUnits("50000", 6); // 50,000 USDC
  await mockUSDC.mint(alice.address, aliceAmount);
  console.log("✅ 给Alice铸造了 50,000 USDC");

  // 给Alice一些DAI
  const aliceDAIAmount = hre.ethers.parseUnits("50000", 18); // 50,000 DAI
  await mockDAI.mint(alice.address, aliceDAIAmount);
  console.log("✅ 给Alice铸造了 50,000 DAI");

  // 检查余额
  const aliceUSDCBalance = await mockUSDC.balanceOf(alice.address);
  const aliceDAIBalance = await mockDAI.balanceOf(alice.address);
  console.log("\n💰 Alice的余额:");
  console.log("   USDC:", hre.ethers.formatUnits(aliceUSDCBalance, 6));
  console.log("   DAI:", hre.ethers.formatUnits(aliceDAIBalance, 18));

  console.log("\n" + "=".repeat(60));
  console.log("第2步: Alice创建给Bob的工资流支付");
  console.log("=".repeat(60));

  // Alice授权StreamPayment合约
  const bobSalary = hre.ethers.parseUnits("5000", 6); // 5,000 USDC/月
  console.log("\n📝 Alice授权StreamPayment合约使用 5,000 USDC...");
  await mockUSDC.connect(alice).approve(streamPayment.target, bobSalary);
  console.log("✅ 授权完成");

  // 创建流支付 (30天 = 2,592,000秒)
  const duration = 30 * 24 * 60 * 60; // 30天
  console.log("\n💸 创建流支付:");
  console.log("   金额: 5,000 USDC");
  console.log("   时长: 30天");
  console.log("   流速:", (5000 / 30 / 24 / 60 / 60).toFixed(6), "USDC/秒");
  
  const tx1 = await streamPayment.connect(alice).createStream(
    bob.address,
    mockUSDC.target,
    bobSalary,
    duration,
    "Bob的月工资 - 2025年10月"
  );
  const receipt1 = await tx1.wait();
  const event1 = receipt1.logs.find(
    log => log.fragment && log.fragment.name === "StreamCreated"
  );
  const streamId1 = event1.args.streamId;
  console.log("✅ 流支付已创建，ID:", streamId1.toString());

  console.log("\n" + "=".repeat(60));
  console.log("第3步: Alice创建给Charlie的项目流支付");
  console.log("=".repeat(60));

  // 使用DAI支付Charlie
  const charliePayment = hre.ethers.parseUnits("3000", 18); // 3,000 DAI
  console.log("\n📝 Alice授权StreamPayment合约使用 3,000 DAI...");
  await mockDAI.connect(alice).approve(streamPayment.target, charliePayment);
  console.log("✅ 授权完成");

  // 创建流支付 (15天)
  const charlieDuration = 15 * 24 * 60 * 60; // 15天
  console.log("\n💸 创建流支付:");
  console.log("   金额: 3,000 DAI");
  console.log("   时长: 15天");
  console.log("   流速:", (3000 / 15 / 24 / 60 / 60).toFixed(6), "DAI/秒");
  
  const tx2 = await streamPayment.connect(alice).createStream(
    charlie.address,
    mockDAI.target,
    charliePayment,
    charlieDuration,
    "Charlie的项目费用 - 网站开发"
  );
  const receipt2 = await tx2.wait();
  const event2 = receipt2.logs.find(
    log => log.fragment && log.fragment.name === "StreamCreated"
  );
  const streamId2 = event2.args.streamId;
  console.log("✅ 流支付已创建，ID:", streamId2.toString());

  console.log("\n" + "=".repeat(60));
  console.log("第4步: 查看所有流支付信息");
  console.log("=".repeat(60));

  // 查看Alice的流支付
  const aliceStreams = await streamPayment.getStreamsBySender(alice.address);
  console.log("\n📊 Alice创建的流支付数量:", aliceStreams.length);

  for (let i = 0; i < aliceStreams.length; i++) {
    const stream = await streamPayment.getStream(aliceStreams[i]);
    const tokenSymbol = stream.token === mockUSDC.target ? "USDC" : "DAI";
    const decimals = tokenSymbol === "USDC" ? 6 : 18;
    console.log(`\n   流支付 #${aliceStreams[i]}:`);
    console.log(`   - 名称: ${stream.streamName}`);
    console.log(`   - 接收方: ${stream.recipient}`);
    console.log(`   - 金额: ${hre.ethers.formatUnits(stream.totalAmount, decimals)} ${tokenSymbol}`);
    console.log(`   - 状态: ${["活跃", "暂停", "完成", "取消"][stream.status]}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("第5步: 模拟时间流逝 (7天)");
  console.log("=".repeat(60));

  console.log("\n⏰ 时间快进 7天...");
  await hre.network.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
  await hre.network.provider.send("evm_mine");
  console.log("✅ 时间已前进");

  console.log("\n" + "=".repeat(60));
  console.log("第6步: Bob查看并提取可用余额");
  console.log("=".repeat(60));

  // 查看Bob的可用余额
  const bobAvailable = await streamPayment.balanceOf(streamId1);
  console.log("\n💰 Bob可提取的USDC:", hre.ethers.formatUnits(bobAvailable, 6));
  
  const expectedAmount = (5000 / 30) * 7; // 7天的工资
  console.log("   预期金额 (7/30月):", expectedAmount.toFixed(2), "USDC");

  // Bob提取资金
  console.log("\n💸 Bob提取资金...");
  const bobBalanceBefore = await mockUSDC.balanceOf(bob.address);
  await streamPayment.connect(bob).withdrawFromStream(streamId1);
  const bobBalanceAfter = await mockUSDC.balanceOf(bob.address);
  const withdrawn = bobBalanceAfter - bobBalanceBefore;
  console.log("✅ 提取成功:", hre.ethers.formatUnits(withdrawn, 6), "USDC");
  console.log("   Bob的新余额:", hre.ethers.formatUnits(bobBalanceAfter, 6), "USDC");

  console.log("\n" + "=".repeat(60));
  console.log("第7步: Charlie查看并提取可用余额");
  console.log("=".repeat(60));

  // 查看Charlie的可用余额
  const charlieAvailable = await streamPayment.balanceOf(streamId2);
  console.log("\n💰 Charlie可提取的DAI:", hre.ethers.formatUnits(charlieAvailable, 18));
  
  const expectedDAI = (3000 / 15) * 7; // 7天的费用
  console.log("   预期金额 (7/15天):", expectedDAI.toFixed(2), "DAI");

  // Charlie提取资金
  console.log("\n💸 Charlie提取资金...");
  const charlieBalanceBefore = await mockDAI.balanceOf(charlie.address);
  await streamPayment.connect(charlie).withdrawFromStream(streamId2);
  const charlieBalanceAfter = await mockDAI.balanceOf(charlie.address);
  const charlieWithdrawn = charlieBalanceAfter - charlieBalanceBefore;
  console.log("✅ 提取成功:", hre.ethers.formatUnits(charlieWithdrawn, 18), "DAI");
  console.log("   Charlie的新余额:", hre.ethers.formatUnits(charlieBalanceAfter, 18), "DAI");

  console.log("\n" + "=".repeat(60));
  console.log("第8步: Alice暂停Bob的流支付");
  console.log("=".repeat(60));

  console.log("\n⏸️  Alice暂停流支付...");
  await streamPayment.connect(alice).pauseStream(streamId1);
  const streamAfterPause = await streamPayment.getStream(streamId1);
  console.log("✅ 流支付已暂停");
  console.log("   状态:", ["活跃", "暂停", "完成", "取消"][streamAfterPause.status]);

  console.log("\n⏰ 时间快进 3天 (暂停期间)...");
  await hre.network.provider.send("evm_increaseTime", [3 * 24 * 60 * 60]);
  await hre.network.provider.send("evm_mine");

  const bobAvailableAfterPause = await streamPayment.balanceOf(streamId1);
  console.log("💰 暂停期间Bob的可用余额:", hre.ethers.formatUnits(bobAvailableAfterPause, 6), "USDC");
  console.log("   (应该没有增加，因为流支付已暂停)");

  console.log("\n" + "=".repeat(60));
  console.log("第9步: Alice恢复Bob的流支付");
  console.log("=".repeat(60));

  console.log("\n▶️  Alice恢复流支付...");
  await streamPayment.connect(alice).resumeStream(streamId1);
  const streamAfterResume = await streamPayment.getStream(streamId1);
  console.log("✅ 流支付已恢复");
  console.log("   状态:", ["活跃", "暂停", "完成", "取消"][streamAfterResume.status]);

  console.log("\n⏰ 时间快进 5天...");
  await hre.network.provider.send("evm_increaseTime", [5 * 24 * 60 * 60]);
  await hre.network.provider.send("evm_mine");

  const bobAvailableAfterResume = await streamPayment.balanceOf(streamId1);
  console.log("💰 恢复后Bob的新可用余额:", hre.ethers.formatUnits(bobAvailableAfterResume, 6), "USDC");

  console.log("\n" + "=".repeat(60));
  console.log("第10步: Alice取消Charlie的流支付");
  console.log("=".repeat(60));

  console.log("\n❌ Alice取消流支付...");
  const aliceUSDCBefore = await mockDAI.balanceOf(alice.address);
  const charlieDAIBefore = await mockDAI.balanceOf(charlie.address);
  
  await streamPayment.connect(alice).cancelStream(streamId2);
  
  const aliceUSDCAfter = await mockDAI.balanceOf(alice.address);
  const charlieDAIAfter = await mockDAI.balanceOf(charlie.address);
  
  const aliceRefund = aliceUSDCAfter - aliceUSDCBefore;
  const charlieFinal = charlieDAIAfter - charlieDAIBefore;
  
  console.log("✅ 流支付已取消");
  console.log("   Alice退款:", hre.ethers.formatUnits(aliceRefund, 18), "DAI");
  console.log("   Charlie收到:", hre.ethers.formatUnits(charlieFinal, 18), "DAI");

  const streamAfterCancel = await streamPayment.getStream(streamId2);
  console.log("   状态:", ["活跃", "暂停", "完成", "取消"][streamAfterCancel.status]);

  console.log("\n" + "=".repeat(60));
  console.log("第11步: 最终余额汇总");
  console.log("=".repeat(60));

  const finalAliceUSDC = await mockUSDC.balanceOf(alice.address);
  const finalAliceDAI = await mockDAI.balanceOf(alice.address);
  const finalBobUSDC = await mockUSDC.balanceOf(bob.address);
  const finalCharlieDAI = await mockDAI.balanceOf(charlie.address);

  console.log("\n💰 最终余额:");
  console.log("\n   Alice:");
  console.log("   - USDC:", hre.ethers.formatUnits(finalAliceUSDC, 6));
  console.log("   - DAI:", hre.ethers.formatUnits(finalAliceDAI, 18));
  
  console.log("\n   Bob:");
  console.log("   - USDC:", hre.ethers.formatUnits(finalBobUSDC, 6));
  
  console.log("\n   Charlie:");
  console.log("   - DAI:", hre.ethers.formatUnits(finalCharlieDAI, 18));

  console.log("\n" + "=".repeat(60));
  console.log("✅ 演示完成！");
  console.log("=".repeat(60));

  console.log("\n📚 演示内容总结:");
  console.log("1. ✅ 创建了2个流支付（USDC和DAI）");
  console.log("2. ✅ 模拟了时间流逝");
  console.log("3. ✅ 接收方成功提取资金");
  console.log("4. ✅ 暂停和恢复流支付");
  console.log("5. ✅ 取消流支付并退款");
  console.log("6. ✅ 所有功能正常工作");

  console.log("\n🎉 Protocol Bank流支付系统运行完美！\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ 演示失败:", error);
    process.exit(1);
  });

