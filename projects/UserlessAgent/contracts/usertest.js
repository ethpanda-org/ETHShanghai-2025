const { expect } = require("chai");
const { ethers } = require("hardhat");

// 请替换为你的已部署合约地址
const VOTE_CONTRACT_ADDRESS = "0xYourVoteContractAddress";
const USERLESS_AGENT_ADDRESS = "0xYourUserlessAgentAddress";

describe("Vote Contract Test (Using Deployed Contracts)", function () {
    let voteContract, owner, alice, bob, david;

    before(async function () {
        [owner, alice, bob, david] = await ethers.getSigners();
        voteContract = await ethers.getContractAt("VoteResultsIPFS", VOTE_CONTRACT_ADDRESS);
        userlessAgent = await ethers.getContractAt("UserlessAgent", USERLESS_AGENT_ADDRESS);
    });

    it("Alice 选择 AI 代理投票（Reject），Bob 和 David 亲自投票（Approve）", async function () {
        // Alice 使用 AI 代理投票（Reject: 0）
        await userlessAgent.connect(alice).storeAIVote(0);
        expect(await voteContract.agentVote(alice.address)).to.equal(0);

        // Bob 直接投票（Approve: 1）
        await voteContract.connect(bob).submitVote(bob.address, 1);
        expect(await voteContract.agentVote(bob.address)).to.equal(1);

        // David 直接投票（Approve: 1）
        await voteContract.connect(david).submitVote(david.address, 1);
        expect(await voteContract.agentVote(david.address)).to.equal(1);
    });

    it("统计投票结果", async function () {
        const results = await voteContract.getVoteSummary();
        console.log("Final Vote Results:", results);

        expect(results.Reject).to.equal(1); // 1 票 Reject
        expect(results.Approve).to.equal(2); // 2 票 Approve
    });
});
