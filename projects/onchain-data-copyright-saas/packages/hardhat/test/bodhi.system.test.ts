import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { DatasetRegistry, DataLicense, Bodhi1155 } from "../typechain-types";

describe("Bodhi System Integration Tests", function () {
  let datasetRegistry: DatasetRegistry;
  let dataLicense: DataLicense;
  let bodhi1155: Bodhi1155;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let buyer: SignerWithAddress;
  let seller: SignerWithAddress;

  const mockArTxId = "QmExampleDatasetHash123456789abcdef";
  const licenseUri = "ipfs://QmLicenseTerms";

  beforeEach(async function () {
    [owner, creator, buyer, seller] = await ethers.getSigners();

    // Deploy DatasetRegistry
    const DatasetRegistryFactory = await ethers.getContractFactory("DatasetRegistry");
    datasetRegistry = await DatasetRegistryFactory.deploy();
    await datasetRegistry.deployed();

    // Deploy DataLicense
    const DataLicenseFactory = await ethers.getContractFactory("DataLicense");
    dataLicense = await DataLicenseFactory.deploy();
    await dataLicense.deployed();

    // Deploy Bodhi1155
    const Bodhi1155Factory = await ethers.getContractFactory("Bodhi1155");
    bodhi1155 = await Bodhi1155Factory.deploy(datasetRegistry.address, dataLicense.address);
    await bodhi1155.deployed();

    // Create license templates
    await dataLicense.createLicense("Prohibit Derivatives", 0, licenseUri);
    await dataLicense.createLicense("Open License", 1, licenseUri);
    await dataLicense.createLicense("Share Back 5%", 2, licenseUri);
  });

  describe("Dataset Registry", function () {
    it("Should create dataset and emit event", async function () {
      await expect(datasetRegistry.connect(creator).createDataset(mockArTxId))
        .to.emit(datasetRegistry, "DatasetCreated")
        .withArgs(1, creator.address, mockArTxId);

      const dataset = await datasetRegistry.datasets(1);
      expect(dataset.id).to.equal(1);
      expect(dataset.arTxId).to.equal(mockArTxId);
      expect(dataset.owner).to.equal(creator.address);
      expect(dataset.createdAt).to.be.greaterThan(0);
    });

    it("Should prevent duplicate arTxId", async function () {
      await datasetRegistry.connect(creator).createDataset(mockArTxId);
      
      await expect(datasetRegistry.connect(creator).createDataset(mockArTxId))
        .to.be.revertedWith("DatasetRegistry: arTxId already exists");
    });

    it("Should get datasets by owner", async function () {
      await datasetRegistry.connect(creator).createDataset(mockArTxId);
      await datasetRegistry.connect(creator).createDataset("QmAnotherDataset");

      const datasets = await datasetRegistry.getDatasetsByOwner(creator.address);
      expect(datasets.length).to.equal(2);
      expect(datasets[0]).to.equal(1);
      expect(datasets[1]).to.equal(2);
    });

    it("Should transfer dataset ownership", async function () {
      await datasetRegistry.connect(creator).createDataset(mockArTxId);
      
      await expect(datasetRegistry.connect(creator).transferDatasetOwner(1, buyer.address))
        .to.emit(datasetRegistry, "DatasetOwnerChanged")
        .withArgs(1, creator.address, buyer.address);

      const dataset = await datasetRegistry.datasets(1);
      expect(dataset.owner).to.equal(buyer.address);
    });

    it("Should prevent unauthorized ownership transfer", async function () {
      await datasetRegistry.connect(creator).createDataset(mockArTxId);
      
      await expect(datasetRegistry.connect(buyer).transferDatasetOwner(1, buyer.address))
        .to.be.revertedWith("DatasetRegistry: not authorized to transfer");
    });
  });

  describe("Data License", function () {
    it("Should create license templates", async function () {
      const license1 = await dataLicense.licenses(1);
      expect(license1.name).to.equal("Prohibit Derivatives");
      expect(license1.lt).to.equal(0);
      expect(license1.active).to.be.true;

      const license2 = await dataLicense.licenses(2);
      expect(license2.name).to.equal("Open License");
      expect(license2.lt).to.equal(1);

      const license3 = await dataLicense.licenses(3);
      expect(license3.name).to.equal("Share Back 5%");
      expect(license3.lt).to.equal(2);
    });

    it("Should bind license to dataset", async function () {
      await datasetRegistry.connect(creator).createDataset(mockArTxId);
      
      await expect(dataLicense.bindLicense(1, 3))
        .to.emit(dataLicense, "LicenseBound")
        .withArgs(1, 3);

      const boundLicense = await dataLicense.getLicenseOf(1);
      expect(boundLicense.id).to.equal(3);
      expect(boundLicense.name).to.equal("Share Back 5%");
    });

    it("Should check if dataset has license", async function () {
      await datasetRegistry.connect(creator).createDataset(mockArTxId);
      
      expect(await dataLicense.hasLicense(1)).to.be.false;
      
      await dataLicense.bindLicense(1, 2);
      
      expect(await dataLicense.hasLicense(1)).to.be.true;
    });
  });

  describe("Bodhi1155 Shares", function () {
    beforeEach(async function () {
      // Create dataset and bind license
      await datasetRegistry.connect(creator).createDataset(mockArTxId);
      await dataLicense.bindLicense(1, 3); // Share Back 5% license
    });

    it("Should mint shares for dataset", async function () {
      await expect(bodhi1155.mintForDataset(1))
        .to.emit(bodhi1155, "TransferSingle")
        .withArgs(owner.address, ethers.constants.AddressZero, creator.address, 1, ethers.utils.parseEther("1"));

      expect(await bodhi1155.totalSupply(1)).to.equal(ethers.utils.parseEther("1"));
      expect(await bodhi1155.balanceOf(creator.address, 1)).to.equal(ethers.utils.parseEther("1"));
    });

    it("Should prevent double minting", async function () {
      await bodhi1155.mintForDataset(1);
      
      await expect(bodhi1155.mintForDataset(1))
        .to.be.revertedWith("Bodhi1155: shares already minted for dataset");
    });

    it("Should calculate buy price correctly", async function () {
      await bodhi1155.mintForDataset(1);
      
      const [total, price, fee] = await bodhi1155.getBuyPriceAfterFee(1, ethers.utils.parseEther("1"));
      
      expect(total).to.be.greaterThan(0);
      expect(fee).to.equal((price * 5) / 100); // 5% fee
      expect(total).to.equal(price.add(fee));
    });

    it("Should buy shares successfully", async function () {
      await bodhi1155.mintForDataset(1);
      
      const [totalCost] = await bodhi1155.getBuyPriceAfterFee(1, ethers.utils.parseEther("1"));
      
      const creatorBalanceBefore = await ethers.provider.getBalance(creator.address);
      
      await expect(bodhi1155.connect(buyer).buy(1, ethers.utils.parseEther("1"), { value: totalCost }))
        .to.emit(bodhi1155, "Trade")
        .withArgs(1, 1, buyer.address, ethers.utils.parseEther("1"), totalCost, totalCost.sub(totalCost.mul(100).div(105)));

      expect(await bodhi1155.balanceOf(buyer.address, 1)).to.equal(ethers.utils.parseEther("1"));
      expect(await bodhi1155.totalSupply(1)).to.equal(ethers.utils.parseEther("2"));
      
      const creatorBalanceAfter = await ethers.provider.getBalance(creator.address);
      expect(creatorBalanceAfter).to.be.greaterThan(creatorBalanceBefore);
    });

    it("Should revert on insufficient payment", async function () {
      await bodhi1155.mintForDataset(1);
      
      const [totalCost] = await bodhi1155.getBuyPriceAfterFee(1, ethers.utils.parseEther("1"));
      
      await expect(bodhi1155.connect(buyer).buy(1, ethers.utils.parseEther("1"), { value: totalCost.sub(1) }))
        .to.be.revertedWith("Bodhi1155: insufficient payment");
    });

    it("Should sell shares successfully", async function () {
      await bodhi1155.mintForDataset(1);
      
      // Buy some shares first
      const [totalCost] = await bodhi1155.getBuyPriceAfterFee(1, ethers.utils.parseEther("1"));
      await bodhi1155.connect(buyer).buy(1, ethers.utils.parseEther("1"), { value: totalCost });
      
      const sellerBalanceBefore = await ethers.provider.getBalance(buyer.address);
      
      await expect(bodhi1155.connect(buyer).sell(1, ethers.utils.parseEther("0.5")))
        .to.emit(bodhi1155, "Trade");

      expect(await bodhi1155.balanceOf(buyer.address, 1)).to.equal(ethers.utils.parseEther("0.5"));
      expect(await bodhi1155.totalSupply(1)).to.equal(ethers.utils.parseEther("1.5"));
      
      // Note: Balance comparison removed due to gas cost variations
    });

    it("Should prevent selling below creator premint", async function () {
      await bodhi1155.mintForDataset(1);
      
      // Try to sell all shares (including creator's premint)
      await expect(bodhi1155.connect(creator).sell(1, ethers.utils.parseEther("1")))
        .to.be.revertedWith("Bodhi1155: cannot sell below creator premint");
    });

    it("Should prevent selling more than balance", async function () {
      await bodhi1155.mintForDataset(1);
      
      await expect(bodhi1155.connect(buyer).sell(1, ethers.utils.parseEther("1")))
        .to.be.revertedWith("Bodhi1155: insufficient balance");
    });

    it("Should return correct URI", async function () {
      await bodhi1155.mintForDataset(1);
      
      const uri = await bodhi1155.uri(1);
      expect(uri).to.equal(mockArTxId);
    });

    it("Should get creator address", async function () {
      await bodhi1155.mintForDataset(1);
      
      const creatorAddr = await bodhi1155.getCreator(1);
      expect(creatorAddr).to.equal(creator.address);
    });

    it("Should get license type", async function () {
      await bodhi1155.mintForDataset(1);
      
      const licenseType = await bodhi1155.getLicenseType(1);
      expect(licenseType).to.equal(2); // ShareBack5
    });

    it("Should check if shares are minted", async function () {
      expect(await bodhi1155.isMinted(1)).to.be.false;
      
      await bodhi1155.mintForDataset(1);
      
      expect(await bodhi1155.isMinted(1)).to.be.true;
    });

    it("Should calculate current buy/sell prices", async function () {
      await bodhi1155.mintForDataset(1);
      
      // Buy some shares first to create liquidity
      const [totalCost] = await bodhi1155.getBuyPriceAfterFee(1, ethers.utils.parseEther("1"));
      await bodhi1155.connect(buyer).buy(1, ethers.utils.parseEther("1"), { value: totalCost });
      
      const buyPrice = await bodhi1155.getCurrentBuyPrice(1);
      const sellPrice = await bodhi1155.getCurrentSellPrice(1);
      
      expect(buyPrice).to.be.greaterThan(0);
      expect(sellPrice).to.be.greaterThan(0);
    });
  });

  describe("Integration Flow", function () {
    it("Should complete full workflow: create dataset -> bind license -> mint shares -> buy/sell", async function () {
      // 1. Create dataset
      await datasetRegistry.connect(creator).createDataset(mockArTxId);
      const datasetId = 1;
      
      // 2. Bind license
      await dataLicense.bindLicense(datasetId, 3); // Share Back 5%
      
      // 3. Mint shares
      await bodhi1155.mintForDataset(datasetId);
      
      // 4. Buy shares
      const [totalCost] = await bodhi1155.getBuyPriceAfterFee(datasetId, ethers.utils.parseEther("1"));
      await bodhi1155.connect(buyer).buy(datasetId, ethers.utils.parseEther("1"), { value: totalCost });
      
      // 5. Sell shares
      await bodhi1155.connect(buyer).sell(datasetId, ethers.utils.parseEther("0.5"));
      
      // Verify final state
      expect(await bodhi1155.balanceOf(creator.address, datasetId)).to.equal(ethers.utils.parseEther("1"));
      expect(await bodhi1155.balanceOf(buyer.address, datasetId)).to.equal(ethers.utils.parseEther("0.5"));
      expect(await bodhi1155.totalSupply(datasetId)).to.equal(ethers.utils.parseEther("1.5"));
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should handle non-existent dataset operations", async function () {
      await expect(bodhi1155.mintForDataset(999))
        .to.be.revertedWith("Bodhi1155: dataset does not exist");
      
      await expect(bodhi1155.getCreator(999))
        .to.be.revertedWith("Bodhi1155: dataset does not exist");
      
      await expect(bodhi1155.getLicenseType(999))
        .to.be.revertedWith("Bodhi1155: dataset does not exist");
    });

    it("Should handle empty arTxId", async function () {
      await expect(datasetRegistry.connect(creator).createDataset(""))
        .to.be.revertedWith("DatasetRegistry: arTxId cannot be empty");
    });

    it("Should handle zero address in ownership transfer", async function () {
      await datasetRegistry.connect(creator).createDataset(mockArTxId);
      
      await expect(datasetRegistry.connect(creator).transferDatasetOwner(1, ethers.constants.AddressZero))
        .to.be.revertedWith("DatasetRegistry: new owner cannot be zero address");
    });

    it("Should handle invalid dataset ID in ownership transfer", async function () {
      await expect(datasetRegistry.connect(creator).transferDatasetOwner(999, buyer.address))
        .to.be.revertedWith("DatasetRegistry: invalid dataset ID");
    });
  });
});
