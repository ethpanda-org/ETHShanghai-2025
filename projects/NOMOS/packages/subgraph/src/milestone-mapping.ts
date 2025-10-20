import {
  MilestonePaymentTaskCreated as MilestonePaymentTaskCreatedEvent,
  MilestonePaymentTask_MilestoneAdded as MilestonePaymentTaskMilestoneAddedEvent,
  MilestonePaymentTask_TaskWorkerAdded as MilestonePaymentTaskWorkerAddedEvent,
  MilestonePaymentTask_TaskCancelled as MilestonePaymentTaskCancelledEvent,
  MilestonePaymentTask_TaskCompleted as MilestonePaymentTaskCompletedEvent,
  MilestonePaymentTask_MilestoneApproved as MilestonePaymentTaskMilestoneApprovedEvent,
  MilestonePaymentTask_MilestonePaid as MilestonePaymentTaskMilestonePaidEvent,
  MilestonePaymentTask_ProofOfWorkSubmitted as MilestonePaymentTaskProofOfWorkSubmittedEvent,
  MilestonePaymentTask_DisputeFiledByWorker as MilestonePaymentTaskDisputeFiledByWorkerEvent,
  MilestonePaymentTask_MilestoneRewardIncreased as MilestonePaymentTaskMilestoneRewardIncreasedEvent,
  TaskDeadlineChanged as TaskDeadlineChangedEvent,
} from "../generated/MilestonePaymentTask/MilestonePaymentTask";
import {
  MilestonePaymentTask,
  Milestone,
  WorkProof,
  User,
} from "../generated/schema";
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

// 处理创建里程碑付款任务事件
export function handleMilestonePaymentTaskCreated(
  event: MilestonePaymentTaskCreatedEvent
): void {
  let taskId = event.params.taskId.toString();
  let entity = new MilestonePaymentTask(taskId);

  entity.taskId = event.params.taskId;
  let creator = getOrCreateUser(event.params.creator);
  entity.creator = creator.id;

  entity.title = event.params.title;
  entity.description = event.params.description;
  entity.totalReward = BigInt.fromI32(0);
  entity.deadline = event.params.deadline;
  // 修复：创建一个默认的worker用户而不是使用空字符串
  let worker = getOrCreateUser(Address.zero());
  entity.worker = worker.id;
  entity.status = "Open";
  entity.completedMilestonesCount = BigInt.fromI32(0);
  entity.createdAt = event.block.timestamp;
  entity.updatedAt = event.block.timestamp;

  entity.save();
}

// 处理添加里程碑事件
export function handleMilestonePaymentTaskMilestoneAdded(
  event: MilestonePaymentTaskMilestoneAddedEvent
): void {
  let taskId = event.params.taskId.toString();
  let milestoneId = taskId + "-" + event.params.milestoneIndex.toString();
  let entity = new Milestone(milestoneId);

  entity.task = taskId; // 关联到 MilestonePaymentTask
  entity.taskId = event.params.taskId;
  entity.milestoneIndex = event.params.milestoneIndex;
  entity.description = event.params.description;
  entity.reward = event.params.reward;
  entity.paid = false;

  // 创建工作量证明实体
  let workProofId = milestoneId + "-proof";
  let workProof = new WorkProof(workProofId);
  workProof.submitted = false;
  workProof.approved = false;
  workProof.submittedAt = BigInt.fromI32(0);
  workProof.proof = "";
  workProof.save();

  entity.workProof = workProof.id;
  entity.createdAt = event.block.timestamp;
  entity.updatedAt = event.block.timestamp;

  entity.save();

  // 更新任务的总奖励
  let task = MilestonePaymentTask.load(taskId);
  if (task != null) {
    task.totalReward = task.totalReward.plus(event.params.reward);
    task.updatedAt = event.block.timestamp;
    task.save();
  }
}

// 处理工作者添加事件
export function handleMilestonePaymentTaskWorkerAdded(
  event: MilestonePaymentTaskWorkerAddedEvent
): void {
  let taskId = event.params.taskId.toString();
  let entity = MilestonePaymentTask.load(taskId);

  if (entity != null) {
    let worker = getOrCreateUser(event.params.worker);
    entity.worker = worker.id;

    entity.status = "InProgress";
    entity.updatedAt = event.block.timestamp;
    entity.save();
  }
}

// 处理任务取消事件
export function handleMilestonePaymentTaskCancelled(
  event: MilestonePaymentTaskCancelledEvent
): void {
  let taskId = event.params.taskId.toString();
  let entity = MilestonePaymentTask.load(taskId);

  if (entity != null) {
    entity.status = "Cancelled";
    entity.updatedAt = event.block.timestamp;
    entity.save();
  }
}

