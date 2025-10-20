import { 
  ProjectCreated, 
  ParticipantJoined, 
  ProjectCompleted, 
  FundsWithdrawn, 
  AllowenceIncreased, 
  ProjectFailed 
} from "../generated/CollectiveRental/CollectiveRental";
import { User, RentalProject, RentalProjectParticipant } from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";

export function handleProjectCreated(event: ProjectCreated): void {
  // Create or get user
  let user = User.load(event.params.creator.toHex());
  if (user == null) {
    user = new User(event.params.creator.toHex());
    user.address = event.params.creator;
    user.save();
  }

  // Create RentalProject entity
  let project = new RentalProject(event.params.id.toString());
  project.projectId = event.params.id;
  project.creator = user.id;
  project.description = event.params.description;
  project.depositPerPerson = event.params.depositPerPerson;
  project.participantGoal = event.params.participantGoal;
  project.currentParticipants = BigInt.fromI32(0);
  project.deadline = event.params.deadline;
  project.currentDeposits = BigInt.fromI32(0);
  project.allowance = BigInt.fromI32(0);
  project.alreadyWithdrawAmount = BigInt.fromI32(0);
  project.completed = false;
  project.isSuccessful = false;
  project.createdAt = event.block.timestamp;
  project.updatedAt = event.block.timestamp;

  project.save();
}

export function handleParticipantJoined(event: ParticipantJoined): void {
  // Create or get participant user
  let participant = User.load(event.params.participant.toHex());
  if (participant == null) {
    participant = new User(event.params.participant.toHex());
    participant.address = event.params.participant;
    participant.save();
  }

  // Create RentalProjectParticipant entity
  let projectParticipant = new RentalProjectParticipant(
    event.params.id.toString() + "-" + event.params.participant.toHex()
  );
  
  projectParticipant.project = event.params.id.toString();
  projectParticipant.participant = participant.id;
  projectParticipant.depositAmount = event.params.depositAmount;
  projectParticipant.joinedAt = event.block.timestamp;

  projectParticipant.save();

  // Update project
  let project = RentalProject.load(event.params.id.toString());
  if (project != null) {
    project.currentParticipants = event.params.currentParticipants;
    project.currentDeposits = project.currentDeposits.plus(event.params.depositAmount);
    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

export function handleProjectCompleted(event: ProjectCompleted): void {
  let project = RentalProject.load(event.params.id.toString());
  
  if (project != null) {
    project.completed = true;
    project.isSuccessful = event.params.isSuccessful;
    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

export function handleFundsWithdrawn(event: FundsWithdrawn): void {
  let project = RentalProject.load(event.params.id.toString());
  
  if (project != null) {
    project.alreadyWithdrawAmount = project.alreadyWithdrawAmount.plus(event.params.amount);
    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

export function handleAllowenceIncreased(event: AllowenceIncreased): void {
  let project = RentalProject.load(event.params.id.toString());
  
  if (project != null) {
    project.allowance = event.params.allowence;
    project.updatedAt = event.block.timestamp;
    project.save();
  }
}

export function handleProjectFailed(event: ProjectFailed): void {
  let project = RentalProject.load(event.params.id.toString());
  
  if (project != null) {
    project.isSuccessful = false;
    project.allowance = BigInt.fromI32(0);
    project.updatedAt = event.block.timestamp;
    project.save();
  }
}
