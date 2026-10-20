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

    /// @dev Custom errors keep revert data compact and expose typed failures through the ABI.
    error EmptyTitle();
    error EmptyDescription();
    error TitleTooLong();
    error DescriptionTooLong();
    error GoalMustBeGreaterThanZero();
    error DurationMustBeGreaterThanZero();
    error CampaignDoesNotExist();
    error DonationMustBeGreaterThanZero();
    error CampaignHasEnded();
    error OnlyCreatorCanWithdraw();
    error CampaignIsStillActive();
    error GoalWasNotReached();
    error FundsAlreadyWithdrawn();
    error TransferFailed();
    error GoalWasReached();
    error NoContributionToRefund();
    error RefundFailed();

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
        if (bytes(title).length == 0) revert EmptyTitle();
        if (bytes(description).length == 0) revert EmptyDescription();
        if (bytes(title).length > MAX_TITLE_LENGTH) revert TitleTooLong();
        if (bytes(description).length > MAX_DESCRIPTION_LENGTH) revert DescriptionTooLong();
        if (goal == 0) revert GoalMustBeGreaterThanZero();
        if (durationInDays == 0) revert DurationMustBeGreaterThanZero();
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

        if (campaign.creator == address(0)) revert CampaignDoesNotExist();
        if (msg.value == 0) revert DonationMustBeGreaterThanZero();
        if (block.timestamp >= campaign.deadline) revert CampaignHasEnded();

        campaign.totalRaised += msg.value;
        contributions[campaignId][msg.sender] += msg.value;

        emit DonationMade(campaignId, msg.sender, msg.value);
    }

    function withdrawFunds(uint256 campaignId) public {
        Campaign storage campaign = campaigns[campaignId];

        if (campaign.creator == address(0)) revert CampaignDoesNotExist();
        if (msg.sender != campaign.creator) revert OnlyCreatorCanWithdraw();
        if (block.timestamp < campaign.deadline) revert CampaignIsStillActive();
        if (campaign.totalRaised < campaign.goal) revert GoalWasNotReached();
        if (campaign.fundsWithdrawn) revert FundsAlreadyWithdrawn();

        campaign.fundsWithdrawn = true;

        (bool success,) = payable(campaign.creator).call{value: campaign.totalRaised}("");
        if (!success) revert TransferFailed();

        emit FundsWithdrawn(campaignId, campaign.creator, campaign.totalRaised);
    }

    function refund(uint256 campaignId) public {
        Campaign storage campaign = campaigns[campaignId];
        uint256 contribution = contributions[campaignId][msg.sender];

        if (campaign.creator == address(0)) revert CampaignDoesNotExist();
        if (block.timestamp < campaign.deadline) revert CampaignIsStillActive();
        if (campaign.totalRaised >= campaign.goal) revert GoalWasReached();
        if (contribution == 0) revert NoContributionToRefund();

        contributions[campaignId][msg.sender] = 0;

        (bool success,) = payable(msg.sender).call{value: contribution}("");
        if (!success) revert RefundFailed();

        emit RefundClaimed(campaignId, msg.sender, contribution);
    }
}
