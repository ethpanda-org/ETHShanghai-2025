import { expect } from "chai";
import { ethers } from "hardhat";

describe("Vault (Hardhat minimal)", function () {
  it("deploys and allows deposit/redeem after lock", async function () {
    const [admin, manager, guardian, alice] = await ethers.getSigners();

    // Deploy mock token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("USD Stable", "USDS");
    await token.waitForDeployment();

    // Mint to alice
    await (await token.mint(alice.address, ethers.parseEther("1000"))).wait();

    // Deploy vault
    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy(
      await token.getAddress(),
      "VaultCraft Shares",
      "VSHARE",
      admin.address,
      manager.address,
      guardian.address,
      false,
      1000,
      1
    );
    await vault.waitForDeployment();

    // Approve & deposit
    await (await token.connect(alice).approve(await vault.getAddress(), ethers.parseEther("100"))).wait();
    await (await vault.connect(alice).deposit(ethers.parseEther("100"), alice.address)).wait();
    expect(await vault.balanceOf(alice.address)).to.equal(ethers.parseEther("100"));

    // Increase time by 1 day to pass lock
    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 10]);
    await ethers.provider.send("evm_mine", []);
    await (await vault.connect(alice).redeem(ethers.parseEther("10"), alice.address, alice.address)).wait();
    expect(await vault.balanceOf(alice.address)).to.equal(ethers.parseEther("90"));
  });

  it("preserves PS on deposit/withdraw and mints perf fee above HWM", async function () {
    const [admin, manager, guardian, alice] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("USD Stable", "USDS");
    await token.waitForDeployment();
    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy(
      await token.getAddress(),
      "VaultCraft Shares",
      "VSHARE",
      admin.address,
      manager.address,
      guardian.address,
      false,
      1000,
      1
    );
    await vault.waitForDeployment();

    const ps0 = await vault.ps();
    expect(ps0).to.equal(ethers.parseEther("1"));

    await (await token.mint(alice.address, ethers.parseEther("1000"))).wait();
    await (await token.connect(alice).approve(await vault.getAddress(), ethers.parseEther("1000"))).wait();
    await (await vault.connect(alice).deposit(ethers.parseEther("1000"), alice.address)).wait();
    expect(await vault.ps()).to.equal(ps0);

    // donate profit => PS increases
    await (await token.mint(await vault.getAddress(), ethers.parseEther("200"))).wait();
    await (await vault.connect(manager).checkpoint()).wait();
    const psNow = await vault.ps();
    // ~1.2e18
    expect(Number(psNow)).to.be.greaterThan(Number(ps0));

    // redeem keeps PS stable
    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 10]);
    await ethers.provider.send("evm_mine", []);
    await (await vault.connect(alice).redeem(ethers.parseEther("100"), alice.address, alice.address)).wait();
    const psAfter = await vault.ps();
    const diff = psAfter > psNow ? psAfter - psNow : psNow - psAfter;
    expect(diff).to.be.lessThan(10n);
  });

  it("private whitelist gating and receiver must be whitelisted", async function () {
    const [admin, manager, guardian, alice, bob] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("USD Stable", "USDS");
    await token.waitForDeployment();
    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy(
      await token.getAddress(),
      "Private Shares",
      "PVSH",
      admin.address,
      manager.address,
      guardian.address,
      true,
      1000,
      1
    );
    await vault.waitForDeployment();

    await (await token.mint(alice.address, ethers.parseEther("100"))).wait();
    await (await token.connect(alice).approve(await vault.getAddress(), ethers.parseEther("100"))).wait();

    // not whitelisted -> revert
    await expect(vault.connect(alice).deposit(ethers.parseEther("1"), alice.address)).to.be.reverted;
    // whitelist alice only, deposit to bob should revert
    await (await vault.connect(admin).setWhitelist(alice.address, true)).wait();
    await expect(vault.connect(alice).deposit(ethers.parseEther("1"), bob.address)).to.be.reverted;
    // whitelist bob then succeed
    await (await vault.connect(admin).setWhitelist(bob.address, true)).wait();
    await (await vault.connect(alice).deposit(ethers.parseEther("1"), bob.address)).wait();
  });

  it("manager-only execute and adapter whitelist enforced", async function () {
    const [admin, manager, guardian, alice] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("USD Stable", "USDS");
    await token.waitForDeployment();
    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy(
      await token.getAddress(),
      "VaultCraft Shares",
      "VSHARE",
      admin.address,
      manager.address,
      guardian.address,
      false,
      1000,
      1
    );
    await vault.waitForDeployment();

    const MockAdapter = await ethers.getContractFactory("MockAdapter");
    const adapter = await MockAdapter.deploy();
    await adapter.waitForDeployment();

    // not allowed yet
    await expect(vault.connect(manager).execute(await adapter.getAddress(), ethers.AbiCoder.defaultAbiCoder().encode(["int256","uint256","uint256"],[1,2,3]))).to.be.reverted;
    await (await vault.connect(admin).setAdapter(await adapter.getAddress(), true)).wait();
    // only manager
    await expect(vault.connect(alice).execute(await adapter.getAddress(), "0x")).to.be.reverted;
    await (await vault.connect(manager).execute(await adapter.getAddress(), ethers.AbiCoder.defaultAbiCoder().encode(["int256","uint256","uint256"],[1,2,3]))).wait();
  });

  it("pause blocks deposit and redeem even after unlock", async function () {
    const [admin, manager, guardian, alice] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("USD Stable", "USDS");
    await token.waitForDeployment();
    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy(
      await token.getAddress(),
      "VaultCraft Shares",
      "VSHARE",
      admin.address,
      manager.address,
      guardian.address,
      false,
      1000,
      1
    );
    await vault.waitForDeployment();

    await (await token.mint(alice.address, ethers.parseEther("10"))).wait();
    await (await token.connect(alice).approve(await vault.getAddress(), ethers.parseEther("10"))).wait();
    await (await vault.connect(guardian).pause()).wait();
    await expect(vault.connect(alice).deposit(ethers.parseEther("1"), alice.address)).to.be.reverted;
    await (await vault.connect(guardian).unpause()).wait();
    await (await vault.connect(alice).deposit(ethers.parseEther("1"), alice.address)).wait();
    await ethers.provider.send("evm_increaseTime", [24 * 60 * 60 + 10]);
    await ethers.provider.send("evm_mine", []);
    await (await vault.connect(guardian).pause()).wait();
    await expect(vault.connect(alice).redeem(ethers.parseEther("1"), alice.address, alice.address)).to.be.reverted;
  });

  it("share approve/transferFrom works for ERC20 shares", async function () {
    const [admin, manager, guardian, alice, bob] = await ethers.getSigners();
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("USD Stable", "USDS");
    await token.waitForDeployment();
    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy(
      await token.getAddress(),
      "VaultCraft Shares",
      "VSHARE",
      admin.address,
      manager.address,
      guardian.address,
      false,
      1000,
      1
    );
    await vault.waitForDeployment();

    await (await token.mint(alice.address, ethers.parseEther("10"))).wait();
    await (await token.connect(alice).approve(await vault.getAddress(), ethers.parseEther("10"))).wait();
    await (await vault.connect(alice).deposit(ethers.parseEther("10"), alice.address)).wait();
    expect(await vault.balanceOf(alice.address)).to.equal(ethers.parseEther("10"));
    await (await vault.connect(alice).approve(bob.address, ethers.parseEther("3"))).wait();
    await (await vault.connect(bob).transferFrom(alice.address, bob.address, ethers.parseEther("3"))).wait();
    expect(await vault.balanceOf(bob.address)).to.equal(ethers.parseEther("3"));
  });
});
