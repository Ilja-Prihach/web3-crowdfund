// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {StdInvariant} from "forge-std/StdInvariant.sol";
import {Test} from "forge-std/Test.sol";
import {Crowdfunding} from "../../src/Crowdfunding.sol";
import {CampaignHandler} from "./CampaignHandler.sol";

contract CrowdfundingInvariantTest is StdInvariant, Test {
    Crowdfunding crowdfunding;
    CampaignHandler handler;

    function setUp() public {
        crowdfunding = new Crowdfunding();

        crowdfunding.createCampaign(
            "Invariant Campaign",
            "Campaign used for invariant testing",
            type(uint128).max,
            Crowdfunding.FundingMode.FixedDeadline,
            365
        );

        handler = new CampaignHandler(crowdfunding, address(this));

        bytes4[] memory selectors = new bytes4[](3);
        selectors[0] = CampaignHandler.donate.selector;
        selectors[1] = CampaignHandler.cancel.selector;
        selectors[2] = CampaignHandler.refund.selector;

        targetContract(address(handler));
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    function invariantBalanceMatchesGhostAccounting() public view {
        (,,,,,, uint256 totalRaised,,) = crowdfunding.campaigns(0);

        uint256 totalDonated = handler.ghostTotalDonated();
        uint256 totalRefunded = handler.ghostTotalRefunded();

        assertEq(totalRaised, totalDonated - totalRefunded);
        assertEq(address(crowdfunding).balance, totalRaised);
    }

    function invariantContributionsMatchGhostAccounting() public view {
        uint256 donorCount = handler.donorCount();
        uint256 contributionSum;

        for (uint256 index; index < donorCount; index++) {
            address donor = handler.donorAt(index);
            uint256 storedContribution = crowdfunding.contributions(0, donor);
            uint256 expectedContribution = handler.ghostDonations(donor);

            assertEq(storedContribution, expectedContribution);

            contributionSum += storedContribution;
        }

        (,,,,,, uint256 totalRaised,,) = crowdfunding.campaigns(0);

        assertEq(address(crowdfunding).balance, contributionSum);
        assertEq(contributionSum, totalRaised);
    }

    function invariantCancellationMatchesGhostState() public view {
        (,,,,,,,, bool cancelled) = crowdfunding.campaigns(0);

        assertEq(cancelled, handler.ghostCancelled());
    }
}
