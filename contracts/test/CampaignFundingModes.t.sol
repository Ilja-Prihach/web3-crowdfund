// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Crowdfunding} from "../src/Crowdfunding.sol";

contract CampaignFundingModesTest is Test {
    Crowdfunding crowdfunding;

    address creator = makeAddr("creator");
    address donor = makeAddr("donor");
    address secondDonor = makeAddr("second-donor");

    function setUp() public {
        crowdfunding = new Crowdfunding();
    }

    function testCreateOpenEndedCampaignStoresModeAndZeroDeadline() public {
        uint256 goal = 1 ether;

        vm.prank(creator);
        crowdfunding.createCampaign(
            "Open campaign", "Campaign without a deadline", goal, Crowdfunding.FundingMode.OpenEnded, 0
        );

        (address storedCreator, Crowdfunding.FundingMode fundingMode,,, uint256 storedGoal, uint256 deadline,,,) =
            crowdfunding.campaigns(0);

        assertEq(storedCreator, creator);
        assertEq(uint256(fundingMode), uint256(Crowdfunding.FundingMode.OpenEnded));
        assertEq(storedGoal, goal);
        assertEq(deadline, 0);
        assertEq(uint256(crowdfunding.getCampaignStatus(0)), uint256(Crowdfunding.CampaignStatus.Active));
    }

    function testOpenEndedCampaignRejectsNonzeroDuration() public {
        vm.expectRevert(Crowdfunding.OpenEndedCampaignMustNotHaveDuration.selector);

        crowdfunding.createCampaign(
            "Open campaign", "Campaign without a deadline", 1 ether, Crowdfunding.FundingMode.OpenEnded, 1
        );
    }

    function testFixedDeadlineCampaignRejectsDurationAboveMaximum() public {
        uint256 invalidDuration = crowdfunding.MAX_DURATION_DAYS() + 1;

        vm.expectRevert(Crowdfunding.DurationTooLong.selector);

        crowdfunding.createCampaign(
            "Fixed campaign",
            "Campaign with a deadline",
            1 ether,
            Crowdfunding.FundingMode.FixedDeadline,
            invalidDuration
        );
    }

    function testOpenEndedCampaignRemainsActiveAsTimePasses() public {
        _createOpenEndedCampaign(1 ether);

        vm.warp(block.timestamp + 10_000 days);

        assertEq(uint256(crowdfunding.getCampaignStatus(0)), uint256(Crowdfunding.CampaignStatus.Active));
    }

    function testOpenEndedContributorCanRefundWhileCampaignIsActive() public {
        uint256 contribution = 1 ether;
        _createOpenEndedCampaign(2 ether);

        vm.deal(donor, contribution);
        vm.prank(donor);
        crowdfunding.donate{value: contribution}(0);

        vm.prank(donor);
        crowdfunding.refund(0);

        (,,,,,, uint256 totalRaised,,) = crowdfunding.campaigns(0);

        assertEq(donor.balance, contribution);
        assertEq(crowdfunding.contributions(0, donor), 0);
        assertEq(totalRaised, 0);
        assertEq(address(crowdfunding).balance, 0);
        assertEq(uint256(crowdfunding.getCampaignStatus(0)), uint256(Crowdfunding.CampaignStatus.Active));
    }

    function testFinalDonationMayExceedGoalAndClosesCampaign() public {
        uint256 goal = 1 ether;
        uint256 donation = 2 ether;
        _createOpenEndedCampaign(goal);

        vm.deal(donor, donation);
        vm.prank(donor);
        crowdfunding.donate{value: donation}(0);

        (,,,,,, uint256 totalRaised,,) = crowdfunding.campaigns(0);

        assertEq(totalRaised, donation);
        assertEq(uint256(crowdfunding.getCampaignStatus(0)), uint256(Crowdfunding.CampaignStatus.Successful));
    }

    function testCannotDonateAfterGoalWasReached() public {
        uint256 goal = 1 ether;
        _createOpenEndedCampaign(goal);

        vm.deal(donor, goal);
        vm.prank(donor);
        crowdfunding.donate{value: goal}(0);

        vm.deal(secondDonor, 1 ether);
        vm.expectRevert(Crowdfunding.GoalWasReached.selector);
        vm.prank(secondDonor);
        crowdfunding.donate{value: 1 ether}(0);
    }

    function testCreatorCanCancelOpenEndedCampaignAfterTimePasses() public {
        _createOpenEndedCampaign(1 ether);

        vm.warp(block.timestamp + 10_000 days);

        vm.prank(creator);
        crowdfunding.cancelCampaign(0);

        assertEq(uint256(crowdfunding.getCampaignStatus(0)), uint256(Crowdfunding.CampaignStatus.Cancelled));
    }

    function testOpenEndedContributorsRefundIndependently() public {
        uint256 firstContribution = 1 ether;
        uint256 secondContribution = 2 ether;
        _createOpenEndedCampaign(5 ether);

        vm.deal(donor, firstContribution);
        vm.prank(donor);
        crowdfunding.donate{value: firstContribution}(0);

        vm.deal(secondDonor, secondContribution);
        vm.prank(secondDonor);
        crowdfunding.donate{value: secondContribution}(0);

        vm.prank(donor);
        crowdfunding.refund(0);

        (,,,,,, uint256 totalRaised,,) = crowdfunding.campaigns(0);
        assertEq(totalRaised, secondContribution);
        assertEq(crowdfunding.contributions(0, donor), 0);
        assertEq(crowdfunding.contributions(0, secondDonor), secondContribution);
        assertEq(address(crowdfunding).balance, secondContribution);

        vm.prank(secondDonor);
        crowdfunding.refund(0);

        (,,,,,, totalRaised,,) = crowdfunding.campaigns(0);
        assertEq(totalRaised, 0);
        assertEq(address(crowdfunding).balance, 0);
    }

    function testOpenEndedCampaignCanReachGoalAfterEarlierRefund() public {
        uint256 goal = 2 ether;
        _createOpenEndedCampaign(goal);

        vm.deal(donor, 1 ether);
        vm.prank(donor);
        crowdfunding.donate{value: 1 ether}(0);

        vm.prank(donor);
        crowdfunding.refund(0);

        vm.deal(secondDonor, goal);
        vm.prank(secondDonor);
        crowdfunding.donate{value: goal}(0);

        (,,,,,, uint256 totalRaised,,) = crowdfunding.campaigns(0);
        assertEq(totalRaised, goal);
        assertEq(uint256(crowdfunding.getCampaignStatus(0)), uint256(Crowdfunding.CampaignStatus.Successful));
    }

    function testOpenEndedContributorCannotRefundAfterGoalWasReached() public {
        uint256 goal = 2 ether;
        _createOpenEndedCampaign(goal);

        vm.deal(donor, 1 ether);
        vm.prank(donor);
        crowdfunding.donate{value: 1 ether}(0);

        vm.deal(secondDonor, 1 ether);
        vm.prank(secondDonor);
        crowdfunding.donate{value: 1 ether}(0);

        vm.expectRevert(Crowdfunding.GoalWasReached.selector);
        vm.prank(donor);
        crowdfunding.refund(0);
    }

    function testCreatorCanWithdrawOpenEndedCampaignImmediatelyAfterGoalWasReached() public {
        uint256 goal = 1 ether;
        _createOpenEndedCampaign(goal);

        vm.deal(donor, goal);
        vm.prank(donor);
        crowdfunding.donate{value: goal}(0);

        uint256 creatorBalanceBefore = creator.balance;

        vm.prank(creator);
        crowdfunding.withdrawFunds(0);

        assertEq(creator.balance, creatorBalanceBefore + goal);
        assertEq(address(crowdfunding).balance, 0);
        assertEq(uint256(crowdfunding.getCampaignStatus(0)), uint256(Crowdfunding.CampaignStatus.Withdrawn));
    }

    function _createOpenEndedCampaign(uint256 goal) internal {
        vm.prank(creator);
        crowdfunding.createCampaign(
            "Open campaign", "Campaign without a deadline", goal, Crowdfunding.FundingMode.OpenEnded, 0
        );
    }
}
