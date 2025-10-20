**THIS CHECKLIST IS NOT COMPLETE**. Use `--show-ignored-findings` to show all the results.
Summary
 - [reentrancy-no-eth](#reentrancy-no-eth) (1 results) (Medium)
 - [shadowing-local](#shadowing-local) (2 results) (Low)
 - [calls-loop](#calls-loop) (2 results) (Low)
 - [reentrancy-benign](#reentrancy-benign) (1 results) (Low)
 - [reentrancy-events](#reentrancy-events) (6 results) (Low)
 - [timestamp](#timestamp) (10 results) (Low)
 - [assembly](#assembly) (2 results) (Informational)
 - [pragma](#pragma) (1 results) (Informational)
 - [costly-loop](#costly-loop) (1 results) (Informational)
 - [solc-version](#solc-version) (4 results) (Informational)
 - [missing-inheritance](#missing-inheritance) (1 results) (Informational)
 - [naming-convention](#naming-convention) (113 results) (Informational)
 - [immutable-states](#immutable-states) (2 results) (Optimization)
## reentrancy-no-eth
Impact: Medium
Confidence: Medium
 - [ ] ID-0
Reentrancy in [MilestonePaymentTask.terminateTask(uint256)](contracts/task/MilestonePaymentTask.sol#L296-L336):
	External calls:
	- [submitDispute(_taskId,worker,task.creator,milestone.reward,milestone.workProof.proof)](contracts/task/MilestonePaymentTask.sol#L320)
		- [processingReward = (_rewardAmount * disputeResolver.getDisputeProcessingRewardBps()) / DenominatorFee](contracts/BaseTask.sol#L167)
		- [disputeResolver.fileDispute(address(this),_taskId,_worker,_taskCreator,_rewardAmount,_proof)](contracts/BaseTask.sol#L180-L187)
	State variables written after the call(s):
	- [payMilestone(_taskId,i)](contracts/task/MilestonePaymentTask.sol#L323)
		- [completedMilestonesCount[_taskId] ++](contracts/task/MilestonePaymentTask.sol#L283)
	[MilestonePaymentTask.completedMilestonesCount](contracts/task/MilestonePaymentTask.sol#L25) can be used in cross function reentrancies:
	- [MilestonePaymentTask.completeTask(uint256)](contracts/task/MilestonePaymentTask.sol#L233-L250)
	- [MilestonePaymentTask.completedMilestonesCount](contracts/task/MilestonePaymentTask.sol#L25)
	- [MilestonePaymentTask.fileDisputeByWorker(uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L346-L385)
	- [MilestonePaymentTask.payMilestone(uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L257-L290)
	- [payMilestone(_taskId,i)](contracts/task/MilestonePaymentTask.sol#L323)
		- [milestone.paid = true](contracts/task/MilestonePaymentTask.sol#L281)
	[MilestonePaymentTask.taskMilestones](contracts/task/MilestonePaymentTask.sol#L22) can be used in cross function reentrancies:
	- [MilestonePaymentTask.InvalidMilestoneIndex(uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L65-L71)
	- [MilestonePaymentTask.addMilestone(uint256,string,uint256)](contracts/task/MilestonePaymentTask.sol#L140-L165)
	- [MilestonePaymentTask.approveMilestone(uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L206-L227)
	- [MilestonePaymentTask.completeTask(uint256)](contracts/task/MilestonePaymentTask.sol#L233-L250)
	- [MilestonePaymentTask.fileDisputeByWorker(uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L346-L385)
	- [MilestonePaymentTask.getMilestone(uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L429-L431)
	- [MilestonePaymentTask.getMilestonesCount(uint256)](contracts/task/MilestonePaymentTask.sol#L419-L421)
	- [MilestonePaymentTask.increaseMilestoneReward(uint256,uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L393-L412)
	- [MilestonePaymentTask.payMilestone(uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L257-L290)
	- [MilestonePaymentTask.submitMilestoneProofOfWork(uint256,uint256,string)](contracts/task/MilestonePaymentTask.sol#L173-L199)
	- [MilestonePaymentTask.taskMilestones](contracts/task/MilestonePaymentTask.sol#L22)
	- [MilestonePaymentTask.terminateTask(uint256)](contracts/task/MilestonePaymentTask.sol#L296-L336)
	- [payMilestone(_taskId,i)](contracts/task/MilestonePaymentTask.sol#L323)
		- [tasks[_taskId].totalreward -= milestone.reward](contracts/task/MilestonePaymentTask.sol#L282)
	[BaseTask.tasks](contracts/BaseTask.sol#L80) can be used in cross function reentrancies:
	- [MilestonePaymentTask.addMilestone(uint256,string,uint256)](contracts/task/MilestonePaymentTask.sol#L140-L165)
	- [MilestonePaymentTask.addWorker(uint256,address)](contracts/task/MilestonePaymentTask.sol#L112-L132)
	- [BaseTask.changedeadline(uint256,uint256)](contracts/BaseTask.sol#L233-L242)
	- [MilestonePaymentTask.completeTask(uint256)](contracts/task/MilestonePaymentTask.sol#L233-L250)
	- [MilestonePaymentTask.createTask(string,string,uint256)](contracts/task/MilestonePaymentTask.sol#L86-L105)
	- [MilestonePaymentTask.fileDisputeByWorker(uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L346-L385)
	- [BaseTask.getTask(uint256)](contracts/BaseTask.sol#L249-L251)
	- [MilestonePaymentTask.increaseMilestoneReward(uint256,uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L393-L412)
	- [BaseTask.onlyTaskCreator(uint256)](contracts/BaseTask.sol#L93-L98)
	- [BaseTask.onlyTaskInProgress(uint256)](contracts/BaseTask.sol#L115-L120)
	- [BaseTask.onlyTaskWorker(uint256)](contracts/BaseTask.sol#L104-L109)
	- [MilestonePaymentTask.payMilestone(uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L257-L290)
	- [BaseTask.submitDispute(uint256,address,address,uint256,string)](contracts/BaseTask.sol#L159-L188)
	- [MilestonePaymentTask.submitMilestoneProofOfWork(uint256,uint256,string)](contracts/task/MilestonePaymentTask.sol#L173-L199)
	- [BaseTask.tasks](contracts/BaseTask.sol#L80)
	- [MilestonePaymentTask.terminateTask(uint256)](contracts/task/MilestonePaymentTask.sol#L296-L336)
	- [task.totalreward = 0](contracts/task/MilestonePaymentTask.sol#L331)
	[BaseTask.tasks](contracts/BaseTask.sol#L80) can be used in cross function reentrancies:
	- [MilestonePaymentTask.addMilestone(uint256,string,uint256)](contracts/task/MilestonePaymentTask.sol#L140-L165)
	- [MilestonePaymentTask.addWorker(uint256,address)](contracts/task/MilestonePaymentTask.sol#L112-L132)
	- [BaseTask.changedeadline(uint256,uint256)](contracts/BaseTask.sol#L233-L242)
	- [MilestonePaymentTask.completeTask(uint256)](contracts/task/MilestonePaymentTask.sol#L233-L250)
	- [MilestonePaymentTask.createTask(string,string,uint256)](contracts/task/MilestonePaymentTask.sol#L86-L105)
	- [MilestonePaymentTask.fileDisputeByWorker(uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L346-L385)
	- [BaseTask.getTask(uint256)](contracts/BaseTask.sol#L249-L251)
	- [MilestonePaymentTask.increaseMilestoneReward(uint256,uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L393-L412)
	- [BaseTask.onlyTaskCreator(uint256)](contracts/BaseTask.sol#L93-L98)
	- [BaseTask.onlyTaskInProgress(uint256)](contracts/BaseTask.sol#L115-L120)
	- [BaseTask.onlyTaskWorker(uint256)](contracts/BaseTask.sol#L104-L109)
	- [MilestonePaymentTask.payMilestone(uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L257-L290)
	- [BaseTask.submitDispute(uint256,address,address,uint256,string)](contracts/BaseTask.sol#L159-L188)
	- [MilestonePaymentTask.submitMilestoneProofOfWork(uint256,uint256,string)](contracts/task/MilestonePaymentTask.sol#L173-L199)
	- [BaseTask.tasks](contracts/BaseTask.sol#L80)
	- [MilestonePaymentTask.terminateTask(uint256)](contracts/task/MilestonePaymentTask.sol#L296-L336)
	- [payMilestone(_taskId,i)](contracts/task/MilestonePaymentTask.sol#L323)
		- [totalPlatformRevenue += fee](contracts/task/MilestonePaymentTask.sol#L279)
	[BaseTask.totalPlatformRevenue](contracts/BaseTask.sol#L71) can be used in cross function reentrancies:
	- [MilestonePaymentTask.payMilestone(uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L257-L290)
	- [BaseTask.totalPlatformRevenue](contracts/BaseTask.sol#L71)

contracts/task/MilestonePaymentTask.sol#L296-L336


## shadowing-local
Impact: Low
Confidence: High
 - [ ] ID-1
[TaskToken.constructor(string,string,uint8)._symbol](contracts/TaskToken.sol#L25) shadows:
	- [ERC20._symbol](lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol#L37) (state variable)

contracts/TaskToken.sol#L25


 - [ ] ID-2
[TaskToken.constructor(string,string,uint8)._name](contracts/TaskToken.sol#L25) shadows:
	- [ERC20._name](lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol#L36) (state variable)

contracts/TaskToken.sol#L25


## calls-loop
Impact: Low
Confidence: Medium
 - [ ] ID-3
[BaseTask.submitDispute(uint256,address,address,uint256,string)](contracts/BaseTask.sol#L159-L188) has external calls inside a loop: [disputeResolver.fileDispute(address(this),_taskId,_worker,_taskCreator,_rewardAmount,_proof)](contracts/BaseTask.sol#L180-L187)
	Calls stack containing the loop:
		MilestonePaymentTask.terminateTask(uint256)

contracts/BaseTask.sol#L159-L188


 - [ ] ID-4
[BaseTask.submitDispute(uint256,address,address,uint256,string)](contracts/BaseTask.sol#L159-L188) has external calls inside a loop: [processingReward = (_rewardAmount * disputeResolver.getDisputeProcessingRewardBps()) / DenominatorFee](contracts/BaseTask.sol#L167)
	Calls stack containing the loop:
		MilestonePaymentTask.terminateTask(uint256)

contracts/BaseTask.sol#L159-L188


## reentrancy-benign
Impact: Low
Confidence: Medium
 - [ ] ID-5
Reentrancy in [BaseTask.submitDispute(uint256,address,address,uint256,string)](contracts/BaseTask.sol#L159-L188):
	External calls:
	- [processingReward = (_rewardAmount * disputeResolver.getDisputeProcessingRewardBps()) / DenominatorFee](contracts/BaseTask.sol#L167)
	State variables written after the call(s):
	- [tasks[_taskId].totalreward -= _rewardAmount](contracts/BaseTask.sol#L173)

contracts/BaseTask.sol#L159-L188


## reentrancy-events
Impact: Low
Confidence: Medium
 - [ ] ID-6
Reentrancy in [MilestonePaymentTask.terminateTask(uint256)](contracts/task/MilestonePaymentTask.sol#L296-L336):
	External calls:
	- [submitDispute(_taskId,worker,task.creator,milestone.reward,milestone.workProof.proof)](contracts/task/MilestonePaymentTask.sol#L320)
		- [processingReward = (_rewardAmount * disputeResolver.getDisputeProcessingRewardBps()) / DenominatorFee](contracts/BaseTask.sol#L167)
		- [disputeResolver.fileDispute(address(this),_taskId,_worker,_taskCreator,_rewardAmount,_proof)](contracts/BaseTask.sol#L180-L187)
	Event emitted after the call(s):
	- [MilestonePaymentTask_MilestonePaid(_taskId,_milestoneIndex,milestone.reward)](contracts/task/MilestonePaymentTask.sol#L289)
		- [payMilestone(_taskId,i)](contracts/task/MilestonePaymentTask.sol#L323)
	- [MilestonePaymentTask_TaskCancelled(_taskId)](contracts/task/MilestonePaymentTask.sol#L335)

contracts/task/MilestonePaymentTask.sol#L296-L336


 - [ ] ID-7
Reentrancy in [MilestonePaymentTask.fileDisputeByWorker(uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L346-L385):
	External calls:
	- [submitDispute(_taskId,msg.sender,task.creator,milestone.reward,proof.proof)](contracts/task/MilestonePaymentTask.sol#L382)
		- [processingReward = (_rewardAmount * disputeResolver.getDisputeProcessingRewardBps()) / DenominatorFee](contracts/BaseTask.sol#L167)
		- [disputeResolver.fileDispute(address(this),_taskId,_worker,_taskCreator,_rewardAmount,_proof)](contracts/BaseTask.sol#L180-L187)
	Event emitted after the call(s):
	- [MilestonePaymentTask_DisputeFiledByWorker(_taskId,_milestoneIndex)](contracts/task/MilestonePaymentTask.sol#L384)

contracts/task/MilestonePaymentTask.sol#L346-L385


 - [ ] ID-8
Reentrancy in [FixedPaymentTask.terminateTask(uint256)](contracts/task/FixedPaymentTask.sol#L115-L147):
	External calls:
	- [submitDispute(_taskId,worker,task.creator,task.totalreward,proof.proof)](contracts/task/FixedPaymentTask.sol#L139)
		- [processingReward = (_rewardAmount * disputeResolver.getDisputeProcessingRewardBps()) / DenominatorFee](contracts/BaseTask.sol#L167)
		- [disputeResolver.fileDispute(address(this),_taskId,_worker,_taskCreator,_rewardAmount,_proof)](contracts/BaseTask.sol#L180-L187)
	Event emitted after the call(s):
	- [FixedPaymentTask_TaskCancelled(_taskId)](contracts/task/FixedPaymentTask.sol#L146)

contracts/task/FixedPaymentTask.sol#L115-L147


 - [ ] ID-9
Reentrancy in [BiddingTask.fileDisputeByWorker(uint256)](contracts/task/BiddingTask.sol#L294-L324):
	External calls:
	- [submitDispute(_taskId,msg.sender,task.creator,task.totalreward,proof.proof)](contracts/task/BiddingTask.sol#L322)
		- [processingReward = (_rewardAmount * disputeResolver.getDisputeProcessingRewardBps()) / DenominatorFee](contracts/BaseTask.sol#L167)
		- [disputeResolver.fileDispute(address(this),_taskId,_worker,_taskCreator,_rewardAmount,_proof)](contracts/BaseTask.sol#L180-L187)
	Event emitted after the call(s):
	- [BiddingTask_TaskCancelled(_taskId)](contracts/task/BiddingTask.sol#L323)

contracts/task/BiddingTask.sol#L294-L324


 - [ ] ID-10
Reentrancy in [BiddingTask.terminateTask(uint256)](contracts/task/BiddingTask.sol#L170-L203):
	External calls:
	- [submitDispute(_taskId,worker,task.creator,task.totalreward,proof.proof)](contracts/task/BiddingTask.sol#L195)
		- [processingReward = (_rewardAmount * disputeResolver.getDisputeProcessingRewardBps()) / DenominatorFee](contracts/BaseTask.sol#L167)
		- [disputeResolver.fileDispute(address(this),_taskId,_worker,_taskCreator,_rewardAmount,_proof)](contracts/BaseTask.sol#L180-L187)
	Event emitted after the call(s):
	- [BiddingTask_TaskCancelled(_taskId)](contracts/task/BiddingTask.sol#L202)

contracts/task/BiddingTask.sol#L170-L203


 - [ ] ID-11
Reentrancy in [FixedPaymentTask.fileDisputeByWorker(uint256)](contracts/task/FixedPaymentTask.sol#L237-L269):
	External calls:
	- [submitDispute(_taskId,msg.sender,task.creator,task.totalreward,proof.proof)](contracts/task/FixedPaymentTask.sol#L267)
		- [processingReward = (_rewardAmount * disputeResolver.getDisputeProcessingRewardBps()) / DenominatorFee](contracts/BaseTask.sol#L167)
		- [disputeResolver.fileDispute(address(this),_taskId,_worker,_taskCreator,_rewardAmount,_proof)](contracts/BaseTask.sol#L180-L187)
	Event emitted after the call(s):
	- [FixedPaymentTask_TaskCancelled(_taskId)](contracts/task/FixedPaymentTask.sol#L268)

contracts/task/FixedPaymentTask.sol#L237-L269


## timestamp
Impact: Low
Confidence: Medium
 - [ ] ID-12
[FixedPaymentTask.submitProofOfWork(uint256,string)](contracts/task/FixedPaymentTask.sol#L154-L177) uses timestamp for comparisons
	Dangerous comparisons:
	- [block.timestamp >= task.deadline](contracts/task/FixedPaymentTask.sol#L161)

contracts/task/FixedPaymentTask.sol#L154-L177


 - [ ] ID-13
[MilestonePaymentTask.fileDisputeByWorker(uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L346-L385) uses timestamp for comparisons
	Dangerous comparisons:
	- [block.timestamp < proof.submittedAt + minTimeBeforeDispute](contracts/task/MilestonePaymentTask.sol#L370)

contracts/task/MilestonePaymentTask.sol#L346-L385


 - [ ] ID-14
[BiddingTask.submitProofOfWork(uint256,string)](contracts/task/BiddingTask.sol#L210-L233) uses timestamp for comparisons
	Dangerous comparisons:
	- [block.timestamp >= task.deadline](contracts/task/BiddingTask.sol#L217)

contracts/task/BiddingTask.sol#L210-L233


 - [ ] ID-15
[BiddingTask.fileDisputeByWorker(uint256)](contracts/task/BiddingTask.sol#L294-L324) uses timestamp for comparisons
	Dangerous comparisons:
	- [block.timestamp < proof.submittedAt + minTimeBeforeDispute](contracts/task/BiddingTask.sol#L316)

contracts/task/BiddingTask.sol#L294-L324


 - [ ] ID-16
[BiddingTask.createTask(string,string,uint256)](contracts/task/BiddingTask.sol#L73-L92) uses timestamp for comparisons
	Dangerous comparisons:
	- [_deadline < block.timestamp](contracts/task/BiddingTask.sol#L78)

contracts/task/BiddingTask.sol#L73-L92


 - [ ] ID-17
[MilestonePaymentTask.createTask(string,string,uint256)](contracts/task/MilestonePaymentTask.sol#L86-L105) uses timestamp for comparisons
	Dangerous comparisons:
	- [_deadline < block.timestamp](contracts/task/MilestonePaymentTask.sol#L91)

contracts/task/MilestonePaymentTask.sol#L86-L105


 - [ ] ID-18
[MilestonePaymentTask.submitMilestoneProofOfWork(uint256,uint256,string)](contracts/task/MilestonePaymentTask.sol#L173-L199) uses timestamp for comparisons
	Dangerous comparisons:
	- [tasks[_taskId].deadline < block.timestamp](contracts/task/MilestonePaymentTask.sol#L185)

contracts/task/MilestonePaymentTask.sol#L173-L199


 - [ ] ID-19
[FixedPaymentTask.createTask(string,string,uint256)](contracts/task/FixedPaymentTask.sol#L55-L74) uses timestamp for comparisons
	Dangerous comparisons:
	- [_deadline < block.timestamp](contracts/task/FixedPaymentTask.sol#L60)

contracts/task/FixedPaymentTask.sol#L55-L74


 - [ ] ID-20
[BiddingTask.submitBid(uint256,uint256,string,uint256)](contracts/task/BiddingTask.sol#L101-L130) uses timestamp for comparisons
	Dangerous comparisons:
	- [block.timestamp > task.deadline](contracts/task/BiddingTask.sol#L122)

contracts/task/BiddingTask.sol#L101-L130


 - [ ] ID-21
[FixedPaymentTask.fileDisputeByWorker(uint256)](contracts/task/FixedPaymentTask.sol#L237-L269) uses timestamp for comparisons
	Dangerous comparisons:
	- [block.timestamp < proof.submittedAt + minTimeBeforeDispute](contracts/task/FixedPaymentTask.sol#L260)

contracts/task/FixedPaymentTask.sol#L237-L269


## assembly
Impact: Informational
Confidence: High
 - [ ] ID-22
[SafeERC20._callOptionalReturn(IERC20,bytes)](lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L173-L191) uses assembly
	- [INLINE ASM](lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L176-L186)

lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L173-L191


 - [ ] ID-23
[SafeERC20._callOptionalReturnBool(IERC20,bytes)](lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L201-L211) uses assembly
	- [INLINE ASM](lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L205-L209)

lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L201-L211


## pragma
Impact: Informational
Confidence: High
 - [ ] ID-24
4 different versions of Solidity are used:
	- Version constraint ^0.8.20 is used by:
		-[^0.8.20](contracts/BaseTask.sol#L2)
		-[^0.8.20](contracts/DisputeResolver.sol#L2)
		-[^0.8.20](contracts/TaskToken.sol#L2)
		-[^0.8.20](contracts/UserInfo.sol#L2)
		-[^0.8.20](contracts/interface/IDisputeResolver.sol#L2)
		-[^0.8.20](contracts/task/BiddingTask.sol#L2)
		-[^0.8.20](contracts/task/FixedPaymentTask.sol#L2)
		-[^0.8.20](contracts/task/MilestonePaymentTask.sol#L2)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/access/Ownable.sol#L4)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol#L4)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L4)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/utils/Context.sol#L4)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/utils/Pausable.sol#L4)
		-[^0.8.20](lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol#L4)
	- Version constraint >=0.6.2 is used by:
		-[>=0.6.2](lib/openzeppelin-contracts/contracts/interfaces/IERC1363.sol#L4)
		-[>=0.6.2](lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol#L4)
	- Version constraint >=0.4.16 is used by:
		-[>=0.4.16](lib/openzeppelin-contracts/contracts/interfaces/IERC165.sol#L4)
		-[>=0.4.16](lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol#L4)
		-[>=0.4.16](lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol#L4)
		-[>=0.4.16](lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol#L4)
	- Version constraint >=0.8.4 is used by:
		-[>=0.8.4](lib/openzeppelin-contracts/contracts/interfaces/draft-IERC6093.sol#L3)

contracts/BaseTask.sol#L2


## costly-loop
Impact: Informational
Confidence: Medium
 - [ ] ID-25
[MilestonePaymentTask.payMilestone(uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L257-L290) has costly operations inside a loop:
	- [totalPlatformRevenue += fee](contracts/task/MilestonePaymentTask.sol#L279)
	Calls stack containing the loop:
		MilestonePaymentTask.terminateTask(uint256)

contracts/task/MilestonePaymentTask.sol#L257-L290


## solc-version
Impact: Informational
Confidence: High
 - [ ] ID-26
Version constraint ^0.8.20 contains known severe issues (https://solidity.readthedocs.io/en/latest/bugs.html)
	- VerbatimInvalidDeduplication
	- FullInlinerNonExpressionSplitArgumentEvaluationOrder
	- MissingSideEffectsOnSelectorAccess.
It is used by:
	- [^0.8.20](contracts/BaseTask.sol#L2)
	- [^0.8.20](contracts/DisputeResolver.sol#L2)
	- [^0.8.20](contracts/TaskToken.sol#L2)
	- [^0.8.20](contracts/UserInfo.sol#L2)
	- [^0.8.20](contracts/interface/IDisputeResolver.sol#L2)
	- [^0.8.20](contracts/task/BiddingTask.sol#L2)
	- [^0.8.20](contracts/task/FixedPaymentTask.sol#L2)
	- [^0.8.20](contracts/task/MilestonePaymentTask.sol#L2)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/access/Ownable.sol#L4)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol#L4)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol#L4)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/utils/Context.sol#L4)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/utils/Pausable.sol#L4)
	- [^0.8.20](lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol#L4)

contracts/BaseTask.sol#L2


 - [ ] ID-27
Version constraint >=0.8.4 contains known severe issues (https://solidity.readthedocs.io/en/latest/bugs.html)
	- FullInlinerNonExpressionSplitArgumentEvaluationOrder
	- MissingSideEffectsOnSelectorAccess
	- AbiReencodingHeadOverflowWithStaticArrayCleanup
	- DirtyBytesArrayToStorage
	- DataLocationChangeInInternalOverride
	- NestedCalldataArrayAbiReencodingSizeValidation
	- SignedImmutables.
It is used by:
	- [>=0.8.4](lib/openzeppelin-contracts/contracts/interfaces/draft-IERC6093.sol#L3)

lib/openzeppelin-contracts/contracts/interfaces/draft-IERC6093.sol#L3


 - [ ] ID-28
Version constraint >=0.4.16 contains known severe issues (https://solidity.readthedocs.io/en/latest/bugs.html)
	- DirtyBytesArrayToStorage
	- ABIDecodeTwoDimensionalArrayMemory
	- KeccakCaching
	- EmptyByteArrayCopy
	- DynamicArrayCleanup
	- ImplicitConstructorCallvalueCheck
	- TupleAssignmentMultiStackSlotComponents
	- MemoryArrayCreationOverflow
	- privateCanBeOverridden
	- SignedArrayStorageCopy
	- ABIEncoderV2StorageArrayWithMultiSlotElement
	- DynamicConstructorArgumentsClippedABIV2
	- UninitializedFunctionPointerInConstructor_0.4.x
	- IncorrectEventSignatureInLibraries_0.4.x
	- ExpExponentCleanup
	- NestedArrayFunctionCallDecoder
	- ZeroFunctionSelector.
It is used by:
	- [>=0.4.16](lib/openzeppelin-contracts/contracts/interfaces/IERC165.sol#L4)
	- [>=0.4.16](lib/openzeppelin-contracts/contracts/interfaces/IERC20.sol#L4)
	- [>=0.4.16](lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol#L4)
	- [>=0.4.16](lib/openzeppelin-contracts/contracts/utils/introspection/IERC165.sol#L4)

lib/openzeppelin-contracts/contracts/interfaces/IERC165.sol#L4


 - [ ] ID-29
Version constraint >=0.6.2 contains known severe issues (https://solidity.readthedocs.io/en/latest/bugs.html)
	- MissingSideEffectsOnSelectorAccess
	- AbiReencodingHeadOverflowWithStaticArrayCleanup
	- DirtyBytesArrayToStorage
	- NestedCalldataArrayAbiReencodingSizeValidation
	- ABIDecodeTwoDimensionalArrayMemory
	- KeccakCaching
	- EmptyByteArrayCopy
	- DynamicArrayCleanup
	- MissingEscapingInFormatting
	- ArraySliceDynamicallyEncodedBaseType
	- ImplicitConstructorCallvalueCheck
	- TupleAssignmentMultiStackSlotComponents
	- MemoryArrayCreationOverflow.
It is used by:
	- [>=0.6.2](lib/openzeppelin-contracts/contracts/interfaces/IERC1363.sol#L4)
	- [>=0.6.2](lib/openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol#L4)

lib/openzeppelin-contracts/contracts/interfaces/IERC1363.sol#L4


## missing-inheritance
Impact: Informational
Confidence: High
 - [ ] ID-30
[DisputeResolver](contracts/DisputeResolver.sol#L13-L451) should inherit from [IDisputeResolver](contracts/interface/IDisputeResolver.sol#L4-L15)

contracts/DisputeResolver.sol#L13-L451


## naming-convention
Impact: Informational
Confidence: High
 - [ ] ID-31
Parameter [DisputeResolver.fileDispute(address,uint256,address,address,uint256,string)._taskCreator](contracts/DisputeResolver.sol#L179) is not in mixedCase

contracts/DisputeResolver.sol#L179


 - [ ] ID-32
Parameter [BaseTask.updatePlatformFee(uint256)._newFee](contracts/BaseTask.sol#L194) is not in mixedCase

contracts/BaseTask.sol#L194


 - [ ] ID-33
Parameter [BiddingTask.fileDisputeByWorker(uint256)._taskId](contracts/task/BiddingTask.sol#L294) is not in mixedCase

contracts/task/BiddingTask.sol#L294


 - [ ] ID-34
Parameter [BiddingTask.getBid(uint256,uint256)._bidIndex](contracts/task/BiddingTask.sol#L346) is not in mixedCase

contracts/task/BiddingTask.sol#L346


 - [ ] ID-35
Event [MilestonePaymentTask.MilestonePaymentTask_TaskCompleted(uint256)](contracts/task/MilestonePaymentTask.sol#L60) is not in CapWords

contracts/task/MilestonePaymentTask.sol#L60


 - [ ] ID-36
Event [MilestonePaymentTask.MilestonePaymentTask_TaskCancelled(uint256)](contracts/task/MilestonePaymentTask.sol#L47) is not in CapWords

contracts/task/MilestonePaymentTask.sol#L47


 - [ ] ID-37
Parameter [DisputeResolver.approveProposal(uint256)._disputeId](contracts/DisputeResolver.sol#L301) is not in mixedCase

contracts/DisputeResolver.sol#L301


 - [ ] ID-38
Parameter [BiddingTask.payTask(uint256)._taskId](contracts/task/BiddingTask.sol#L262) is not in mixedCase

contracts/task/BiddingTask.sol#L262


 - [ ] ID-39
Event [MilestonePaymentTask.MilestonePaymentTask_DisputeFiledByWorker(uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L51) is not in CapWords

contracts/task/MilestonePaymentTask.sol#L51


 - [ ] ID-40
Parameter [BiddingTask.submitBid(uint256,uint256,string,uint256)._estimatedTime](contracts/task/BiddingTask.sol#L101) is not in mixedCase

contracts/task/BiddingTask.sol#L101


 - [ ] ID-41
Parameter [BiddingTask.submitBid(uint256,uint256,string,uint256)._amount](contracts/task/BiddingTask.sol#L101) is not in mixedCase

contracts/task/BiddingTask.sol#L101


 - [ ] ID-42
Parameter [DisputeResolver.fileDispute(address,uint256,address,address,uint256,string)._rewardAmount](contracts/DisputeResolver.sol#L180) is not in mixedCase

contracts/DisputeResolver.sol#L180


 - [ ] ID-43
Parameter [FixedPaymentTask.submitProofOfWork(uint256,string)._taskId](contracts/task/FixedPaymentTask.sol#L154) is not in mixedCase

contracts/task/FixedPaymentTask.sol#L154


 - [ ] ID-44
Parameter [MilestonePaymentTask.completeTask(uint256)._taskId](contracts/task/MilestonePaymentTask.sol#L233) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L233


 - [ ] ID-45
Parameter [BiddingTask.createTask(string,string,uint256)._title](contracts/task/BiddingTask.sol#L73) is not in mixedCase

contracts/task/BiddingTask.sol#L73


 - [ ] ID-46
Event [BiddingTask.BiddingTask_ProofOfWorkApproved(uint256)](contracts/task/BiddingTask.sol#L54) is not in CapWords

contracts/task/BiddingTask.sol#L54


 - [ ] ID-47
Parameter [DisputeResolver.voteOnDispute(uint256,uint256)._workerShare](contracts/DisputeResolver.sol#L225) is not in mixedCase

contracts/DisputeResolver.sol#L225


 - [ ] ID-48
Parameter [MilestonePaymentTask.getMilestone(uint256,uint256)._taskId](contracts/task/MilestonePaymentTask.sol#L429) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L429


 - [ ] ID-49
Event [MilestonePaymentTask.MilestonePaymentTask_MilestonePaid(uint256,uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L49) is not in CapWords

contracts/task/MilestonePaymentTask.sol#L49


 - [ ] ID-50
Parameter [BiddingTask.submitBid(uint256,uint256,string,uint256)._taskId](contracts/task/BiddingTask.sol#L101) is not in mixedCase

contracts/task/BiddingTask.sol#L101


 - [ ] ID-51
Parameter [MilestonePaymentTask.submitMilestoneProofOfWork(uint256,uint256,string)._milestoneIndex](contracts/task/MilestonePaymentTask.sol#L173) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L173


 - [ ] ID-52
Parameter [BaseTask.submitDispute(uint256,address,address,uint256,string)._taskId](contracts/BaseTask.sol#L160) is not in mixedCase

contracts/BaseTask.sol#L160


 - [ ] ID-53
Modifier [MilestonePaymentTask.InvalidMilestoneIndex(uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L65-L71) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L65-L71


 - [ ] ID-54
Parameter [BiddingTask.acceptBid(uint256,uint256)._taskId](contracts/task/BiddingTask.sol#L137) is not in mixedCase

contracts/task/BiddingTask.sol#L137


 - [ ] ID-55
Parameter [MilestonePaymentTask.getMilestonesCount(uint256)._taskId](contracts/task/MilestonePaymentTask.sol#L419) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L419


 - [ ] ID-56
Parameter [DisputeResolver.voteOnDispute(uint256,uint256)._disputeId](contracts/DisputeResolver.sol#L225) is not in mixedCase

contracts/DisputeResolver.sol#L225


 - [ ] ID-57
Parameter [MilestonePaymentTask.addMilestone(uint256,string,uint256)._reward](contracts/task/MilestonePaymentTask.sol#L140) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L140


 - [ ] ID-58
Parameter [BaseTask.submitDispute(uint256,address,address,uint256,string)._taskCreator](contracts/BaseTask.sol#L162) is not in mixedCase

contracts/BaseTask.sol#L162


 - [ ] ID-59
Parameter [DisputeResolver.processVotes(uint256)._disputeId](contracts/DisputeResolver.sol#L266) is not in mixedCase

contracts/DisputeResolver.sol#L266


 - [ ] ID-60
Parameter [BiddingTask.terminateTask(uint256)._taskId](contracts/task/BiddingTask.sol#L170) is not in mixedCase

contracts/task/BiddingTask.sol#L170


 - [ ] ID-61
Event [BiddingTask.BiddingTask_TaskCancelled(uint256)](contracts/task/BiddingTask.sol#L48) is not in CapWords

contracts/task/BiddingTask.sol#L48


 - [ ] ID-62
Parameter [BaseTask.changedeadline(uint256,uint256)._deadline](contracts/BaseTask.sol#L233) is not in mixedCase

contracts/BaseTask.sol#L233


 - [ ] ID-63
Parameter [DisputeResolver.getDispute(uint256)._disputeId](contracts/DisputeResolver.sol#L435) is not in mixedCase

contracts/DisputeResolver.sol#L435


 - [ ] ID-64
Parameter [DisputeResolver.fileDispute(address,uint256,address,address,uint256,string)._taskContract](contracts/DisputeResolver.sol#L176) is not in mixedCase

contracts/DisputeResolver.sol#L176


 - [ ] ID-65
Parameter [FixedPaymentTask.payTask(uint256)._taskId](contracts/task/FixedPaymentTask.sol#L205) is not in mixedCase

contracts/task/FixedPaymentTask.sol#L205


 - [ ] ID-66
Event [MilestonePaymentTask.MilestonePaymentTask_TaskWorkerAdded(uint256,address)](contracts/task/MilestonePaymentTask.sol#L46) is not in CapWords

contracts/task/MilestonePaymentTask.sol#L46


 - [ ] ID-67
Event [BiddingTask.BiddingTask_TaskWorkerAdded(uint256,address,uint256)](contracts/task/BiddingTask.sol#L46) is not in CapWords

contracts/task/BiddingTask.sol#L46


 - [ ] ID-68
Parameter [DisputeResolver.distributeFunds(uint256)._disputeId](contracts/DisputeResolver.sol#L335) is not in mixedCase

contracts/DisputeResolver.sol#L335


 - [ ] ID-69
Event [FixedPaymentTask.FixedPaymentTask_TaskWorkerRemoved(uint256,address)](contracts/task/FixedPaymentTask.sol#L32) is not in CapWords

contracts/task/FixedPaymentTask.sol#L32


 - [ ] ID-70
Parameter [BaseTask.submitDispute(uint256,address,address,uint256,string)._proof](contracts/BaseTask.sol#L164) is not in mixedCase

contracts/BaseTask.sol#L164


 - [ ] ID-71
Parameter [DisputeResolver.fileDispute(address,uint256,address,address,uint256,string)._taskId](contracts/DisputeResolver.sol#L177) is not in mixedCase

contracts/DisputeResolver.sol#L177


 - [ ] ID-72
Parameter [BiddingTask.approveProofOfWork(uint256)._taskId](contracts/task/BiddingTask.sol#L239) is not in mixedCase

contracts/task/BiddingTask.sol#L239


 - [ ] ID-73
Parameter [BiddingTask.getBid(uint256,uint256)._taskId](contracts/task/BiddingTask.sol#L346) is not in mixedCase

contracts/task/BiddingTask.sol#L346


 - [ ] ID-74
Parameter [BiddingTask.submitProofOfWork(uint256,string)._taskId](contracts/task/BiddingTask.sol#L210) is not in mixedCase

contracts/task/BiddingTask.sol#L210


 - [ ] ID-75
Parameter [DisputeResolver.rejectProposal(uint256)._disputeId](contracts/DisputeResolver.sol#L387) is not in mixedCase

contracts/DisputeResolver.sol#L387


 - [ ] ID-76
Parameter [BiddingTask.submitBid(uint256,uint256,string,uint256)._description](contracts/task/BiddingTask.sol#L101) is not in mixedCase

contracts/task/BiddingTask.sol#L101


 - [ ] ID-77
Parameter [MilestonePaymentTask.submitMilestoneProofOfWork(uint256,uint256,string)._taskId](contracts/task/MilestonePaymentTask.sol#L173) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L173


 - [ ] ID-78
Event [FixedPaymentTask.FixedPaymentTask_TaskPaid(uint256,uint256)](contracts/task/FixedPaymentTask.sol#L34) is not in CapWords

contracts/task/FixedPaymentTask.sol#L34


 - [ ] ID-79
Parameter [MilestonePaymentTask.createTask(string,string,uint256)._deadline](contracts/task/MilestonePaymentTask.sol#L86) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L86


 - [ ] ID-80
Parameter [MilestonePaymentTask.fileDisputeByWorker(uint256,uint256)._taskId](contracts/task/MilestonePaymentTask.sol#L346) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L346


 - [ ] ID-81
Parameter [BaseTask.submitDispute(uint256,address,address,uint256,string)._rewardAmount](contracts/BaseTask.sol#L163) is not in mixedCase

contracts/BaseTask.sol#L163


 - [ ] ID-82
Parameter [BaseTask.getTask(uint256)._taskId](contracts/BaseTask.sol#L249) is not in mixedCase

contracts/BaseTask.sol#L249


 - [ ] ID-83
Parameter [BaseTask.submitDispute(uint256,address,address,uint256,string)._worker](contracts/BaseTask.sol#L161) is not in mixedCase

contracts/BaseTask.sol#L161


 - [ ] ID-84
Event [DisputeResolver.DisputeResolver_DisputeFiled(uint256,uint256,address,address,address,uint256,string)](contracts/DisputeResolver.sol#L86-L94) is not in CapWords

contracts/DisputeResolver.sol#L86-L94


 - [ ] ID-85
Parameter [FixedPaymentTask.createTask(string,string,uint256)._description](contracts/task/FixedPaymentTask.sol#L55) is not in mixedCase

contracts/task/FixedPaymentTask.sol#L55


 - [ ] ID-86
Event [BiddingTask.BiddingTask_ProofOfWorkSubmitted(uint256,string)](contracts/task/BiddingTask.sol#L52) is not in CapWords

contracts/task/BiddingTask.sol#L52


 - [ ] ID-87
Event [DisputeResolver.DisputeResolver_AdminStaked(address,uint256)](contracts/DisputeResolver.sol#L106) is not in CapWords

contracts/DisputeResolver.sol#L106


 - [ ] ID-88
Event [MilestonePaymentTask.MilestonePaymentTask_MilestoneApproved(uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L48) is not in CapWords

contracts/task/MilestonePaymentTask.sol#L48


 - [ ] ID-89
Event [FixedPaymentTask.FixedPaymentTask_ProofOfWorkSubmitted(uint256,string)](contracts/task/FixedPaymentTask.sol#L35) is not in CapWords

contracts/task/FixedPaymentTask.sol#L35


 - [ ] ID-90
Event [DisputeResolver.DisputeResolver_ProposalApprovedByCreator(uint256,address)](contracts/DisputeResolver.sol#L100) is not in CapWords

contracts/DisputeResolver.sol#L100


 - [ ] ID-91
Parameter [MilestonePaymentTask.addWorker(uint256,address)._worker](contracts/task/MilestonePaymentTask.sol#L112) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L112


 - [ ] ID-92
Event [DisputeResolver.DisputeResolver_DisputeResolved(uint256,uint256)](contracts/DisputeResolver.sol#L96) is not in CapWords

contracts/DisputeResolver.sol#L96


 - [ ] ID-93
Event [MilestonePaymentTask.MilestonePaymentTask_MilestoneRewardIncreased(uint256,uint256,uint256)](contracts/task/MilestonePaymentTask.sol#L63) is not in CapWords

contracts/task/MilestonePaymentTask.sol#L63


 - [ ] ID-94
Event [MilestonePaymentTask.MilestonePaymentTask_ProofOfWorkSubmitted(uint256,uint256,string)](contracts/task/MilestonePaymentTask.sol#L50) is not in CapWords

contracts/task/MilestonePaymentTask.sol#L50


 - [ ] ID-95
Constant [BaseTask.minTimeBeforeDispute](contracts/BaseTask.sol#L65) is not in UPPER_CASE_WITH_UNDERSCORES

contracts/BaseTask.sol#L65


 - [ ] ID-96
Event [FixedPaymentTask.FixedPaymentTask_TaskCancelled(uint256)](contracts/task/FixedPaymentTask.sol#L33) is not in CapWords

contracts/task/FixedPaymentTask.sol#L33


 - [ ] ID-97
Event [DisputeResolver.DisputeResolver_ProposalRejected(uint256)](contracts/DisputeResolver.sol#L104) is not in CapWords

contracts/DisputeResolver.sol#L104


 - [ ] ID-98
Parameter [MilestonePaymentTask.createTask(string,string,uint256)._title](contracts/task/MilestonePaymentTask.sol#L86) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L86


 - [ ] ID-99
Event [DisputeResolver.DisputeResolver_AdminWithdrawn(address,uint256)](contracts/DisputeResolver.sol#L108) is not in CapWords

contracts/DisputeResolver.sol#L108


 - [ ] ID-100
Parameter [DisputeResolver.fileDispute(address,uint256,address,address,uint256,string)._proof](contracts/DisputeResolver.sol#L181) is not in mixedCase

contracts/DisputeResolver.sol#L181


 - [ ] ID-101
Event [DisputeResolver.DisputeResolver_FundsDistributed(uint256)](contracts/DisputeResolver.sol#L102) is not in CapWords

contracts/DisputeResolver.sol#L102


 - [ ] ID-102
Parameter [FixedPaymentTask.addWorker(uint256,address,uint256)._taskId](contracts/task/FixedPaymentTask.sol#L81) is not in mixedCase

contracts/task/FixedPaymentTask.sol#L81


 - [ ] ID-103
Parameter [FixedPaymentTask.terminateTask(uint256)._taskId](contracts/task/FixedPaymentTask.sol#L115) is not in mixedCase

contracts/task/FixedPaymentTask.sol#L115


 - [ ] ID-104
Parameter [MilestonePaymentTask.payMilestone(uint256,uint256)._taskId](contracts/task/MilestonePaymentTask.sol#L257) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L257


 - [ ] ID-105
Parameter [FixedPaymentTask.fileDisputeByWorker(uint256)._taskId](contracts/task/FixedPaymentTask.sol#L237) is not in mixedCase

contracts/task/FixedPaymentTask.sol#L237


 - [ ] ID-106
Parameter [FixedPaymentTask.submitProofOfWork(uint256,string)._proof](contracts/task/FixedPaymentTask.sol#L154) is not in mixedCase

contracts/task/FixedPaymentTask.sol#L154


 - [ ] ID-107
Event [BiddingTask.BiddingTask_TaskPaid(uint256,uint256)](contracts/task/BiddingTask.sol#L50) is not in CapWords

contracts/task/BiddingTask.sol#L50


 - [ ] ID-108
Parameter [MilestonePaymentTask.terminateTask(uint256)._taskId](contracts/task/MilestonePaymentTask.sol#L296) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L296


 - [ ] ID-109
Event [MilestonePaymentTask.MilestonePaymentTask_MilestoneAdded(uint256,uint256,string,uint256)](contracts/task/MilestonePaymentTask.sol#L52-L54) is not in CapWords

contracts/task/MilestonePaymentTask.sol#L52-L54


 - [ ] ID-110
Parameter [BiddingTask.acceptBid(uint256,uint256)._bidIndex](contracts/task/BiddingTask.sol#L137) is not in mixedCase

contracts/task/BiddingTask.sol#L137


 - [ ] ID-111
Parameter [BiddingTask.createTask(string,string,uint256)._deadline](contracts/task/BiddingTask.sol#L73) is not in mixedCase

contracts/task/BiddingTask.sol#L73


 - [ ] ID-112
Parameter [BiddingTask.createTask(string,string,uint256)._description](contracts/task/BiddingTask.sol#L73) is not in mixedCase

contracts/task/BiddingTask.sol#L73


 - [ ] ID-113
Parameter [FixedPaymentTask.addWorker(uint256,address,uint256)._worker](contracts/task/FixedPaymentTask.sol#L81) is not in mixedCase

contracts/task/FixedPaymentTask.sol#L81


 - [ ] ID-114
Parameter [MilestonePaymentTask.increaseMilestoneReward(uint256,uint256,uint256)._taskId](contracts/task/MilestonePaymentTask.sol#L393) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L393


 - [ ] ID-115
Parameter [MilestonePaymentTask.fileDisputeByWorker(uint256,uint256)._milestoneIndex](contracts/task/MilestonePaymentTask.sol#L346) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L346


 - [ ] ID-116
Parameter [FixedPaymentTask.createTask(string,string,uint256)._deadline](contracts/task/FixedPaymentTask.sol#L55) is not in mixedCase

contracts/task/FixedPaymentTask.sol#L55


 - [ ] ID-117
Parameter [BiddingTask.increaseReward(uint256,uint256)._taskId](contracts/task/BiddingTask.sol#L326) is not in mixedCase

contracts/task/BiddingTask.sol#L326


 - [ ] ID-118
Parameter [MilestonePaymentTask.increaseMilestoneReward(uint256,uint256,uint256)._reward](contracts/task/MilestonePaymentTask.sol#L393) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L393


 - [ ] ID-119
Parameter [DisputeResolver.getAdminStake(address)._admin](contracts/DisputeResolver.sol#L444) is not in mixedCase

contracts/DisputeResolver.sol#L444


 - [ ] ID-120
Parameter [FixedPaymentTask.increaseReward(uint256,uint256)._taskId](contracts/task/FixedPaymentTask.sol#L271) is not in mixedCase

contracts/task/FixedPaymentTask.sol#L271


 - [ ] ID-121
Event [DisputeResolver.DisputeResolver_ProposalApprovedByWorker(uint256,address)](contracts/DisputeResolver.sol#L98) is not in CapWords

contracts/DisputeResolver.sol#L98


 - [ ] ID-122
Parameter [FixedPaymentTask.approveProofOfWork(uint256)._taskId](contracts/task/FixedPaymentTask.sol#L183) is not in mixedCase

contracts/task/FixedPaymentTask.sol#L183


 - [ ] ID-123
Parameter [DisputeResolver.fileDispute(address,uint256,address,address,uint256,string)._worker](contracts/DisputeResolver.sol#L178) is not in mixedCase

contracts/DisputeResolver.sol#L178


 - [ ] ID-124
Parameter [MilestonePaymentTask.addWorker(uint256,address)._taskId](contracts/task/MilestonePaymentTask.sol#L112) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L112


 - [ ] ID-125
Parameter [MilestonePaymentTask.approveMilestone(uint256,uint256)._milestoneIndex](contracts/task/MilestonePaymentTask.sol#L206) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L206


 - [ ] ID-126
Event [FixedPaymentTask.FixedPaymentTask_ProofOfWorkApproved(uint256)](contracts/task/FixedPaymentTask.sol#L36) is not in CapWords

contracts/task/FixedPaymentTask.sol#L36


 - [ ] ID-127
Parameter [FixedPaymentTask.increaseReward(uint256,uint256)._reward](contracts/task/FixedPaymentTask.sol#L271) is not in mixedCase

contracts/task/FixedPaymentTask.sol#L271


 - [ ] ID-128
Event [FixedPaymentTask.FixedPaymentTask_TaskWorkerAdded(uint256,address,uint256)](contracts/task/FixedPaymentTask.sol#L31) is not in CapWords

contracts/task/FixedPaymentTask.sol#L31


 - [ ] ID-129
Parameter [MilestonePaymentTask.createTask(string,string,uint256)._description](contracts/task/MilestonePaymentTask.sol#L86) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L86


 - [ ] ID-130
Parameter [MilestonePaymentTask.submitMilestoneProofOfWork(uint256,uint256,string)._proof](contracts/task/MilestonePaymentTask.sol#L173) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L173


 - [ ] ID-131
Parameter [MilestonePaymentTask.addMilestone(uint256,string,uint256)._description](contracts/task/MilestonePaymentTask.sol#L140) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L140


 - [ ] ID-132
Parameter [MilestonePaymentTask.getMilestone(uint256,uint256)._milestoneIndex](contracts/task/MilestonePaymentTask.sol#L429) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L429


 - [ ] ID-133
Parameter [MilestonePaymentTask.approveMilestone(uint256,uint256)._taskId](contracts/task/MilestonePaymentTask.sol#L206) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L206


 - [ ] ID-134
Event [BiddingTask.BiddingTask_BidSubmitted(uint256,address,uint256,uint256,string)](contracts/task/BiddingTask.sol#L42-L44) is not in CapWords

contracts/task/BiddingTask.sol#L42-L44


 - [ ] ID-135
Parameter [BiddingTask.submitProofOfWork(uint256,string)._proof](contracts/task/BiddingTask.sol#L210) is not in mixedCase

contracts/task/BiddingTask.sol#L210


 - [ ] ID-136
Parameter [FixedPaymentTask.addWorker(uint256,address,uint256)._reward](contracts/task/FixedPaymentTask.sol#L81) is not in mixedCase

contracts/task/FixedPaymentTask.sol#L81


 - [ ] ID-137
Parameter [MilestonePaymentTask.payMilestone(uint256,uint256)._milestoneIndex](contracts/task/MilestonePaymentTask.sol#L257) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L257


 - [ ] ID-138
Parameter [BaseTask.changedeadline(uint256,uint256)._taskId](contracts/BaseTask.sol#L233) is not in mixedCase

contracts/BaseTask.sol#L233


 - [ ] ID-139
Parameter [MilestonePaymentTask.increaseMilestoneReward(uint256,uint256,uint256)._milestoneIndex](contracts/task/MilestonePaymentTask.sol#L393) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L393


 - [ ] ID-140
Event [DisputeResolver.DisputeResolver_AdminVoted(uint256,address,uint256)](contracts/DisputeResolver.sol#L110) is not in CapWords

contracts/DisputeResolver.sol#L110


 - [ ] ID-141
Parameter [MilestonePaymentTask.addMilestone(uint256,string,uint256)._taskId](contracts/task/MilestonePaymentTask.sol#L140) is not in mixedCase

contracts/task/MilestonePaymentTask.sol#L140


 - [ ] ID-142
Parameter [BiddingTask.increaseReward(uint256,uint256)._reward](contracts/task/BiddingTask.sol#L326) is not in mixedCase

contracts/task/BiddingTask.sol#L326


 - [ ] ID-143
Parameter [FixedPaymentTask.createTask(string,string,uint256)._title](contracts/task/FixedPaymentTask.sol#L55) is not in mixedCase

contracts/task/FixedPaymentTask.sol#L55


## immutable-states
Impact: Optimization
Confidence: High
 - [ ] ID-144
[BaseTask.taskToken](contracts/BaseTask.sol#L74) should be immutable 

contracts/BaseTask.sol#L74


 - [ ] ID-145
[BaseTask.disputeResolver](contracts/BaseTask.sol#L77) should be immutable 

contracts/BaseTask.sol#L77


