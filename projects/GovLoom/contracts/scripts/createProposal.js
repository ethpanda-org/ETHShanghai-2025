const hre = require("hardhat");
const params = require("./params");

async function main() {
  const metadataHash = params.proposal.metadataHash;
  const privilegedOnly = params.proposal.privilegedOnly;
  const votingAddress =
    process.env.VOTING_SYSTEM_ADDRESS || params.votingSystem.deployedAddress;

  if (!votingAddress || votingAddress === "") {
    throw new Error(
      "缺少 VotingSystem 地址，请在 .env 中设置 VOTING_SYSTEM_ADDRESS 或在 params.js 中指定。"
    );
  }

  if (!metadataHash || metadataHash === "ipfs://REPLACE_METADATA_HASH") {
    throw new Error(
      "请在 .env 中设置 PROPOSAL_METADATA_HASH，为你的提案填写实际的 metadata 哈希。"
    );
  }

  console.log(`Using VotingSystem at ${votingAddress}`);
  console.log(`Creating proposal with hash: ${metadataHash}`);
  console.log(`privilegedOnly: ${privilegedOnly}`);

  const voting = await hre.ethers.getContractAt("VotingSystem", votingAddress);
  const tx = await voting.createProposal(metadataHash, privilegedOnly);
  console.log(`createProposal tx hash: ${tx.hash}`);
  const receipt = await tx.wait();
  const proposalCreatedEvent = receipt.logs
    .map((log) => {
      try {
        return voting.interface.parseLog(log);
      } catch (err) {
        return null;
      }
    })
    .filter(Boolean)
    .find((parsed) => parsed.name === "ProposalCreated");

  if (proposalCreatedEvent) {
    const proposalId = proposalCreatedEvent.args.proposalId.toString();
    console.log(`ProposalCreated event detected. Proposal ID: ${proposalId}`);
  } else {
    console.log(
      "交易已完成，但未解析到 ProposalCreated 事件，请在区块浏览器验证。"
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
