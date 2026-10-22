// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Crowdfunding} from "../src/Crowdfunding.sol";
import {RejectingEtherReceiver} from "./helpers/RejectingEtherReceiver.sol";

contract CrowdfundingTransferFailuresTest is Test {
    Crowdfunding crowdfunding;
    RejectingEtherReceiver rejectingReceiver;

    function setUp() public {
        crowdfunding = new Crowdfunding();
        rejectingReceiver = new RejectingEtherReceiver(crowdfunding);
    }

    function testWithdrawRevertsForNonexistentCampaign() public {
        vm.expectRevert(Crowdfunding.CampaignDoesNotExist.selector);

        crowdfunding.withdrawFunds(0);
    }

    function testRefundRevertsForNonexistentCampaign() public {
        vm.expectRevert(Crowdfunding.CampaignDoesNotExist.selector);

        crowdfunding.refund(0);
    }

    function testWithdrawRevertsWhenCreatorRejectsEther() public {
        uint256 goal = 1 ether;
        address donor = makeAddr("donor");

        rejectingReceiver.createCampaign(goal, 7);

        vm.deal(donor, goal);
        vm.prank(donor);
        crowdfunding.donate{value: goal}(0);

        (,,,, uint256 deadline,,) = crowdfunding.campaigns(0);

        vm.warp(deadline);

        vm.expectRevert(Crowdfunding.TransferFailed.selector);

        rejectingReceiver.withdrawFunds(0);

        (,,,,, uint256 totalRaised, bool fundsWithdrawn) = crowdfunding.campaigns(0);

        assertEq(totalRaised, goal);
        assertFalse(fundsWithdrawn);
        assertEq(address(crowdfunding).balance, goal);
    }

    function testRefundRevertsWhenDonorRejectsEther() public {
        uint256 goal = 2 ether;
        uint256 donation = 1 ether;

        crowdfunding.createCampaign("Test Campaign", "Test Description", goal, 7);

        vm.deal(address(this), donation);
        rejectingReceiver.donate{value: donation}(0);

        (,,,, uint256 deadline,,) = crowdfunding.campaigns(0);

        vm.warp(deadline);

        vm.expectRevert(Crowdfunding.RefundFailed.selector);

        rejectingReceiver.refund(0);

        assertEq(crowdfunding.contributions(0, address(rejectingReceiver)), donation);
        assertEq(address(crowdfunding).balance, donation);
    }
}
