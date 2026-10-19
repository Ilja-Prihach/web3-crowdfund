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
        (
            address creator,
            uint256 storedGoal,
            uint256 deadline,
            uint256 totalRaised,
            bool fundsWithdrawn
        ) = crowdfunding.campaigns(0);
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
}
