// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Crowdfunding} from "../src/Crowdfunding.sol";

contract CampaignStatusTest is Test {
    Crowdfunding crowdfunding;

    function setUp() public {
        crowdfunding = new Crowdfunding();
    }

    function testStatusRevertsForNonexistentCampaign() public {
        vm.expectRevert(Crowdfunding.CampaignDoesNotExist.selector);

        crowdfunding.getCampaignStatus(0);
    }

    function testStatusIsSuccessfulBeforeDeadlineWhenGoalReached() public {
        uint256 goal = 1 ether;
        address donor = makeAddr("donor");

        crowdfunding.createCampaign(
            "Test Campaign", "Test Description", goal, Crowdfunding.FundingMode.FixedDeadline, 7
        );

        vm.deal(donor, goal);
        vm.prank(donor);
        crowdfunding.donate{value: goal}(0);

        assertEq(uint256(crowdfunding.getCampaignStatus(0)), uint256(Crowdfunding.CampaignStatus.Successful));
    }

    function testStatusIsFailedAtDeadlineWhenGoalNotReached() public {
        crowdfunding.createCampaign(
            "Test Campaign", "Test Description", 1 ether, Crowdfunding.FundingMode.FixedDeadline, 7
        );

        (,,,,, uint256 deadline,,,) = crowdfunding.campaigns(0);
        vm.warp(deadline);

        assertEq(uint256(crowdfunding.getCampaignStatus(0)), uint256(Crowdfunding.CampaignStatus.Failed));
    }

    function testStatusIsSuccessfulAtDeadlineWhenGoalReached() public {
        uint256 goal = 1 ether;
        address donor = makeAddr("donor");

        crowdfunding.createCampaign(
            "Test Campaign", "Test Description", goal, Crowdfunding.FundingMode.FixedDeadline, 7
        );

        vm.deal(donor, goal);
        vm.prank(donor);
        crowdfunding.donate{value: goal}(0);

        (,,,,, uint256 deadline,,,) = crowdfunding.campaigns(0);
        vm.warp(deadline);

        assertEq(uint256(crowdfunding.getCampaignStatus(0)), uint256(Crowdfunding.CampaignStatus.Successful));
    }

    function testStatusIsWithdrawnAfterCreatorWithdraws() public {
        uint256 goal = 1 ether;
        address creator = makeAddr("creator");
        address donor = makeAddr("donor");

        vm.prank(creator);
        crowdfunding.createCampaign(
            "Test Campaign", "Test Description", goal, Crowdfunding.FundingMode.FixedDeadline, 7
        );

        vm.deal(donor, goal);
        vm.prank(donor);
        crowdfunding.donate{value: goal}(0);

        (,,,,, uint256 deadline,,,) = crowdfunding.campaigns(0);
        vm.warp(deadline);

        vm.prank(creator);
        crowdfunding.withdrawFunds(0);

        assertEq(uint256(crowdfunding.getCampaignStatus(0)), uint256(Crowdfunding.CampaignStatus.Withdrawn));
    }
}
