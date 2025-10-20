import { BigInt, Address } from "@graphprotocol/graph-ts";
import {
  DisputeResolver_DisputeFiled as DisputeFiledEvent,
  DisputeResolver_DisputeResolved as DisputeResolvedEvent,
  DisputeResolver_ProposalApprovedByWorker as ProposalApprovedByWorkerEvent,
  DisputeResolver_ProposalApprovedByCreator as ProposalApprovedByCreatorEvent,
  DisputeResolver_FundsDistributed as FundsDistributedEvent,
  DisputeResolver_ProposalRejected as ProposalRejectedEvent,
  DisputeResolver_EliteVoted as EliteVotedEvent,
} from "../generated/DisputeResolver/DisputeResolver";
import { Dispute, Admin, AdminVote, User } from "../generated/schema";

// 获取或创建User实体
function getOrCreateUser(address: Address): User {
  let userId = address.toHexString();
  let user = User.load(userId);
  if (!user) {
    user = new User(userId);
    user.address = address;
    user.save();
  }
  return user as User;
}

// 处理提交纠纷事件
export function handleDisputeFiled(event: DisputeFiledEvent): void {
  let disputeId = event.params.disputeId.toString();
  let entity = new Dispute(disputeId);
  entity.disputeId = event.params.disputeId;
  entity.taskId = event.params.taskId;
  entity.taskContract = event.params.taskContract;

  // 修改：使用User实体ID而不是Address
  let worker = getOrCreateUser(event.params.worker);
  let taskCreator = getOrCreateUser(event.params.taskCreator);
  entity.worker = worker.id;
  entity.taskCreator = taskCreator.id;

  entity.rewardAmount = event.params.rewardAmount;
  entity.workerShare = BigInt.fromI32(0);
  entity.proofOfWork = event.params.proof;
  entity.status = "Filed";
  entity.workerApproved = false;
  entity.creatorApproved = false;
  entity.createdAt = event.block.timestamp;
  entity.save();
}

// 处理纠纷解决事件
export function handleDisputeResolved(event: DisputeResolvedEvent): void {
  let disputeId = event.params.disputeId.toString();
  let entity = Dispute.load(disputeId);

  if (entity) {
    entity.status = "Resolved";
    entity.resolvedAt = event.block.timestamp;
    entity.workerShare = event.params.workerShare;
    entity.save();
  }
}

// 处理工作者批准提案事件
export function handleProposalApprovedByWorker(
  event: ProposalApprovedByWorkerEvent
): void {
  let disputeId = event.params.disputeId.toString();
  let entity = Dispute.load(disputeId);

  if (entity) {
    entity.workerApproved = true;
    entity.save();
  }
}

// 处理创建者批准提案事件
export function handleProposalApprovedByCreator(
  event: ProposalApprovedByCreatorEvent
): void {
  let disputeId = event.params.disputeId.toString();
  let entity = Dispute.load(disputeId);

  if (entity) {
    entity.creatorApproved = true;
    entity.save();
  }
}

// 处理资金分配事件
export function handleFundsDistributed(event: FundsDistributedEvent): void {
  let disputeId = event.params.disputeId.toString();
  let entity = Dispute.load(disputeId);

  if (entity) {
    entity.status = "Distributed";
    entity.distributedAt = event.block.timestamp;
    entity.save();
  }
}

// 处理提案被拒绝事件
export function handleProposalRejected(event: ProposalRejectedEvent): void {
  let disputeId = event.params.disputeId.toString();
  let entity = Dispute.load(disputeId);

  if (entity) {
    entity.status = "Filed";
    entity.workerApproved = false;
    entity.creatorApproved = false;
    entity.save();
  }
}


// 处理管理员投票事件
export function handleEliteVoted(event: EliteVotedEvent): void {
  let voteId =
    event.params.disputeId.toString() + "-" + event.params.elite.toHexString();
  let entity = new AdminVote(voteId);
  entity.dispute = event.params.disputeId.toString();
  entity.admin = event.params.elite.toHexString();
  entity.workerShare = event.params.workerShare;
  entity.createdAt = event.block.timestamp;
  entity.save();
}