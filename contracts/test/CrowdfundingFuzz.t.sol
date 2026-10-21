// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Crowdfunding} from "../src/Crowdfunding.sol";

contract CrowdfundingFuzzTest is Test {
    Crowdfunding crowdfunding;

    function setUp() public {
        crowdfunding = new Crowdfunding();
    }

    function testFuzzDonationTracksAnyPositiveAmount(uint256 rawAmount) public {
        uint256 amount = bound(rawAmount, 1 wei, 1000 ether);
        address donor = makeAddr("donor");

        crowdfunding.createCampaign("Test Campaign", "Test Description", 1 ether, 7);

        vm.deal(donor, amount);
        vm.prank(donor);
        crowdfunding.donate{value: amount}(0);

        (,,,,, uint256 totalRaised,) = crowdfunding.campaigns(0);

        assertEq(totalRaised, amount);
        assertEq(crowdfunding.contributions(0, donor), amount);
        assertEq(address(crowdfunding).balance, amount);
    }

    function testFuzzMultipleDonationsAccumulate(uint256 rawFirstAmount, uint256 rawSecondAmount) public {
        uint256 firstAmount = bound(rawFirstAmount, 1 wei, 500 ether);
        uint256 secondAmount = bound(rawSecondAmount, 1 wei, 500 ether);
        uint256 expectedTotal = firstAmount + secondAmount;
        address donor = makeAddr("donor");

        crowdfunding.createCampaign("Test Campaign", "Test Description", 1 ether, 7);

        vm.deal(donor, expectedTotal);

        vm.startPrank(donor);
        crowdfunding.donate{value: firstAmount}(0);
        crowdfunding.donate{value: secondAmount}(0);
        vm.stopPrank();

        (,,,,, uint256 totalRaised,) = crowdfunding.campaigns(0);

        assertEq(totalRaised, expectedTotal);
        assertEq(crowdfunding.contributions(0, donor), expectedTotal);
        assertEq(address(crowdfunding).balance, expectedTotal);
    }

    function testFuzzRefundReturnsExactDonation(uint256 rawDonation) public {
        uint256 donation = bound(rawDonation, 1 wei, 100 ether);
        uint256 goal = donation + 1 wei;
        address donor = makeAddr("donor");

        crowdfunding.createCampaign("Test Campaign", "Test Description", goal, 7);

        vm.deal(donor, donation);
        vm.prank(donor);
        crowdfunding.donate{value: donation}(0);

        (,,,, uint256 deadline,,) = crowdfunding.campaigns(0);
        vm.warp(deadline);

        uint256 balanceBeforeRefund = donor.balance;

        vm.prank(donor);
        crowdfunding.refund(0);

        assertEq(donor.balance, balanceBeforeRefund + donation);
        assertEq(crowdfunding.contributions(0, donor), 0);
        assertEq(address(crowdfunding).balance, 0);
    }
}
