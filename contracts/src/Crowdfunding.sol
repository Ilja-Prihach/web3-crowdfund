// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";

contract Crowdfunding is ReentrancyGuardTransient {
    struct Campaign {
        address creator;
        string title;
        string description;
        uint256 goal;
        uint256 deadline;
        uint256 totalRaised;
        bool fundsWithdrawn;
        bool cancelled;
    }

    enum CampaignStatus {
        Active,
        Successful,
        Failed,
        Withdrawn,
        Cancelled
    }

    struct CampaignView {
        uint256 id;
        Campaign campaign;
        CampaignStatus status;
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
    error OnlyCreatorCanCancel();
    error CampaignAlreadyCancelled();
    error CampaignIsCancelled();
    error OnlyCreatorCanWithdraw();
    error CampaignIsStillActive();
    error GoalWasNotReached();
    error FundsAlreadyWithdrawn();
    error TransferFailed();
    error GoalWasReached();
    error NoContributionToRefund();
    error RefundFailed();
    error PageSizeMustBeGreaterThanZero();
    error PageSizeTooLarge();

    event CampaignCreated(uint256 indexed campaignId, address indexed creator, uint256 goal, uint256 deadline);

    event CampaignCancelled(uint256 indexed campaignId, address indexed creator);

    event DonationMade(uint256 indexed campaignId, address indexed donor, uint256 amount);

    event FundsWithdrawn(uint256 indexed campaignId, address indexed creator, uint256 amount);

    event RefundClaimed(uint256 indexed campaignId, address indexed donor, uint256 amount);

    /// @dev Lengths are measured in UTF-8 bytes to bound permanent on-chain storage costs.
    uint256 public constant MAX_TITLE_LENGTH = 100;
    uint256 public constant MAX_DESCRIPTION_LENGTH = 1000;

    /// @dev Bounds memory allocation and ABI response size for paginated reads.
    uint256 public constant MAX_PAGE_SIZE = 20;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => uint256)) public contributions;
    uint256 public nextCampaignId;

    function getCampaignStatus(uint256 campaignId) public view returns (CampaignStatus) {
        Campaign storage campaign = campaigns[campaignId];

        if (campaign.creator == address(0)) {
            revert CampaignDoesNotExist();
        }

        return _getCampaignStatus(campaign);
    }

    function _getCampaignStatus(Campaign storage campaign) internal view returns (CampaignStatus) {
        if (campaign.cancelled) {
            return CampaignStatus.Cancelled;
        }

        if (campaign.fundsWithdrawn) {
            return CampaignStatus.Withdrawn;
        }

        // Campaigns use day-scale deadlines, so small validator timestamp drift is accepted.
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp < campaign.deadline) {
            return CampaignStatus.Active;
        }

        if (campaign.totalRaised >= campaign.goal) {
            return CampaignStatus.Successful;
        }

        return CampaignStatus.Failed;
    }

    function getCampaigns(uint256 offset, uint256 limit) public view returns (CampaignView[] memory page) {
        if (limit == 0) revert PageSizeMustBeGreaterThanZero();
        if (limit > MAX_PAGE_SIZE) revert PageSizeTooLarge();

        if (offset >= nextCampaignId) {
            return new CampaignView[](0);
        }

        uint256 remaining = nextCampaignId - offset;
        uint256 pageSize = limit < remaining ? limit : remaining;

        page = new CampaignView[](pageSize);

        for (uint256 index; index < pageSize; index++) {
            uint256 campaignId = offset + index;
            Campaign storage campaign = campaigns[campaignId];

            page[index] = CampaignView({id: campaignId, campaign: campaign, status: _getCampaignStatus(campaign)});
        }
    }

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
            fundsWithdrawn: false,
            cancelled: false
        });
        nextCampaignId += 1;

        emit CampaignCreated(campaignId, creator, goal, deadline);
    }

    function cancelCampaign(uint256 campaignId) public {
        Campaign storage campaign = campaigns[campaignId];

        if (campaign.creator == address(0)) revert CampaignDoesNotExist();
        if (msg.sender != campaign.creator) revert OnlyCreatorCanCancel();
        if (campaign.cancelled) revert CampaignAlreadyCancelled();

        // Campaigns use day-scale deadlines, so small validator timestamp drift is accepted.
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp >= campaign.deadline) revert CampaignHasEnded();

        campaign.cancelled = true;

        emit CampaignCancelled(campaignId, campaign.creator);
    }

    function donate(uint256 campaignId) public payable {
        Campaign storage campaign = campaigns[campaignId];

        if (campaign.creator == address(0)) revert CampaignDoesNotExist();
        if (campaign.cancelled) revert CampaignIsCancelled();
        if (msg.value == 0) revert DonationMustBeGreaterThanZero();
        // Campaigns use day-scale deadlines, so small validator timestamp drift is accepted.
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp >= campaign.deadline) revert CampaignHasEnded();

        campaign.totalRaised += msg.value;
        contributions[campaignId][msg.sender] += msg.value;

        emit DonationMade(campaignId, msg.sender, msg.value);
    }

    function withdrawFunds(uint256 campaignId) public nonReentrant {
        Campaign storage campaign = campaigns[campaignId];

        if (campaign.creator == address(0)) revert CampaignDoesNotExist();
        if (msg.sender != campaign.creator) revert OnlyCreatorCanWithdraw();
        if (campaign.cancelled) revert CampaignIsCancelled();
        // Campaigns use day-scale deadlines, so small validator timestamp drift is accepted.
        // forge-lint: disable-next-line(block-timestamp)
        if (block.timestamp < campaign.deadline) revert CampaignIsStillActive();
        if (campaign.totalRaised < campaign.goal) revert GoalWasNotReached();
        if (campaign.fundsWithdrawn) revert FundsAlreadyWithdrawn();

        campaign.fundsWithdrawn = true;

        emit FundsWithdrawn(campaignId, campaign.creator, campaign.totalRaised);

        // The stored creator is the intended recipient; access control and nonReentrant protect the transfer.
        // forge-lint: disable-next-line(arbitrary-send-eth)
        (bool success,) = payable(campaign.creator).call{value: campaign.totalRaised}("");
        if (!success) revert TransferFailed();
    }

    function refund(uint256 campaignId) public nonReentrant {
        Campaign storage campaign = campaigns[campaignId];
        uint256 contribution = contributions[campaignId][msg.sender];

        if (campaign.creator == address(0)) revert CampaignDoesNotExist();
        if (!campaign.cancelled) {
            // Campaigns use day-scale deadlines, so small validator timestamp drift is accepted.
            // forge-lint: disable-next-line(block-timestamp)
            if (block.timestamp < campaign.deadline) revert CampaignIsStillActive();
            if (campaign.totalRaised >= campaign.goal) revert GoalWasReached();
        }
        if (contribution == 0) revert NoContributionToRefund();

        contributions[campaignId][msg.sender] = 0;

        emit RefundClaimed(campaignId, msg.sender, contribution);

        (bool success,) = payable(msg.sender).call{value: contribution}("");
        if (!success) revert RefundFailed();
    }
}
