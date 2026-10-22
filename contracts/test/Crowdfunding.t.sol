// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {Crowdfunding} from "../src/Crowdfunding.sol";
import {ReentrantRefundAttacker} from "./helpers/ReentrantRefundAttacker.sol";

contract CrowdfundingTest is Test {
    Crowdfunding crowdfunding;

    event CampaignCreated(uint256 indexed campaignId, address indexed creator, uint256 goal, uint256 deadline);

    event DonationMade(uint256 indexed campaignId, address indexed donor, uint256 amount);

    event FundsWithdrawn(uint256 indexed campaignId, address indexed creator, uint256 amount);

    event RefundClaimed(uint256 indexed campaignId, address indexed donor, uint256 amount);

    function setUp() public {
        crowdfunding = new Crowdfunding();
    }

    function testInitialCampaignIdIsZero() public view {
        assertEq(crowdfunding.nextCampaignId(), 0);
    }

    function testCreateCampaignStoresData() public {
        uint256 goal = 1 ether;
        uint256 durationInDays = 7;
        uint256 expectedDeadline = block.timestamp + durationInDays * 1 days;

        vm.expectEmit(true, true, false, true);
        emit CampaignCreated(0, address(this), goal, expectedDeadline);

        crowdfunding.createCampaign("Test Campaign", "Test Description", goal, durationInDays);
        assertEq(crowdfunding.nextCampaignId(), 1);
        (
            address creator,
            string memory storedTitle,
            string memory storedDescription,
            uint256 storedGoal,
            uint256 deadline,
            uint256 totalRaised,
            bool fundsWithdrawn,
            bool cancelled
        ) = crowdfunding.campaigns(0);
        assertEq(creator, address(this));
        assertEq(storedTitle, "Test Campaign");
        assertEq(storedDescription, "Test Description");
        assertEq(storedGoal, goal);
        assertEq(deadline, block.timestamp + durationInDays * 1 days);
        assertEq(totalRaised, 0);
        assertFalse(fundsWithdrawn);
        assertFalse(cancelled);
    }

    function testCreateCampaignRevertsWithZeroGoal() public {
        vm.expectRevert(Crowdfunding.GoalMustBeGreaterThanZero.selector);
        crowdfunding.createCampaign("Test Campaign", "Test Description", 0, 7);
    }

    function testCreateCampaignRevertsWithZeroDuration() public {
        vm.expectRevert(Crowdfunding.DurationMustBeGreaterThanZero.selector);
        crowdfunding.createCampaign("Test Campaign", "Test Description", 1 ether, 0);
    }

    function testCreateCampaignRevertsWithEmptyTitle() public {
        vm.expectRevert(Crowdfunding.EmptyTitle.selector);
        crowdfunding.createCampaign("", "Test Description", 1 ether, 7);
    }

    function testCreateCampaignRevertsWithEmptyDescription() public {
        vm.expectRevert(Crowdfunding.EmptyDescription.selector);
        crowdfunding.createCampaign("Test Campaign", "", 1 ether, 7);
    }

    function testCreateCampaignRevertsWhenTitleIsTooLong() public {
        string memory longTitle = new string(crowdfunding.MAX_TITLE_LENGTH() + 1);

        vm.expectRevert(Crowdfunding.TitleTooLong.selector);
        crowdfunding.createCampaign(longTitle, "Test Description", 1 ether, 7);
    }

    function testCreateCampaignRevertsWhenDescriptionIsTooLong() public {
        string memory longDescription = new string(crowdfunding.MAX_DESCRIPTION_LENGTH() + 1);

        vm.expectRevert(Crowdfunding.DescriptionTooLong.selector);
        crowdfunding.createCampaign("Test Campaign", longDescription, 1 ether, 7);
    }

    function testCreateCampaignAcceptsMaximumMetadataLengths() public {
        string memory maxTitle = new string(crowdfunding.MAX_TITLE_LENGTH());
        string memory maxDescription = new string(crowdfunding.MAX_DESCRIPTION_LENGTH());

        crowdfunding.createCampaign(maxTitle, maxDescription, 1 ether, 7);

        assertEq(crowdfunding.nextCampaignId(), 1);
    }

    function testDonateIncreasesTotalRaised() public {
        crowdfunding.createCampaign("Test Campaign", "Test Description", 1 ether, 7);

        address donor = makeAddr("donor");
        uint256 donation = 0.5 ether;

        vm.deal(donor, donation);
        vm.expectEmit(true, true, false, true);
        emit DonationMade(0, donor, donation);
        vm.prank(donor);
        crowdfunding.donate{value: donation}(0);

        (,,,,, uint256 totalRaised,,) = crowdfunding.campaigns(0);

        assertEq(totalRaised, donation);
        assertEq(address(crowdfunding).balance, donation);
        assertEq(crowdfunding.contributions(0, donor), donation);
    }

    function testDonateRevertsWithZeroValue() public {
        crowdfunding.createCampaign("Test Campaign", "Test Description", 1 ether, 7);

        vm.expectRevert(Crowdfunding.DonationMustBeGreaterThanZero.selector);
        crowdfunding.donate(0);
    }

    function testDonateRevertsForNonexistentCampaign() public {
        address donor = makeAddr("donor");
        vm.deal(donor, 1 ether);

        vm.prank(donor);
        vm.expectRevert(Crowdfunding.CampaignDoesNotExist.selector);
        crowdfunding.donate{value: 1 ether}(0);
    }

    function testDonateRevertsAfterDeadline() public {
        crowdfunding.createCampaign("Test Campaign", "Test Description", 1 ether, 7);

        (,,,, uint256 deadline,,,) = crowdfunding.campaigns(0);
        vm.warp(deadline);

        address donor = makeAddr("donor");
        vm.deal(donor, 1 ether);

        vm.prank(donor);
        vm.expectRevert(Crowdfunding.CampaignHasEnded.selector);
        crowdfunding.donate{value: 1 ether}(0);
    }

    function testCreatorCanWithdrawAfterSuccessfulCampaign() public {
        address creator = makeAddr("creator");
        address donor = makeAddr("donor");
        uint256 goal = 1 ether;

        vm.prank(creator);
        crowdfunding.createCampaign("Test Campaign", "Test Description", goal, 7);

        vm.deal(donor, goal);
        vm.prank(donor);
        crowdfunding.donate{value: goal}(0);

        (,,,, uint256 deadline,,,) = crowdfunding.campaigns(0);
        vm.warp(deadline);

        uint256 creatorBalanceBefore = creator.balance;

        vm.expectEmit(true, true, false, true);
        emit FundsWithdrawn(0, creator, goal);
        vm.prank(creator);
        crowdfunding.withdrawFunds(0);

        (,,,,,, bool fundsWithdrawn,) = crowdfunding.campaigns(0);

        assertEq(creator.balance, creatorBalanceBefore + goal);
        assertEq(address(crowdfunding).balance, 0);
        assertTrue(fundsWithdrawn);
    }

    function testOnlyCreatorCanWithdraw() public {
        address creator = makeAddr("creator");
        address attacker = makeAddr("attacker");
        address donor = makeAddr("donor");
        uint256 goal = 1 ether;

        vm.prank(creator);
        crowdfunding.createCampaign("Test Campaign", "Test Description", goal, 7);

        vm.deal(donor, goal);
        vm.prank(donor);
        crowdfunding.donate{value: goal}(0);

        (,,,, uint256 deadline,,,) = crowdfunding.campaigns(0);
        vm.warp(deadline);

        vm.prank(attacker);
        vm.expectRevert(Crowdfunding.OnlyCreatorCanWithdraw.selector);
        crowdfunding.withdrawFunds(0);
    }

    function testCreatorCannotWithdrawBeforeDeadline() public {
        address creator = makeAddr("creator");
        address donor = makeAddr("donor");
        uint256 goal = 1 ether;

        vm.prank(creator);
        crowdfunding.createCampaign("Test Campaign", "Test Description", goal, 7);

        vm.deal(donor, goal);
        vm.prank(donor);
        crowdfunding.donate{value: goal}(0);

        vm.prank(creator);
        vm.expectRevert(Crowdfunding.CampaignIsStillActive.selector);
        crowdfunding.withdrawFunds(0);
    }

    function testCreatorCannotWithdrawWhenGoalNotReached() public {
        address creator = makeAddr("creator");
        address donor = makeAddr("donor");
        uint256 goal = 1 ether;
        uint256 donation = 0.5 ether;

        vm.prank(creator);
        crowdfunding.createCampaign("Test Campaign", "Test Description", goal, 7);

        vm.deal(donor, donation);
        vm.prank(donor);
        crowdfunding.donate{value: donation}(0);

        (,,,, uint256 deadline,,,) = crowdfunding.campaigns(0);
        vm.warp(deadline);

        vm.prank(creator);
        vm.expectRevert(Crowdfunding.GoalWasNotReached.selector);
        crowdfunding.withdrawFunds(0);
    }

    function testCreatorCannotWithdrawTwice() public {
        address creator = makeAddr("creator");
        address donor = makeAddr("donor");
        uint256 goal = 1 ether;

        vm.prank(creator);
        crowdfunding.createCampaign("Test Campaign", "Test Description", goal, 7);

        vm.deal(donor, goal);
        vm.prank(donor);
        crowdfunding.donate{value: goal}(0);

        (,,,, uint256 deadline,,,) = crowdfunding.campaigns(0);
        vm.warp(deadline);

        vm.prank(creator);
        crowdfunding.withdrawFunds(0);

        vm.prank(creator);
        vm.expectRevert(Crowdfunding.FundsAlreadyWithdrawn.selector);
        crowdfunding.withdrawFunds(0);
    }

    function testDonorCanRefundAfterFailedCampaign() public {
        address creator = makeAddr("creator");
        address donor = makeAddr("donor");
        uint256 goal = 1 ether;
        uint256 donation = 0.5 ether;

        vm.prank(creator);
        crowdfunding.createCampaign("Test Campaign", "Test Description", goal, 7);

        vm.deal(donor, donation);
        vm.prank(donor);
        crowdfunding.donate{value: donation}(0);

        (,,,, uint256 deadline,,,) = crowdfunding.campaigns(0);
        vm.warp(deadline);

        uint256 donorBalanceBefore = donor.balance;

        vm.expectEmit(true, true, false, true);
        emit RefundClaimed(0, donor, donation);
        vm.prank(donor);
        crowdfunding.refund(0);

        assertEq(donor.balance, donorBalanceBefore + donation);
        assertEq(address(crowdfunding).balance, 0);
        assertEq(crowdfunding.contributions(0, donor), 0);
    }

    function testDonorCannotRefundBeforeDeadline() public {
        address creator = makeAddr("creator");
        address donor = makeAddr("donor");
        uint256 goal = 1 ether;
        uint256 donation = 0.5 ether;

        vm.prank(creator);
        crowdfunding.createCampaign("Test Campaign", "Test Description", goal, 7);

        vm.deal(donor, donation);
        vm.prank(donor);
        crowdfunding.donate{value: donation}(0);

        vm.prank(donor);
        vm.expectRevert(Crowdfunding.CampaignIsStillActive.selector);
        crowdfunding.refund(0);
    }

    function testDonorCannotRefundSuccessfulCampaign() public {
        address creator = makeAddr("creator");
        address donor = makeAddr("donor");
        uint256 goal = 1 ether;

        vm.prank(creator);
        crowdfunding.createCampaign("Test Campaign", "Test Description", goal, 7);

        vm.deal(donor, goal);
        vm.prank(donor);
        crowdfunding.donate{value: goal}(0);

        (,,,, uint256 deadline,,,) = crowdfunding.campaigns(0);
        vm.warp(deadline);

        vm.prank(donor);
        vm.expectRevert(Crowdfunding.GoalWasReached.selector);
        crowdfunding.refund(0);
    }

    function testDonorCannotRefundTwice() public {
        address creator = makeAddr("creator");
        address donor = makeAddr("donor");
        uint256 goal = 1 ether;
        uint256 donation = 0.5 ether;

        vm.prank(creator);
        crowdfunding.createCampaign("Test Campaign", "Test Description", goal, 7);

        vm.deal(donor, donation);
        vm.prank(donor);
        crowdfunding.donate{value: donation}(0);

        (,,,, uint256 deadline,,,) = crowdfunding.campaigns(0);
        vm.warp(deadline);

        vm.prank(donor);
        crowdfunding.refund(0);

        vm.prank(donor);
        vm.expectRevert(Crowdfunding.NoContributionToRefund.selector);
        crowdfunding.refund(0);
    }

    function testRefundBlocksReentrantCall() public {
        uint256 goal = 2 ether;
        uint256 donation = 1 ether;

        crowdfunding.createCampaign("Test Campaign", "Test Description", goal, 7);

        ReentrantRefundAttacker attacker = new ReentrantRefundAttacker(crowdfunding);

        vm.deal(address(this), donation);
        attacker.donate{value: donation}(0);

        (,,,, uint256 deadline,,,) = crowdfunding.campaigns(0);
        vm.warp(deadline);

        attacker.attackRefund();

        assertEq(address(attacker).balance, donation);
        assertFalse(attacker.reentrySucceeded());
        assertEq(
            attacker.reentryRevertData(),
            abi.encodeWithSelector(ReentrancyGuardTransient.ReentrancyGuardReentrantCall.selector)
        );
        assertEq(crowdfunding.contributions(0, address(attacker)), 0);
        assertEq(address(crowdfunding).balance, 0);
    }
}
