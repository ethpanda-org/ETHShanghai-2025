const { expect } = require("chai");
const { ethers } = require("hardhat");

const HASH_PLACEHOLDER = "ipfs://METADATA_HASH_TO_REPLACE";
const STAKE_REQUIREMENT = ethers.parseUnits("100", 18);
const INITIAL_SUPPLY = ethers.parseUnits("1000000", 18);

describe("VotingSystem", function () {
  async function deployFixture() {
    const [owner, voter, privileged] = await ethers.getSigners();

    const StakeToken = await ethers.getContractFactory("VotingStakeToken");
    const stakeToken = await StakeToken.deploy("Voting Stake Token", "VST", INITIAL_SUPPLY);
    await stakeToken.waitForDeployment();

    const VotingSystem = await ethers.getContractFactory("VotingSystem");
    const votingSystem = await VotingSystem.deploy(
      STAKE_REQUIREMENT,
      await stakeToken.getAddress(),
      ethers.ZeroAddress
    );
    await votingSystem.waitForDeployment();

    return { owner, voter, privileged, stakeToken, votingSystem };
  }

  it("allows general voting on public proposals", async function () {
    const { owner, voter, stakeToken, votingSystem } = await deployFixture();

    await expect(votingSystem.connect(owner).createProposal(HASH_PLACEHOLDER, false))
      .to.emit(votingSystem, "ProposalCreated")
      .withArgs(1, HASH_PLACEHOLDER, false);

    await expect(votingSystem.connect(voter).vote(1, 0))
      .to.emit(votingSystem, "VoteCast")
      .withArgs(1, voter.address, 0, false);

    await expect(votingSystem.connect(voter).privilegedVote(1, 0)).to.be.revertedWith(
      "Voting: public proposal"
    );

    const distribution = await votingSystem.getVoteDistribution(1);
    expect(distribution.supportVotes).to.equal(1n);
    expect(distribution.supportRatioE18).to.equal(ethers.parseUnits("1", 18));
  });

  it("restricts privileged proposal voting to stakers", async function () {
    const { owner, voter, privileged, stakeToken, votingSystem } = await deployFixture();

    await votingSystem.connect(owner).createProposal(HASH_PLACEHOLDER, true);

    await expect(votingSystem.connect(voter).vote(1, 0)).to.be.revertedWith("Voting: privileged proposal");

    await expect(votingSystem.connect(voter).privilegedVote(1, 0)).to.be.revertedWith("Voting: not privileged");

    await stakeToken.connect(owner).transfer(privileged.address, STAKE_REQUIREMENT);
    await stakeToken.connect(privileged).approve(await votingSystem.getAddress(), STAKE_REQUIREMENT);
    await votingSystem.connect(privileged).stake(STAKE_REQUIREMENT);

    await expect(votingSystem.connect(privileged).privilegedVote(1, 0))
      .to.emit(votingSystem, "VoteCast")
      .withArgs(1, privileged.address, 0, true);

    await expect(votingSystem.connect(privileged).privilegedVote(1, 1)).to.be.revertedWith(
      "Voting: already voted"
    );
  });
});
