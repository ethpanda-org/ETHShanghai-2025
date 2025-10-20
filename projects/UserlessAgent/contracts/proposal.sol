// 0x84aca3e7353f6057a671a1dd7a137368709dfaac
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ProposalStorage {
    uint public proposalCount;
    
    // 提案ID -> CID
    mapping(uint => string) public proposalCids;
    
    // 事件
    event ProposalSubmitted(uint indexed proposalId, string cid);
    
    // 提交提案
    function submitProposal(string memory cid) external {
        require(bytes(cid).length > 0, "CID cannot be null");
        
        proposalCount += 1;
        uint proposalId = proposalCount;
        
        proposalCids[proposalId] = cid;
        emit ProposalSubmitted(proposalId, cid);
    }

    // 获取提案CID
    function getProposalCID(uint proposalId) external view returns (string memory) {
        return proposalCids[proposalId];
    }
}
