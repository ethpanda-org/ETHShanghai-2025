import { BigInt, Address } from "@graphprotocol/graph-ts"
import {
  CheckIn,
  ClaimStarted,
  ClaimCancelled,
  ClaimFinalized
} from "../generated/DeadManSwitchModule/DeadManSwitchModule"
import {
  DeadManSwitch,
  CheckInEvent,
  ClaimStartedEvent,
  ClaimCancelledEvent,
  ClaimFinalizedEvent
} from "../generated/schema"

function getOrCreateDeadManSwitch(contractAddress: Address): DeadManSwitch {
  let id = contractAddress.toHex()
  let deadManSwitch = DeadManSwitch.load(id)

  if (deadManSwitch == null) {
    deadManSwitch = new DeadManSwitch(id)
    deadManSwitch.safe = Address.zero()
    deadManSwitch.beneficiary = Address.zero()
    deadManSwitch.heartbeatInterval = BigInt.zero()
    deadManSwitch.challengePeriod = BigInt.zero()
    deadManSwitch.lastCheckIn = BigInt.zero()
    deadManSwitch.claimReadyAt = BigInt.zero()
    deadManSwitch.currentOwner = Address.zero()
    deadManSwitch.isClaimActive = false
    deadManSwitch.createdAt = BigInt.zero()
    deadManSwitch.updatedAt = BigInt.zero()
    deadManSwitch.save()
  }

  return deadManSwitch
}

export function handleCheckIn(event: CheckIn): void {
  let deadManSwitch = getOrCreateDeadManSwitch(event.address)

  // Update DeadManSwitch state
  deadManSwitch.lastCheckIn = event.params.timestamp
  deadManSwitch.claimReadyAt = BigInt.zero()
  deadManSwitch.isClaimActive = false
  deadManSwitch.updatedAt = event.block.timestamp

  if (deadManSwitch.createdAt == BigInt.zero()) {
    deadManSwitch.createdAt = event.block.timestamp
  }

  deadManSwitch.save()

  // Create CheckInEvent entity
  let checkInEvent = new CheckInEvent(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  checkInEvent.deadManSwitch = deadManSwitch.id
  checkInEvent.timestamp = event.params.timestamp
  checkInEvent.blockNumber = event.block.number
  checkInEvent.txHash = event.transaction.hash
  checkInEvent.save()
}

export function handleClaimStarted(event: ClaimStarted): void {
  let deadManSwitch = getOrCreateDeadManSwitch(event.address)

  // Update DeadManSwitch state
  deadManSwitch.claimReadyAt = event.params.claimReadyAt
  deadManSwitch.isClaimActive = true
  deadManSwitch.updatedAt = event.block.timestamp

  if (deadManSwitch.createdAt == BigInt.zero()) {
    deadManSwitch.createdAt = event.block.timestamp
  }

  deadManSwitch.save()

  // Create ClaimStartedEvent entity
  let claimStartedEvent = new ClaimStartedEvent(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  claimStartedEvent.deadManSwitch = deadManSwitch.id
  claimStartedEvent.claimReadyAt = event.params.claimReadyAt
  claimStartedEvent.timestamp = event.block.timestamp
  claimStartedEvent.blockNumber = event.block.number
  claimStartedEvent.txHash = event.transaction.hash
  claimStartedEvent.save()
}

export function handleClaimCancelled(event: ClaimCancelled): void {
  let deadManSwitch = getOrCreateDeadManSwitch(event.address)

  // Update DeadManSwitch state
  deadManSwitch.claimReadyAt = BigInt.zero()
  deadManSwitch.isClaimActive = false
  deadManSwitch.updatedAt = event.block.timestamp

  if (deadManSwitch.createdAt == BigInt.zero()) {
    deadManSwitch.createdAt = event.block.timestamp
  }

  deadManSwitch.save()

  // Create ClaimCancelledEvent entity
  let claimCancelledEvent = new ClaimCancelledEvent(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  claimCancelledEvent.deadManSwitch = deadManSwitch.id
  claimCancelledEvent.timestamp = event.params.timestamp
  claimCancelledEvent.blockNumber = event.block.number
  claimCancelledEvent.txHash = event.transaction.hash
  claimCancelledEvent.save()
}

export function handleClaimFinalized(event: ClaimFinalized): void {
  let deadManSwitch = getOrCreateDeadManSwitch(event.address)

  // Update DeadManSwitch state
  deadManSwitch.currentOwner = event.params.newOwner
  deadManSwitch.claimReadyAt = BigInt.zero()
  deadManSwitch.isClaimActive = false
  deadManSwitch.updatedAt = event.block.timestamp

  if (deadManSwitch.createdAt == BigInt.zero()) {
    deadManSwitch.createdAt = event.block.timestamp
  }

  deadManSwitch.save()

  // Create ClaimFinalizedEvent entity
  let claimFinalizedEvent = new ClaimFinalizedEvent(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  )
  claimFinalizedEvent.deadManSwitch = deadManSwitch.id
  claimFinalizedEvent.oldOwner = event.params.oldOwner
  claimFinalizedEvent.newOwner = event.params.newOwner
  claimFinalizedEvent.timestamp = event.block.timestamp
  claimFinalizedEvent.blockNumber = event.block.number
  claimFinalizedEvent.txHash = event.transaction.hash
  claimFinalizedEvent.save()
}
