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
    mapping(uint256 => mapping(address => uint256)) public contributions;
    uint256 public nextCampaignId;

    function createCampaign(uint256 goal, uint256 durationInDays) public {
        require(goal > 0, "Goal must be greater than zero");
        require(durationInDays > 0, "Duration must be greater than zero");
        uint256 campaignId = nextCampaignId;
        address creator = msg.sender;
        uint256 deadline = block.timestamp + durationInDays * 1 days;
        campaigns[campaignId] =
            Campaign({creator: creator, goal: goal, deadline: deadline, totalRaised: 0, fundsWithdrawn: false});
        nextCampaignId += 1;
    }

    function donate(uint256 campaignId) public payable {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.creator != address(0), "Campaign does not exist");
        require(msg.value > 0, "Donation must be greater than zero");
        require(block.timestamp < campaign.deadline, "Campaign has ended");

        campaign.totalRaised += msg.value;
        contributions[campaignId][msg.sender] += msg.value;
    }

    function withdrawFunds(uint256 campaignId) public {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.creator != address(0), "Campaign does not exist");
        require(msg.sender == campaign.creator, "Only creator can withdraw");
        require(block.timestamp >= campaign.deadline, "Campaign is still active");
        require(campaign.totalRaised >= campaign.goal, "Goal was not reached");
        require(!campaign.fundsWithdrawn, "Funds already withdrawn");

        campaign.fundsWithdrawn = true;

        (bool success,) = payable(campaign.creator).call{value: campaign.totalRaised}("");
        require(success, "Transfer failed");
    }

    function refund(uint256 campaignId) public {
        Campaign storage campaign = campaigns[campaignId];
        uint256 contribution = contributions[campaignId][msg.sender];

        require(campaign.creator != address(0), "Campaign does not exist");
        require(block.timestamp >= campaign.deadline, "Campaign is still active");
        require(campaign.totalRaised < campaign.goal, "Goal was reached");
        require(contribution > 0, "No contribution to refund");

        contributions[campaignId][msg.sender] = 0;

        (bool success,) = payable(msg.sender).call{value: contribution}("");
        require(success, "Refund failed");
    }
}
