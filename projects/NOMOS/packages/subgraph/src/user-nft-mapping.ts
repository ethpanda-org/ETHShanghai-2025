import { 
  SoulboundNFTMinted, 
  UserProfileUpdated, 
  UserGradeUpdated 
} from "../generated/SoulboundUserNFT/SoulboundUserNFT";
import { User, UserNFT } from "../generated/schema";
import { BigInt } from "@graphprotocol/graph-ts";

export function handleSoulboundNFTMinted(event: SoulboundNFTMinted): void {
  // Create or get user
  let user = User.load(event.params.user.toHex());
  if (user == null) {
    user = new User(event.params.user.toHex());
    user.address = event.params.user;
    user.save();
  }

  // Create UserNFT entity
  let userNFT = new UserNFT(
    event.params.user.toHex() + "-" + event.params.tokenId.toString()
  );
  
  userNFT.user = user.id;
  userNFT.tokenId = event.params.tokenId;
  userNFT.username = event.params.username;
  userNFT.email = event.params.email;
  userNFT.grade = event.params.grade.toString();
  userNFT.createdAt = event.block.timestamp;
  userNFT.updatedAt = event.block.timestamp;

  userNFT.save();

  // Update user's NFT reference
  user.nft = userNFT.id;
  user.save();
}

export function handleUserProfileUpdated(event: UserProfileUpdated): void {
  let userNFT = UserNFT.load(
    event.params.user.toHex() + "-" + event.params.tokenId.toString()
  );
  
  if (userNFT != null) {
    userNFT.updatedAt = event.block.timestamp;
    userNFT.save();
  }
}

export function handleUserGradeUpdated(event: UserGradeUpdated): void {
  let userNFT = UserNFT.load(
    event.params.user.toHex() + "-" + event.params.tokenId.toString()
  );
  
  if (userNFT != null) {
    userNFT.grade = event.params.newGrade.toString();
    userNFT.updatedAt = event.block.timestamp;
    userNFT.save();
  }
}
