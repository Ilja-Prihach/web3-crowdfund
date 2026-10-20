// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Crowdfunding {
    struct Campaign {
        address creator;
        string title;
        string description;
        uint256 goal;
        uint256 deadline;
        uint256 totalRaised;
        bool fundsWithdrawn;
    }

    event CampaignCreated(uint256 indexed campaignId, address indexed creator, uint256 goal, uint256 deadline);

    event DonationMade(uint256 indexed campaignId, address indexed donor, uint256 amount);

    event FundsWithdrawn(uint256 indexed campaignId, address indexed creator, uint256 amount);

    event RefundClaimed(uint256 indexed campaignId, address indexed donor, uint256 amount);

    /// @dev Lengths are measured in UTF-8 bytes to bound permanent on-chain storage costs.
    uint256 public constant MAX_TITLE_LENGTH = 100;
    uint256 public constant MAX_DESCRIPTION_LENGTH = 1000;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    uint256 public nextCampaignId;

    function createCampaign(string calldata title, string calldata description, uint256 goal, uint256 durationInDays)
        public
    {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(bytes(title).length <= MAX_TITLE_LENGTH, "Title is too long");
        require(bytes(description).length <= MAX_DESCRIPTION_LENGTH, "Description is too long");
        require(goal > 0, "Goal must be greater than zero");
        require(durationInDays > 0, "Duration must be greater than zero");
        uint256 campaignId = nextCampaignId;
        address creator = msg.sender;
        uint256 deadline = block.timestamp + durationInDays * 1 days;
        campaigns[campaignId] = Campaign({
            creator: creator,
            title: title,
            description: description,
            goal: goal,
            deadline: deadline,
            totalRaised: 0,
            fundsWithdrawn: false
        });
        nextCampaignId += 1;

        emit CampaignCreated(campaignId, creator, goal, deadline);
    }

    function donate(uint256 campaignId) public payable {
        Campaign storage campaign = campaigns[campaignId];

        require(campaign.creator != address(0), "Campaign does not exist");
        require(msg.value > 0, "Donation must be greater than zero");
        require(block.timestamp < campaign.deadline, "Campaign has ended");

        campaign.totalRaised += msg.value;
        contributions[campaignId][msg.sender] += msg.value;

        emit DonationMade(campaignId, msg.sender, msg.value);
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

        emit FundsWithdrawn(campaignId, campaign.creator, campaign.totalRaised);
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

        emit RefundClaimed(campaignId, msg.sender, contribution);
    }
}
