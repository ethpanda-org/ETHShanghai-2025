const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AquaFlux Basic Tests", function () {
    let owner, user1, mockToken;

    beforeEach(async function () {
        [owner, user1] = await ethers.getSigners();

        // Deploy mock ERC20 token for testing
        const MockToken = await ethers.getContractFactory("MockERC20");
        mockToken = await MockToken.deploy("Mock Token", "MTK");
        await mockToken.waitForDeployment();
    });

    it("Should deploy MockERC20 successfully", async function () {
        expect(await mockToken.getAddress()).to.not.equal(ethers.ZeroAddress);
        expect(await mockToken.name()).to.equal("Mock Token");
        expect(await mockToken.symbol()).to.equal("MTK");
    });

    it("Should mint tokens to user", async function () {
        const amount = ethers.parseEther("100");
        await mockToken.mint(await user1.getAddress(), amount);
        expect(await mockToken.balanceOf(await user1.getAddress())).to.equal(amount);
    });

    it("Should transfer tokens between users", async function () {
        const amount = ethers.parseEther("50");
        await mockToken.mint(await user1.getAddress(), amount);
        
        const transferAmount = ethers.parseEther("20");
        await mockToken.connect(user1).transfer(await owner.getAddress(), transferAmount);
        
        expect(await mockToken.balanceOf(await owner.getAddress())).to.equal(transferAmount);
        expect(await mockToken.balanceOf(await user1.getAddress())).to.equal(amount - transferAmount);
    });
}); 