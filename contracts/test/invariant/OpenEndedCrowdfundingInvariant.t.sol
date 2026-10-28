// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {StdInvariant} from "forge-std/StdInvariant.sol";
import {Test} from "forge-std/Test.sol";
import {Crowdfunding} from "../../src/Crowdfunding.sol";
import {OpenEndedCampaignHandler} from "./OpenEndedCampaignHandler.sol";

contract OpenEndedCrowdfundingInvariantTest is StdInvariant, Test {
    uint256 constant GOAL = 20 ether;

    Crowdfunding crowdfunding;
    OpenEndedCampaignHandler handler;

    address creator = makeAddr("open-ended-creator");

    function setUp() public {
        crowdfunding = new Crowdfunding();

        vm.prank(creator);
        crowdfunding.createCampaign(
            "Open invariant campaign",
            "Open-ended campaign used for invariant testing",
            GOAL,
            Crowdfunding.FundingMode.OpenEnded,
            0
        );

        handler = new OpenEndedCampaignHandler(crowdfunding, creator, GOAL);

        bytes4[] memory selectors = new bytes4[](3);
        selectors[0] = OpenEndedCampaignHandler.donate.selector;
        selectors[1] = OpenEndedCampaignHandler.refund.selector;
        selectors[2] = OpenEndedCampaignHandler.withdraw.selector;

        targetContract(address(handler));
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    function invariantTotalRaisedMatchesActiveContributions() public view {
        uint256 donorCount = handler.donorCount();
        uint256 contributionSum;

        for (uint256 index; index < donorCount; index++) {
            address donor = handler.donorAt(index);
            uint256 storedContribution = crowdfunding.contributions(0, donor);
            uint256 expectedContribution = handler.ghostContributions(donor);

            assertEq(storedContribution, expectedContribution);
            contributionSum += storedContribution;
        }

        (,,,,,, uint256 totalRaised,,) = crowdfunding.campaigns(0);

        assertEq(totalRaised, handler.ghostTotalRaised());
        assertEq(contributionSum, totalRaised);
    }

    function invariantBalanceMatchesWithdrawalState() public view {
        (,,,,,, uint256 totalRaised, bool fundsWithdrawn,) = crowdfunding.campaigns(0);

        assertEq(fundsWithdrawn, handler.ghostWithdrawn());
        assertEq(address(crowdfunding).balance, fundsWithdrawn ? 0 : totalRaised);
    }

    function invariantStatusMatchesFundingState() public view {
        Crowdfunding.CampaignStatus status = crowdfunding.getCampaignStatus(0);
        uint256 totalRaised = handler.ghostTotalRaised();

        if (handler.ghostWithdrawn()) {
            assertEq(uint256(status), uint256(Crowdfunding.CampaignStatus.Withdrawn));
        } else if (totalRaised >= GOAL) {
            assertEq(uint256(status), uint256(Crowdfunding.CampaignStatus.Successful));
        } else {
            assertEq(uint256(status), uint256(Crowdfunding.CampaignStatus.Active));
        }
    }
}
