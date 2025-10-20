import { 
  ProposalCreated, 
  Voted, 
  ProposalExecuted 
} from "../generated/ProposalGovernance/ProposalGovernance";
import { User, RentalProject, Proposal, Vote } from "../generated/schema";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";

export function handleProposalCreated(event: ProposalCreated): void {
  // Get creator from RentalProject
  let project = RentalProject.load(event.params.projectId.toString());
  if (project == null) {
    return; // Project not found, skip
  }
  
  // Create or get user
  let user = User.load(project.creator);
  if (user == null) {
    user = new User(project.creator);
    user.address = Bytes.fromHexString(project.creator);
    user.save();
  }

  // Create Proposal entity
  let proposal = new Proposal(
    event.params.projectId.toString() + "-" + event.params.proposalId.toString()
  );
  
  proposal.project = event.params.projectId.toString();
  proposal.proposalId = event.params.proposalId;
  proposal.creator = user.id;
  proposal.description = event.params.description;
  proposal.amount = event.params.amount;
  proposal.voteDeadline = event.params.voteDeadline;
  proposal.executed = false;
  proposal.passed = false;
  proposal.yesVotesAmount = BigInt.fromI32(0);
  proposal.noVotesAmount = BigInt.fromI32(0);
  proposal.createdAt = event.block.timestamp;
  proposal.executedAt = null;

  proposal.save();
}

export function handleVoted(event: Voted): void {
  // Create or get voter user
  let voter = User.load(event.params.voter.toHex());
  if (voter == null) {
    voter = new User(event.params.voter.toHex());
    voter.address = event.params.voter;
    voter.save();
  }

  // Create Vote entity
  let vote = new Vote(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  
  vote.proposal = event.params.projectId.toString() + "-" + event.params.proposalId.toString();
  vote.voter = voter.id;
  vote.support = event.params.support;
  vote.amount = event.params.amount;
  vote.timestamp = event.block.timestamp;

  vote.save();

  // Update proposal vote counts
  let proposal = Proposal.load(
    event.params.projectId.toString() + "-" + event.params.proposalId.toString()
  );
  
  if (proposal != null) {
    if (event.params.support) {
      proposal.yesVotesAmount = proposal.yesVotesAmount.plus(event.params.amount);
    } else {
      proposal.noVotesAmount = proposal.noVotesAmount.plus(event.params.amount);
    }
    proposal.save();
  }
}

export function handleProposalExecuted(event: ProposalExecuted): void {
  let proposal = Proposal.load(
    event.params.projectId.toString() + "-" + event.params.proposalId.toString()
  );
  
  if (proposal != null) {
    proposal.executed = true;
    proposal.passed = event.params.passed;
    proposal.executedAt = event.block.timestamp;
    proposal.save();
  }
}
