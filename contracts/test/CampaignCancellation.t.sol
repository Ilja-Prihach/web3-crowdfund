// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Crowdfunding} from "../src/Crowdfunding.sol";

contract CampaignCancellationTest is Test {
    Crowdfunding crowdfunding;

    address creator = makeAddr("creator");
    address donor = makeAddr("donor");
    address stranger = makeAddr("stranger");

    event CampaignCancelled(uint256 indexed campaignId, address indexed creator);

    function setUp() public {
        crowdfunding = new Crowdfunding();

        vm.prank(creator);
        crowdfunding.createCampaign(
            "Test Campaign", "Test Description", 1 ether, Crowdfunding.FundingMode.FixedDeadline, 7
        );
    }

    function testCreatorCanCancelActiveCampaign() public {
        vm.expectEmit(true, true, false, false);
        emit CampaignCancelled(0, creator);

        vm.prank(creator);
        crowdfunding.cancelCampaign(0);

        (,,,,,,,, bool cancelled) = crowdfunding.campaigns(0);
        assertTrue(cancelled);
    }

    function testStrangerCannotCancelCampaign() public {
        vm.expectRevert(Crowdfunding.OnlyCreatorCanCancel.selector);

        vm.prank(stranger);
        crowdfunding.cancelCampaign(0);
    }

    function testCannotCancelNonexistentCampaign() public {
        vm.expectRevert(Crowdfunding.CampaignDoesNotExist.selector);

        vm.prank(creator);
        crowdfunding.cancelCampaign(999);
    }

    function testCannotCancelCampaignAfterDeadline() public {
        (,,,,, uint256 deadline,,,) = crowdfunding.campaigns(0);
        vm.warp(deadline);

        vm.expectRevert(Crowdfunding.CampaignHasEnded.selector);

        vm.prank(creator);
        crowdfunding.cancelCampaign(0);
    }

    function testCannotCancelCampaignTwice() public {
        vm.prank(creator);
        crowdfunding.cancelCampaign(0);

        vm.expectRevert(Crowdfunding.CampaignAlreadyCancelled.selector);

        vm.prank(creator);
        crowdfunding.cancelCampaign(0);
    }

    function testCancelledCampaignHasCancelledStatus() public {
        vm.prank(creator);
        crowdfunding.cancelCampaign(0);

        assertEq(uint256(crowdfunding.getCampaignStatus(0)), uint256(Crowdfunding.CampaignStatus.Cancelled));
    }

    function testCannotDonateToCancelledCampaign() public {
        vm.prank(creator);
        crowdfunding.cancelCampaign(0);

        vm.deal(donor, 1 ether);
        vm.expectRevert(Crowdfunding.CampaignIsCancelled.selector);

        vm.prank(donor);
        crowdfunding.donate{value: 1 ether}(0);
    }

    function testCannotWithdrawFromCancelledCampaign() public {
        vm.deal(donor, 0.5 ether);
        vm.prank(donor);
        crowdfunding.donate{value: 0.5 ether}(0);

        vm.prank(creator);
        crowdfunding.cancelCampaign(0);

        vm.expectRevert(Crowdfunding.CampaignIsCancelled.selector);

        vm.prank(creator);
        crowdfunding.withdrawFunds(0);
    }

    function testDonorCanRefundCancelledCampaignBeforeDeadline() public {
        uint256 contribution = 0.5 ether;

        vm.deal(donor, contribution);
        vm.prank(donor);
        crowdfunding.donate{value: contribution}(0);

        vm.prank(creator);
        crowdfunding.cancelCampaign(0);

        uint256 balanceBeforeRefund = donor.balance;

        vm.prank(donor);
        crowdfunding.refund(0);

        assertEq(donor.balance, balanceBeforeRefund + contribution);
        assertEq(crowdfunding.contributions(0, donor), 0);
    }

    function testCannotCancelCampaignAfterGoalWasReached() public {
        uint256 contribution = 1 ether;

        vm.deal(donor, contribution);
        vm.prank(donor);
        crowdfunding.donate{value: contribution}(0);

        vm.expectRevert(Crowdfunding.GoalWasReached.selector);
        vm.prank(creator);
        crowdfunding.cancelCampaign(0);
    }
}
