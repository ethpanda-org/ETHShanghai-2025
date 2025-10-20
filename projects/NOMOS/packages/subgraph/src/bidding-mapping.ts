import {
  BiddingTaskCreated as BiddingTaskCreatedEvent,
  BiddingTask_BidSubmitted as BiddingTaskBidSubmittedEvent,
  BiddingTask_TaskWorkerAdded as BiddingTaskWorkerAddedEvent,
  BiddingTask_TaskCancelled as BiddingTaskCancelledEvent,
  BiddingTask_TaskPaid as BiddingTaskPaidEvent,
  BiddingTask_ProofOfWorkSubmitted as BiddingTaskProofOfWorkSubmittedEvent,
  BiddingTask_ProofOfWorkApproved as BiddingTaskProofOfWorkApprovedEvent,
  RewardIncreased as RewardIncreasedEvent,
  TaskDeadlineChanged as TaskDeadlineChangedEvent,
} from "../generated/BiddingTask/BiddingTask";
import { BiddingTask, Bid, User } from "../generated/schema";
import { BigInt, Address } from "@graphprotocol/graph-ts";

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

// 处理创建竞价任务事件
export function handleBiddingTaskCreated(event: BiddingTaskCreatedEvent): void {
  let taskId = event.params.taskId.toString();
  let entity = new BiddingTask(taskId);

  entity.taskId = event.params.taskId;
  // 修改：使用User实体ID而不是Address
  let creator = getOrCreateUser(event.params.creator);
  entity.creator = creator.id;

  entity.title = event.params.title;
  entity.description = event.params.description;
  entity.deadline = event.params.deadline;
  entity.reward = BigInt.fromI32(0);
  // 修复：创建一个默认的worker用户而不是使用空字符串
  let worker = getOrCreateUser(Address.zero());
  entity.worker = worker.id;
  entity.proofOfWork = "";
  entity.status = "Open";
  entity.createdAt = event.block.timestamp;
  entity.updatedAt = event.block.timestamp;

  entity.save();
}

// 处理提交竞标事件
export function handleBiddingTaskBidSubmitted(
  event: BiddingTaskBidSubmittedEvent
): void {
  let taskId = event.params.taskId.toString();
  let bidId = taskId + "-" + event.logIndex.toString();
  let entity = new Bid(bidId);

  entity.task = taskId; // 关联到 BiddingTask
  entity.taskId = event.params.taskId;
  // 修改：使用User实体ID而不是Address
  let bidder = getOrCreateUser(event.params.bidder);
  entity.bidder = bidder.id;

  entity.amount = event.params.amount;
  entity.estimatedTime = event.params.estimatedTime;
  entity.description = event.params.description;
  entity.createdAt = event.block.timestamp;

  entity.save();
}

// 处理添加工作者事件
export function handleBiddingTaskWorkerAdded(
  event: BiddingTaskWorkerAddedEvent
): void {
  let taskId = event.params.taskId.toString();
  let entity = BiddingTask.load(taskId);

  if (entity) {
    // 修改：使用User实体ID而不是Address
    let worker = getOrCreateUser(event.params.worker);
    entity.worker = worker.id;

    entity.reward = event.params.amount;
    entity.status = "InProgress";
    entity.updatedAt = event.block.timestamp;
    entity.save();
  }
}

// 处理任务取消事件
export function handleBiddingTaskCancelled(
  event: BiddingTaskCancelledEvent
): void {
  let taskId = event.params.taskId.toString();
  let entity = BiddingTask.load(taskId);

  if (entity) {
    entity.status = "Cancelled";
    entity.updatedAt = event.block.timestamp;
    entity.save();
  }
}

// 处理任务支付事件
export function handleBiddingTaskPaid(event: BiddingTaskPaidEvent): void {
  let taskId = event.params.taskId.toString();
  let entity = BiddingTask.load(taskId);

  if (entity) {
    entity.status = "Paid";
    entity.reward = event.params.amount;
    entity.updatedAt = event.block.timestamp;
    entity.save();
  }
}

// 处理工作量证明提交事件
export function handleBiddingTaskProofOfWorkSubmitted(
  event: BiddingTaskProofOfWorkSubmittedEvent
): void {
  let taskId = event.params.taskId.toString();
  let entity = BiddingTask.load(taskId);

  if (entity) {
    entity.proofOfWork = event.params.proof;
    entity.updatedAt = event.block.timestamp;
    entity.save();
  }
}

// 处理工作量证明批准事件
export function handleBiddingTaskProofOfWorkApproved(
  event: BiddingTaskProofOfWorkApprovedEvent
): void {
  let taskId = event.params.taskId.toString();
  let entity = BiddingTask.load(taskId);

  if (entity) {
    entity.status = "Completed";
    entity.updatedAt = event.block.timestamp;
    entity.save();
  }
}

// 处理奖励增加事件
export function handleRewardIncreased(event: RewardIncreasedEvent): void {
  let taskId = event.params.taskId.toString();
  let entity = BiddingTask.load(taskId);

  if (entity) {
    entity.reward = event.params.amount;
    entity.updatedAt = event.block.timestamp;
    entity.save();
  }
}

// 处理任务截止日期变更事件
export function handleTaskDeadlineChanged(
  event: TaskDeadlineChangedEvent
): void {
  let taskId = event.params.taskId.toString();
  let entity = BiddingTask.load(taskId);

  if (entity) {
    entity.deadline = event.params.newDeadline;
    entity.updatedAt = event.block.timestamp;
    entity.save();
  }
}