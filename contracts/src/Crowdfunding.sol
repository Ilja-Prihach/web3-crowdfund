// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Crowdfunding {
    struct Campaign {
        address creator;
        uint256 goal;
        uint256 deadline;
        uint256 totalRaised;
        bool fundsWithdrawn;
    }

    mapping(uint256 => Campaign) public campaigns;
    uint256 public nextCampaignId;

    function createCampaign(uint256 goal, uint256 durationInDays) public {
        require(goal > 0, "Goal must be greater than zero");
        require(durationInDays > 0, "Duration must be greater than zero");
        uint256 campaignId = nextCampaignId;
        address creator = msg.sender;
        uint256 deadline = block.timestamp + durationInDays * 1 days;
        campaigns[campaignId] = Campaign({
            creator: creator,
            goal: goal,
            deadline: deadline,
            totalRaised: 0,
            fundsWithdrawn: false
        });
        nextCampaignId += 1;
    }
}