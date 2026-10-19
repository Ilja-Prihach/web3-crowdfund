// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Crowdfunding} from "../src/Crowdfunding.sol";

contract CrowdfundingTest is Test {
    Crowdfunding crowdfunding;

    function setUp() public {
        crowdfunding = new Crowdfunding();
    }

    function testInitialCampaignIdIsZero() public {
        assertEq(crowdfunding.nextCampaignId(), 0);
    }

    function testCreateCampaignStoresData() public {
        uint256 goal = 1 ether;
        uint256 durationInDays = 7;
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
        vm.prank(donor);
        crowdfunding.donate{value: donation}(0);

        (,,, uint256 totalRaised,) = crowdfunding.campaigns(0);

        assertEq(totalRaised, donation);
        assertEq(address(crowdfunding).balance, donation);
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
}
