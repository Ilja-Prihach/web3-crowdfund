// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Crowdfunding} from "../src/Crowdfunding.sol";

contract CrowdfundingTest is Test {
    Crowdfunding crowdfunding;

    event CampaignCreated(uint256 indexed campaignId, address indexed creator, uint256 goal, uint256 deadline);

    event DonationMade(uint256 indexed campaignId, address indexed donor, uint256 amount);

    event FundsWithdrawn(uint256 indexed campaignId, address indexed creator, uint256 amount);

    event RefundClaimed(uint256 indexed campaignId, address indexed donor, uint256 amount);

    function setUp() public {
        crowdfunding = new Crowdfunding();
    }

    function testInitialCampaignIdIsZero() public {
        assertEq(crowdfunding.nextCampaignId(), 0);
    }

    function testCreateCampaignStoresData() public {
        uint256 goal = 1 ether;
        uint256 durationInDays = 7;
        uint256 expectedDeadline = block.timestamp + durationInDays * 1 days;

        vm.expectEmit(true, true, false, true);
        emit CampaignCreated(0, address(this), goal, expectedDeadline);

        crowdfunding.createCampaign(goal, durationInDays);
        assertEq(crowdfunding.nextCampaignId(), 1);
        (address creator, uint256 storedGoal, uint256 deadline, uint256 totalRaised, bool fundsWithdrawn) =
            crowdfunding.campaigns(0);
        assertEq(creator, address(this));
        assertEq(storedGoal, goal);
        assertEq(deadline, block.timestamp + durationInDays * 1 days);
        assertEq(totalRaised, 0);
        assertFalse(fundsWithdrawn);
    }

    function testCreateCampaignRevertsWithZeroGoal() public {
        vm.expectRevert();
        crowdfunding.createCampaign(0, 7);
    }

    function testCreateCampaignRevertsWithZeroDuration() public {
        vm.expectRevert();
        crowdfunding.createCampaign(1 ether, 0);
    }

    function testDonateIncreasesTotalRaised() public {
        crowdfunding.createCampaign(1 ether, 7);

        address donor = makeAddr("donor");
        uint256 donation = 0.5 ether;

        vm.deal(donor, donation);
        vm.expectEmit(true, true, false, true);
        emit DonationMade(0, donor, donation);
        vm.prank(donor);
        crowdfunding.donate{value: donation}(0);

        (,,, uint256 totalRaised,) = crowdfunding.campaigns(0);

        assertEq(totalRaised, donation);
        assertEq(address(crowdfunding).balance, donation);
        assertEq(crowdfunding.contributions(0, donor), donation);
    }

    function testDonateRevertsWithZeroValue() public {
        crowdfunding.createCampaign(1 ether, 7);

        vm.expectRevert();
        crowdfunding.donate(0);
    }

    function testDonateRevertsForNonexistentCampaign() public {
        address donor = makeAddr("donor");
        vm.deal(donor, 1 ether);

        vm.prank(donor);
        vm.expectRevert();
        crowdfunding.donate{value: 1 ether}(0);
    }

    function testDonateRevertsAfterDeadline() public {
        crowdfunding.createCampaign(1 ether, 7);

        (,, uint256 deadline,,) = crowdfunding.campaigns(0);
        vm.warp(deadline);

        address donor = makeAddr("donor");
        vm.deal(donor, 1 ether);

        vm.prank(donor);
        vm.expectRevert();
        crowdfunding.donate{value: 1 ether}(0);
    }

    function testCreatorCanWithdrawAfterSuccessfulCampaign() public {
        address creator = makeAddr("creator");
        address donor = makeAddr("donor");
        uint256 goal = 1 ether;

        vm.prank(creator);
        crowdfunding.createCampaign(goal, 7);

        vm.deal(donor, goal);
        vm.prank(donor);
        crowdfunding.donate{value: goal}(0);

        (,, uint256 deadline,,) = crowdfunding.campaigns(0);
        vm.warp(deadline);

        uint256 creatorBalanceBefore = creator.balance;

        vm.expectEmit(true, true, false, true);
        emit FundsWithdrawn(0, creator, goal);
        vm.prank(creator);
        crowdfunding.withdrawFunds(0);

        (,,,, bool fundsWithdrawn) = crowdfunding.campaigns(0);

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
        crowdfunding.createCampaign(goal, 7);

        vm.deal(donor, goal);
        vm.prank(donor);
        crowdfunding.donate{value: goal}(0);

        (,, uint256 deadline,,) = crowdfunding.campaigns(0);
        vm.warp(deadline);

        vm.prank(attacker);
        vm.expectRevert();
        crowdfunding.withdrawFunds(0);
    }

    function testCreatorCannotWithdrawBeforeDeadline() public {
        address creator = makeAddr("creator");
        address donor = makeAddr("donor");
        uint256 goal = 1 ether;

        vm.prank(creator);
        crowdfunding.createCampaign(goal, 7);

        vm.deal(donor, goal);
        vm.prank(donor);
        crowdfunding.donate{value: goal}(0);

        vm.prank(creator);
        vm.expectRevert();
        crowdfunding.withdrawFunds(0);
    }

    function testCreatorCannotWithdrawWhenGoalNotReached() public {
        address creator = makeAddr("creator");
        address donor = makeAddr("donor");
        uint256 goal = 1 ether;
        uint256 donation = 0.5 ether;

        vm.prank(creator);
        crowdfunding.createCampaign(goal, 7);

        vm.deal(donor, donation);
        vm.prank(donor);
        crowdfunding.donate{value: donation}(0);

        (,, uint256 deadline,,) = crowdfunding.campaigns(0);
        vm.warp(deadline);

        vm.prank(creator);
        vm.expectRevert();
        crowdfunding.withdrawFunds(0);
    }

    function testCreatorCannotWithdrawTwice() public {
        address creator = makeAddr("creator");
        address donor = makeAddr("donor");
        uint256 goal = 1 ether;

        vm.prank(creator);
        crowdfunding.createCampaign(goal, 7);

        vm.deal(donor, goal);
        vm.prank(donor);
        crowdfunding.donate{value: goal}(0);

        (,, uint256 deadline,,) = crowdfunding.campaigns(0);
        vm.warp(deadline);

        vm.prank(creator);
        crowdfunding.withdrawFunds(0);

        vm.prank(creator);
        vm.expectRevert();
        crowdfunding.withdrawFunds(0);
    }

    function testDonorCanRefundAfterFailedCampaign() public {
        address creator = makeAddr("creator");
        address donor = makeAddr("donor");
        uint256 goal = 1 ether;
        uint256 donation = 0.5 ether;

        vm.prank(creator);
        crowdfunding.createCampaign(goal, 7);

        vm.deal(donor, donation);
        vm.prank(donor);
        crowdfunding.donate{value: donation}(0);

        (,, uint256 deadline,,) = crowdfunding.campaigns(0);
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
        crowdfunding.createCampaign(goal, 7);

        vm.deal(donor, donation);
        vm.prank(donor);
        crowdfunding.donate{value: donation}(0);

        vm.prank(donor);
        vm.expectRevert();
        crowdfunding.refund(0);
    }

    function testDonorCannotRefundSuccessfulCampaign() public {
        address creator = makeAddr("creator");
        address donor = makeAddr("donor");
        uint256 goal = 1 ether;

        vm.prank(creator);
        crowdfunding.createCampaign(goal, 7);

        vm.deal(donor, goal);
        vm.prank(donor);
        crowdfunding.donate{value: goal}(0);

        (,, uint256 deadline,,) = crowdfunding.campaigns(0);
        vm.warp(deadline);

        vm.prank(donor);
        vm.expectRevert();
        crowdfunding.refund(0);
    }

    function testDonorCannotRefundTwice() public {
        address creator = makeAddr("creator");
        address donor = makeAddr("donor");
        uint256 goal = 1 ether;
        uint256 donation = 0.5 ether;

        vm.prank(creator);
        crowdfunding.createCampaign(goal, 7);

        vm.deal(donor, donation);
        vm.prank(donor);
        crowdfunding.donate{value: donation}(0);

        (,, uint256 deadline,,) = crowdfunding.campaigns(0);
        vm.warp(deadline);

        vm.prank(donor);
        crowdfunding.refund(0);

        vm.prank(donor);
        vm.expectRevert();
        crowdfunding.refund(0);
    }
}