// 处理任务完成事件
export function handleMilestonePaymentTaskCompleted(
  event: MilestonePaymentTaskCompletedEvent
): void {
  let taskId = event.params.taskId.toString();
  let entity = MilestonePaymentTask.load(taskId);

  if (entity != null) {
    entity.status = "Paid";
    entity.updatedAt = event.block.timestamp;
    entity.save();
  }
}

// 处理里程碑批准事件
export function handleMilestonePaymentTaskMilestoneApproved(
  event: MilestonePaymentTaskMilestoneApprovedEvent
): void {
  let taskId = event.params.taskId.toString();
  let milestoneId = taskId + "-" + event.params.milestoneIndex.toString();
  let entity = Milestone.load(milestoneId);

  if (entity != null) {
    let workProof = entity.workProof
      ? WorkProof.load(entity.workProof!.toString())
      : null;
    if (workProof != null) {
      workProof.approved = true;
      workProof.save();
    }
    entity.updatedAt = event.block.timestamp;
    entity.save();
  }
}

// 处理里程碑支付事件
export function handleMilestonePaymentTaskMilestonePaid(
  event: MilestonePaymentTaskMilestonePaidEvent
): void {
  let taskId = event.params.taskId.toString();
  let milestoneId = taskId + "-" + event.params.milestoneIndex.toString();
  let entity = Milestone.load(milestoneId);

  if (entity != null) {
    entity.paid = true;
    entity.updatedAt = event.block.timestamp;
    entity.save();

    // 更新任务的已完成里程碑计数
    let task = MilestonePaymentTask.load(taskId);
    if (task != null) {
      task.completedMilestonesCount = task.completedMilestonesCount.plus(
        BigInt.fromI32(1)
      );
      task.totalReward = task.totalReward.minus(entity.reward);
      task.updatedAt = event.block.timestamp;
      task.save();
    }
  }
}

// 处理工作量证明提交事件
export function handleMilestonePaymentTaskProofOfWorkSubmitted(
  event: MilestonePaymentTaskProofOfWorkSubmittedEvent
): void {
  let taskId = event.params.taskId.toString();
  let milestoneId = taskId + "-" + event.params.milestoneIndex.toString();
  let entity = Milestone.load(milestoneId);

  if (entity != null) {
    let workProof = entity.workProof
      ? WorkProof.load(entity.workProof!.toString())
      : null;
    if (workProof != null) {
      workProof.submitted = true;
      workProof.proof = event.params.proof;
      workProof.submittedAt = event.block.timestamp;
      workProof.save();
    }
    entity.updatedAt = event.block.timestamp;
    entity.save();
  }
}

// 处理工作者提交纠纷事件
export function handleMilestonePaymentTaskDisputeFiledByWorker(
  event: MilestonePaymentTaskDisputeFiledByWorkerEvent
): void {
  let taskId = event.params.taskId.toString();
  let milestoneId = taskId + "-" + event.params.milestoneIndex.toString();
  let entity = Milestone.load(milestoneId);

  if (entity != null) {
    entity.paid = true; // 标记为已支付以防止进一步支付
    entity.updatedAt = event.block.timestamp;
    entity.save();
  }

  // 更新任务的更新时间戳
  let task = MilestonePaymentTask.load(taskId);
  if (task != null) {
    task.completedMilestonesCount = task.completedMilestonesCount.plus(
      BigInt.fromI32(1)
    );
    task.updatedAt = event.block.timestamp;
    task.save();
  }
}

// 处理里程碑奖励增加事件
export function handleMilestonePaymentTaskMilestoneRewardIncreased(
  event: MilestonePaymentTaskMilestoneRewardIncreasedEvent
): void {
  let taskId = event.params.taskId.toString();
  let milestoneId = taskId + "-" + event.params.milestoneIndex.toString();
  let entity = Milestone.load(milestoneId);

  if (entity != null) {
    entity.reward = entity.reward.plus(event.params.amount);
    entity.updatedAt = event.block.timestamp;
    entity.save();

    // 更新任务的总奖励
    let task = MilestonePaymentTask.load(taskId);
    if (task != null) {
      task.totalReward = task.totalReward.plus(event.params.amount);
      task.updatedAt = event.block.timestamp;
      task.save();
    }
  }
}

// 处理任务截止日期变更事件
export function handleTaskDeadlineChanged(
  event: TaskDeadlineChangedEvent
): void {
  let taskId = event.params.taskId.toString();
  let entity = MilestonePaymentTask.load(taskId);

  if (entity != null) {
    entity.deadline = event.params.newDeadline;
    entity.updatedAt = event.block.timestamp;
    entity.save();
  }
}