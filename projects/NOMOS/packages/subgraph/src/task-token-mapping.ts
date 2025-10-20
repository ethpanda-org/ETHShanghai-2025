import { Transfer } from "../generated/TaskToken/TaskToken";
import { TokenTransfer } from "../generated/schema";

export function handleTokenTransfer(event: Transfer): void {
  let transfer = new TokenTransfer(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );

  transfer.from = event.params.from;
  transfer.to = event.params.to;
  transfer.value = event.params.value;
  transfer.timestamp = event.block.timestamp;
  transfer.blockNumber = event.block.number;
  transfer.transactionHash = event.transaction.hash;

  transfer.save();
}
