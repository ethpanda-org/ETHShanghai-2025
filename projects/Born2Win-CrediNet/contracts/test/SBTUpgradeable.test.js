const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

const domainFor = async (name, contract) => {
  const { chainId } = await ethers.provider.getNetwork();
  return {
    name,
    version: "CrediNet SBT Up v1",
    chainId: Number(chainId),
    verifyingContract: await contract.getAddress(),
  };
};

describe("CrediNetSBTUpgradeable", function () {
  async function deployAll() {
    const [admin, issuerEOA, user, forwarder] = await ethers.getSigners();

    const Up = await ethers.getContractFactory("CrediNetSBTUpgradeable");
    const proxy = await upgrades.deployProxy(
      Up,
      ["CrediNet SBT Up", "CNSBTU", "", forwarder.address, ethers.ZeroAddress],
      { kind: "uups" }
    );
    await proxy.waitForDeployment();

    const Id = await ethers.getContractFactory("MockIdentityRegistry");
    const Rep = await ethers.getContractFactory("MockReputationRegistry");
    const Val = await ethers.getContractFactory("MockValidationRegistry");
    const id = await Id.deploy();
    const rep = await Rep.deploy();
    const val = await Val.deploy();
    await Promise.all([id.waitForDeployment(), rep.waitForDeployment(), val.waitForDeployment()]);

    // configure
    await proxy.setRegistries(await id.getAddress(), await rep.getAddress(), await val.getAddress());
    await proxy.setThresholds(70, 100);
    await proxy.setIssuerAgentId(admin.address, 1);
    await proxy.setPreferredValidator(issuerEOA.address);
    await proxy.setEnforceRegistryChecks(true);
    await id.set(1, admin.address, "");
    await rep.set(1, 5, 90);
    const okHash = ethers.keccak256(ethers.toUtf8Bytes("ok"));
    await val.set(okHash, issuerEOA.address, 1, 100, ethers.ZeroHash);

    // roles
    const MINTER_ROLE = await proxy.MINTER_ROLE();
    await proxy.grantRole(MINTER_ROLE, issuerEOA.address);

    return { admin, issuerEOA, user, forwarder, proxy, id, rep, val, okHash };
  }

  it("UUPS upgrade to V2", async () => {
    const { proxy } = await deployAll();
    const V2 = await ethers.getContractFactory("CrediNetSBTUpgradeableV2");
    const upgraded = await upgrades.upgradeProxy(await proxy.getAddress(), V2, {
      kind: "uups",
      call: "initializeV2",
    });
    expect(await upgraded.versionV2()).to.eq("v2");
  });

  it("EIP-712 mintWithPermit by EOA", async () => {
    const { proxy, issuerEOA, user, okHash } = await deployAll();
    const name = "CrediNet SBT Up";
    const domain = await domainFor(name, proxy);
    const types = {
      Mint: [
        { name: "to", type: "address" },
        { name: "badgeType", type: "uint8" },
        { name: "tokenURI", type: "string" },
        { name: "requestHash", type: "bytes32" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const value = {
      to: user.address,
      badgeType: 1,
      tokenURI: "",
      requestHash: okHash,
      nonce: await proxy.nonces(issuerEOA.address),
      deadline,
    };
    const sig = await issuerEOA.signTypedData(domain, types, value);
    await proxy.mintWithPermit(issuerEOA.address, user.address, 1, "", okHash, deadline, sig);
    expect(await proxy.hasBadge(user.address, 1)).to.eq(true);
  });

  it("EIP-1271 mintWithPermit by contract wallet", async () => {
    const { proxy, user, okHash } = await deployAll();
    const W = await ethers.getContractFactory("Mock1271Wallet");
    const wallet = await W.deploy();
    await wallet.waitForDeployment();
    const MINTER_ROLE = await proxy.MINTER_ROLE();
    await proxy.grantRole(MINTER_ROLE, await wallet.getAddress());
    const name = "CrediNet SBT Up";
    const domain = await domainFor(name, proxy);
    const types = {
      Mint: [
        { name: "to", type: "address" },
        { name: "badgeType", type: "uint8" },
        { name: "tokenURI", type: "string" },
        { name: "requestHash", type: "bytes32" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    const value = { to: user.address, badgeType: 2, tokenURI: "", requestHash: okHash, nonce: await proxy.nonces(await wallet.getAddress()), deadline };
    const encoded = await ethers.TypedDataEncoder.hash(domain, types, value);
    await wallet.allowDigest(encoded, true);
    await proxy.mintWithPermit(await wallet.getAddress(), user.address, 2, "", okHash, deadline, "0x");
    expect(await proxy.hasBadge(user.address, 2)).to.eq(true);
  });

  it("ERC-2771-like forwarded _msgSender", async () => {
    const { proxy, forwarder, user } = await deployAll();
    // 构造 calldata：原函数 selector + 参数 + 末尾 20字节为实际sender
    const iface = new ethers.Interface(["function setIssuerAgentId(address issuer,uint256 agentId)"]);
    const data = iface.encodeFunctionData("setIssuerAgentId", [user.address, 99]);
    const appended = data + user.address.substring(2);
    // 给 user 事先授予 GOVERNOR_ROLE 才能调用 setIssuerAgentId
    const GOV = await proxy.GOVERNOR_ROLE();
    await proxy.grantRole(GOV, user.address);
    await forwarder.sendTransaction({ to: await proxy.getAddress(), data: appended });
    expect(await proxy.issuerAgentId(user.address)).to.eq(99n);
  });
});


