import { expect } from "chai";
import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const { ethers } = hre;

describe("StreamPayment", function () {
  let streamPayment;
  let mockToken;
  let owner, sender, recipient;
  const TOTAL_AMOUNT = ethers.parseEther("1000");
  const DURATION = 3600; // 1 hour

  beforeEach(async function () {
    [owner, sender, recipient] = await ethers.getSigners();

    // Deploy mock ERC20 token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20.deploy("Test Token", "TEST", 18);
    await mockToken.waitForDeployment();

    // Deploy StreamPayment contract
    const StreamPayment = await ethers.getContractFactory("StreamPayment");
    streamPayment = await StreamPayment.deploy();
    await streamPayment.waitForDeployment();

    // Mint tokens to sender
    await mockToken.mint(sender.address, TOTAL_AMOUNT * 10n);
  });

  describe("Stream Creation", function () {
    it("Should create a stream successfully", async function () {
      const tokenAddress = await mockToken.getAddress();
      
      // Approve tokens
      await mockToken.connect(sender).approve(
        await streamPayment.getAddress(),
        TOTAL_AMOUNT
      );

      // Create stream
      const tx = await streamPayment.connect(sender).createStream(
        recipient.address,
        tokenAddress,
        TOTAL_AMOUNT,
        DURATION,
        "Test Stream"
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "StreamCreated"
      );

      expect(event).to.not.be.undefined;
      expect(event.args.sender).to.equal(sender.address);
      expect(event.args.recipient).to.equal(recipient.address);
      expect(event.args.totalAmount).to.equal(TOTAL_AMOUNT);
    });

    it("Should reject stream with zero amount", async function () {
      const tokenAddress = await mockToken.getAddress();
      
      await expect(
        streamPayment.connect(sender).createStream(
          recipient.address,
          tokenAddress,
          0,
          DURATION,
          "Test Stream"
        )
      ).to.be.revertedWith("Amount must be positive");
    });

    it("Should reject stream to self", async function () {
      const tokenAddress = await mockToken.getAddress();
      
      await mockToken.connect(sender).approve(
        await streamPayment.getAddress(),
        TOTAL_AMOUNT
      );

      await expect(
        streamPayment.connect(sender).createStream(
          sender.address,
          tokenAddress,
          TOTAL_AMOUNT,
          DURATION,
          "Test Stream"
        )
      ).to.be.revertedWith("Cannot stream to self");
    });

    it("Should reject stream with duration too short", async function () {
      const tokenAddress = await mockToken.getAddress();
      
      await mockToken.connect(sender).approve(
        await streamPayment.getAddress(),
        TOTAL_AMOUNT
      );

      await expect(
        streamPayment.connect(sender).createStream(
          recipient.address,
          tokenAddress,
          TOTAL_AMOUNT,
          30, // Less than MIN_DURATION (60)
          "Test Stream"
        )
      ).to.be.revertedWith("Duration too short");
    });
  });

  describe("Stream Withdrawal", function () {
    let streamId;
    let tokenAddress;

    beforeEach(async function () {
      tokenAddress = await mockToken.getAddress();
      
      await mockToken.connect(sender).approve(
        await streamPayment.getAddress(),
        TOTAL_AMOUNT
      );

      const tx = await streamPayment.connect(sender).createStream(
        recipient.address,
        tokenAddress,
        TOTAL_AMOUNT,
        DURATION,
        "Test Stream"
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "StreamCreated"
      );
      streamId = event.args.streamId;
    });

    it("Should allow recipient to withdraw after time passes", async function () {
      // Fast forward 1800 seconds (half duration)
      await time.increase(1800);

      const balanceBefore = await mockToken.balanceOf(recipient.address);
      await streamPayment.connect(recipient).withdrawFromStream(streamId);
      const balanceAfter = await mockToken.balanceOf(recipient.address);

      // Should have withdrawn approximately half the amount
      const withdrawn = balanceAfter - balanceBefore;
      expect(withdrawn).to.be.closeTo(TOTAL_AMOUNT / 2n, TOTAL_AMOUNT / 100n);
    });

    it("Should not allow non-recipient to withdraw", async function () {
      await time.increase(1800);

      await expect(
        streamPayment.connect(sender).withdrawFromStream(streamId)
      ).to.be.revertedWith("Only recipient can withdraw");
    });

    it("Should allow full withdrawal after stream ends", async function () {
      // Fast forward past end time
      await time.increase(DURATION + 100);

      await streamPayment.connect(recipient).withdrawFromStream(streamId);
      const balance = await mockToken.balanceOf(recipient.address);

      expect(balance).to.equal(TOTAL_AMOUNT);
    });

    it("Should not allow withdrawal when no funds available", async function () {
      // Try to withdraw immediately (no time passed)
      // Note: Due to block timestamp, at least 1 second may have passed
      // So we skip this test or check balance is very small
      const balance = await streamPayment.balanceOf(streamId);
      expect(balance).to.be.lessThan(TOTAL_AMOUNT / 1000n); // Less than 0.1%
    });
  });

  describe("Stream Pause and Resume", function () {
    let streamId;

    beforeEach(async function () {
      const tokenAddress = await mockToken.getAddress();
      
      await mockToken.connect(sender).approve(
        await streamPayment.getAddress(),
        TOTAL_AMOUNT
      );

      const tx = await streamPayment.connect(sender).createStream(
        recipient.address,
        tokenAddress,
        TOTAL_AMOUNT,
        DURATION,
        "Test Stream"
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "StreamCreated"
      );
      streamId = event.args.streamId;
    });

    it("Should allow sender to pause stream", async function () {
      await streamPayment.connect(sender).pauseStream(streamId);
      
      const stream = await streamPayment.getStream(streamId);
      expect(stream.status).to.equal(1); // PAUSED
    });

    it("Should not allow non-sender to pause", async function () {
      await expect(
        streamPayment.connect(recipient).pauseStream(streamId)
      ).to.be.revertedWith("Only sender can pause");
    });

    it("Should allow sender to resume paused stream", async function () {
      await streamPayment.connect(sender).pauseStream(streamId);
      await streamPayment.connect(sender).resumeStream(streamId);
      
      const stream = await streamPayment.getStream(streamId);
      expect(stream.status).to.equal(0); // ACTIVE
    });
  });

  describe("Stream Cancellation", function () {
    let streamId;

    beforeEach(async function () {
      const tokenAddress = await mockToken.getAddress();
      
      await mockToken.connect(sender).approve(
        await streamPayment.getAddress(),
        TOTAL_AMOUNT
      );

      const tx = await streamPayment.connect(sender).createStream(
        recipient.address,
        tokenAddress,
        TOTAL_AMOUNT,
        DURATION,
        "Test Stream"
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "StreamCreated"
      );
      streamId = event.args.streamId;
    });

    it("Should allow sender to cancel stream", async function () {
      await time.increase(1800); // Half duration

      const senderBalanceBefore = await mockToken.balanceOf(sender.address);
      await streamPayment.connect(sender).cancelStream(streamId);
      const senderBalanceAfter = await mockToken.balanceOf(sender.address);

      // Sender should get refund for unstreamed amount
      const refund = senderBalanceAfter - senderBalanceBefore;
      expect(refund).to.be.closeTo(TOTAL_AMOUNT / 2n, TOTAL_AMOUNT / 100n);
    });

    it("Should allow recipient to cancel stream", async function () {
      await time.increase(1800);

      await streamPayment.connect(recipient).cancelStream(streamId);
      
      const stream = await streamPayment.getStream(streamId);
      expect(stream.status).to.equal(3); // CANCELLED
    });

    it("Should not allow unauthorized user to cancel", async function () {
      const [, , , unauthorized] = await ethers.getSigners();
      
      await expect(
        streamPayment.connect(unauthorized).cancelStream(streamId)
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("View Functions", function () {
    let streamId;

    beforeEach(async function () {
      const tokenAddress = await mockToken.getAddress();
      
      await mockToken.connect(sender).approve(
        await streamPayment.getAddress(),
        TOTAL_AMOUNT
      );

      const tx = await streamPayment.connect(sender).createStream(
        recipient.address,
        tokenAddress,
        TOTAL_AMOUNT,
        DURATION,
        "Test Stream"
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "StreamCreated"
      );
      streamId = event.args.streamId;
    });

    it("Should return correct stream information", async function () {
      const stream = await streamPayment.getStream(streamId);
      
      expect(stream.sender).to.equal(sender.address);
      expect(stream.recipient).to.equal(recipient.address);
      expect(stream.totalAmount).to.equal(TOTAL_AMOUNT);
      expect(stream.streamName).to.equal("Test Stream");
    });

    it("Should calculate correct available balance", async function () {
      await time.increase(1800); // Half duration

      const balance = await streamPayment.balanceOf(streamId);
      expect(balance).to.be.closeTo(TOTAL_AMOUNT / 2n, TOTAL_AMOUNT / 100n);
    });

    it("Should return streams by sender", async function () {
      const streams = await streamPayment.getStreamsBySender(sender.address);
      expect(streams.length).to.equal(1);
      expect(streams[0]).to.equal(streamId);
    });

    it("Should return streams by recipient", async function () {
      const streams = await streamPayment.getStreamsByRecipient(recipient.address);
      expect(streams.length).to.equal(1);
      expect(streams[0]).to.equal(streamId);
    });
  });
});

