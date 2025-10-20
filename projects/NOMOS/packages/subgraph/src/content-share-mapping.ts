import { 
  ContentCreated, 
  ContentUpdated, 
  ContentPurchased, 
  RevenueDistributed, 
  RevenueWithdrawn 
} from "../generated/ContentShare/ContentShare";
import { User, Content, ContentPurchase } from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";

export function handleContentCreated(event: ContentCreated): void {
  // Create or get user
  let user = User.load(event.params.creator.toHex());
  if (user == null) {
    user = new User(event.params.creator.toHex());
    user.address = event.params.creator;
    user.save();
  }

  // Create Content entity
  let content = new Content(event.params.contentId.toString());
  content.contentId = event.params.contentId;
  content.creator = user.id;
  content.title = ""; // Title is not in the event, will be updated separately
  content.price = event.params.price;
  content.createdAt = event.block.timestamp;
  content.updatedAt = event.block.timestamp;

  content.save();
}

export function handleContentUpdated(event: ContentUpdated): void {
  let content = Content.load(event.params.contentId.toString());
  
  if (content != null) {
    content.price = event.params.price;
    content.updatedAt = event.block.timestamp;
    content.save();
  }
}

export function handleContentPurchased(event: ContentPurchased): void {
  // Create or get buyer user
  let buyer = User.load(event.params.buyer.toHex());
  if (buyer == null) {
    buyer = new User(event.params.buyer.toHex());
    buyer.address = event.params.buyer;
    buyer.save();
  }

  // Create ContentPurchase entity
  let purchase = new ContentPurchase(
    event.transaction.hash.toHex() + "-" + event.logIndex.toString()
  );
  
  purchase.content = event.params.contentId.toString();
  purchase.buyer = buyer.id;
  purchase.pricePaid = event.params.pricePaid;
  purchase.userGrade = event.params.userGrade.toString();
  purchase.discountApplied = event.params.discountApplied;
  purchase.timestamp = event.block.timestamp;

  purchase.save();
}

export function handleRevenueDistributed(event: RevenueDistributed): void {
  // This event is for tracking revenue distribution
  // We can add additional logic here if needed for analytics
}

export function handleRevenueWithdrawn(event: RevenueWithdrawn): void {
  // This event is for tracking revenue withdrawals
  // We can add additional logic here if needed for analytics
}
