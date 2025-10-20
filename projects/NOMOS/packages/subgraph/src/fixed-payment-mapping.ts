import {
  FixedPaymentTaskCreated as FixedPaymentTaskCreatedEvent,
  FixedPaymentTask_TaskWorkerAdded as FixedPaymentTaskWorkerAddedEvent,
  FixedPaymentTask_TaskCancelled as FixedPaymentTaskCancelledEvent,
  FixedPaymentTask_TaskPaid as FixedPaymentTaskPaidEvent,
  FixedPaymentTask_ProofOfWorkSubmitted as FixedPaymentTaskProofOfWorkSubmittedEvent,
  FixedPaymentTask_ProofOfWorkApproved as FixedPaymentTaskProofOfWorkApprovedEvent,
  RewardIncreased as RewardIncreasedEvent,
  TaskDeadlineChanged as TaskDeadlineChangedEvent,
} from "../generated/FixedPaymentTask/FixedPaymentTask";
import { FixedPaymentTask, User } from "../generated/schema";
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

// 处理创建固定支付任务事件
export function handleFixedPaymentTaskCreated(
  event: FixedPaymentTaskCreatedEvent
): void {
  let taskId = event.params.taskId.toString();
  let entity = new FixedPaymentTask(taskId);

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

// 处理添加工作者事件
export function handleFixedPaymentTaskWorkerAdded(
  event: FixedPaymentTaskWorkerAddedEvent
): void {
  let taskId = event.params.taskId.toString();
  let entity = FixedPaymentTask.load(taskId);

  if (entity) {
    // 修改：使用User实体ID而不是Address
    let worker = getOrCreateUser(event.params.worker);
    entity.worker = worker.id;
    
    entity.reward = event.params.reward;
    entity.status = "InProgress";
    entity.updatedAt = event.block.timestamp;
    entity.save();
  }
}

// 处理任务取消事件
export function handleFixedPaymentTaskCancelled(
  event: FixedPaymentTaskCancelledEvent
): void {
  let taskId = event.params.taskId.toString();
  let entity = FixedPaymentTask.load(taskId);

  if (entity) {
    entity.status = "Cancelled";
    entity.updatedAt = event.block.timestamp;
    entity.save();
  }
}

// 处理任务支付事件
export function handleFixedPaymentTaskPaid(
  event: FixedPaymentTaskPaidEvent
): void {
  let taskId = event.params.taskId.toString();
  let entity = FixedPaymentTask.load(taskId);

  if (entity) {
    entity.status = "Paid";
    entity.reward = event.params.amount;
    entity.updatedAt = event.block.timestamp;
    entity.save();
  }
}

// 处理工作量证明提交事件
export function handleFixedPaymentTaskProofOfWorkSubmitted(
  event: FixedPaymentTaskProofOfWorkSubmittedEvent
): void {
  let taskId = event.params.taskId.toString();
  let entity = FixedPaymentTask.load(taskId);

  if (entity) {
    entity.proofOfWork = event.params.proof;
    entity.updatedAt = event.block.timestamp;
    entity.save();
  }
}

// 处理工作量证明批准事件
export function handleFixedPaymentTaskProofOfWorkApproved(
  event: FixedPaymentTaskProofOfWorkApprovedEvent
): void {
  let taskId = event.params.taskId.toString();
  let entity = FixedPaymentTask.load(taskId);

  if (entity) {
    entity.status = "Completed";
    entity.updatedAt = event.block.timestamp;
    entity.save();
  }
}

// 处理奖励增加事件
export function handleRewardIncreased(event: RewardIncreasedEvent): void {
  let taskId = event.params.taskId.toString();
  let entity = FixedPaymentTask.load(taskId);

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
  let entity = FixedPaymentTask.load(taskId);

  if (entity) {
    entity.deadline = event.params.newDeadline;
    entity.updatedAt = event.block.timestamp;
    entity.save();
  }
}