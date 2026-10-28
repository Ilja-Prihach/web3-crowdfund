// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ReentrancyGuardTransient} from "@openzeppelin/contracts/utils/ReentrancyGuardTransient.sol";
import {Crowdfunding} from "../src/Crowdfunding.sol";
import {ReentrantWithdrawAttacker} from "./helpers/ReentrantWithdrawAttacker.sol";

contract CrowdfundingWithdrawReentrancyTest is Test {
    Crowdfunding crowdfunding;

    function setUp() public {
        crowdfunding = new Crowdfunding();
    }

    function testWithdrawBlocksReentrantCall() public {
        uint256 goal = 1 ether;
        address donor = makeAddr("donor");

        ReentrantWithdrawAttacker attacker = new ReentrantWithdrawAttacker(crowdfunding);

        attacker.createCampaign(goal, 7);

        uint256 campaignId = attacker.campaignId();

        vm.deal(donor, goal);
        vm.prank(donor);
        crowdfunding.donate{value: goal}(campaignId);

        (,,,,, uint256 deadline,,,) = crowdfunding.campaigns(campaignId);

        vm.warp(deadline);

        attacker.attackWithdraw();

        assertEq(address(attacker).balance, goal);
        assertFalse(attacker.reentrySucceeded());

        assertEq(
            attacker.reentryRevertData(),
            abi.encodeWithSelector(ReentrancyGuardTransient.ReentrancyGuardReentrantCall.selector)
        );

        (,,,,,,, bool fundsWithdrawn,) = crowdfunding.campaigns(campaignId);

        assertTrue(fundsWithdrawn);
        assertEq(address(crowdfunding).balance, 0);
    }
}
