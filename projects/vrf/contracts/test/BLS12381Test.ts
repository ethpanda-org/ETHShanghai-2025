import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("BLS12381 Precompiles Test", function () {
  it("Should deploy BLS12381Test contract", async function () {
    const blsTest = await ethers.deployContract("BLS12381Test");
    
    expect(blsTest.target).to.be.properAddress;
    console.log("BLS12381Test contract deployed at:", blsTest.target);
  });

  it("Should test G1ADD with zero points", async function () {
    const blsTest = await ethers.deployContract("BLS12381Test");
    
    // Create zero G1 points (96 bytes each)
    const zeroPoint1 = ethers.getBytes("0x" + "0".repeat(192)); // 96 bytes
    const zeroPoint2 = ethers.getBytes("0x" + "0".repeat(192)); // 96 bytes
    
    const tx = await blsTest.testG1Add(zeroPoint1, zeroPoint2);
    const receipt = await tx.wait();
    
    console.log("G1ADD transaction status:", receipt?.status);
    expect(receipt?.status).to.equal(1);
  });

  it("Should test MAP_FP_TO_G1 with zero field element", async function () {
    const blsTest = await ethers.deployContract("BLS12381Test");
    
    // Create zero field element (32 bytes)
    const zeroFp = ethers.getBytes("0x" + "0".repeat(64));
    
    const tx = await blsTest.testMapFpToG1(zeroFp);
    const receipt = await tx.wait();
    
    console.log("MAP_FP_TO_G1 transaction status:", receipt?.status);
    expect(receipt?.status).to.equal(1);
  });

  it("Should test identity elements", async function () {
    const blsTest = await ethers.deployContract("BLS12381Test");
    
    const tx = await blsTest.testIdentityElements();
    const receipt = await tx.wait();
    
    console.log("Identity elements test transaction status:", receipt?.status);
    expect(receipt?.status).to.equal(1);
  });

  it("Should handle invalid input length for G1ADD", async function () {
    const blsTest = await ethers.deployContract("BLS12381Test");
    
    const shortPoint = ethers.getBytes("0x" + "0".repeat(64)); // 32 bytes
    
    await expect(
      blsTest.testG1Add(shortPoint, shortPoint)
    ).to.be.revertedWith("G1 point must be 96 bytes");
  });

  it("Should handle invalid input length for MAP_FP_TO_G1", async function () {
    const blsTest = await ethers.deployContract("BLS12381Test");
    
    const shortFp = ethers.getBytes("0x" + "0".repeat(32)); // 16 bytes
    
    await expect(
      blsTest.testMapFpToG1(shortFp)
    ).to.be.revertedWith("Field element must be 32 bytes");
  });
});
