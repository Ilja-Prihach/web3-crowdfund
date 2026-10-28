// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Crowdfunding} from "../src/Crowdfunding.sol";

contract CampaignDeadlineUpdateTest is Test {
    Crowdfunding crowdfunding;

    address creator = makeAddr("creator");
    address donor = makeAddr("donor");
    address stranger = makeAddr("stranger");

    event CampaignDeadlineUpdated(uint256 indexed campaignId, uint256 previousDeadline, uint256 newDeadline);

    function setUp() public {
        crowdfunding = new Crowdfunding();

        vm.prank(creator);
        crowdfunding.createCampaign(
            "Fixed campaign", "Campaign with a deadline", 1 ether, Crowdfunding.FundingMode.FixedDeadline, 7
        );
    }

    function testCreatorCanUpdateDeadlineToMaximumDurationBeforeFirstDonation() public {
        (,,,,, uint256 previousDeadline,,,) = crowdfunding.campaigns(0);
        uint256 durationInDays = crowdfunding.MAX_DURATION_DAYS();
        uint256 expectedDeadline = block.timestamp + durationInDays * 1 days;

        vm.expectEmit(true, false, false, true);
        emit CampaignDeadlineUpdated(0, previousDeadline, expectedDeadline);

        vm.prank(creator);
        crowdfunding.updateCampaignDeadline(0, durationInDays);

        (,,,,, uint256 updatedDeadline,,,) = crowdfunding.campaigns(0);
        assertEq(updatedDeadline, expectedDeadline);
    }

    function testUpdateDeadlineRevertsForNonexistentCampaign() public {
        vm.expectRevert(Crowdfunding.CampaignDoesNotExist.selector);

        vm.prank(creator);
        crowdfunding.updateCampaignDeadline(999, 30);
    }

    function testOnlyCreatorCanUpdateDeadline() public {
        vm.expectRevert(Crowdfunding.OnlyCreatorCanUpdateDeadline.selector);

        vm.prank(stranger);
        crowdfunding.updateCampaignDeadline(0, 30);
    }

    function testOpenEndedCampaignCannotUpdateDeadline() public {
        vm.prank(creator);
        crowdfunding.createCampaign(
            "Open campaign", "Campaign without a deadline", 1 ether, Crowdfunding.FundingMode.OpenEnded, 0
        );

        vm.expectRevert(Crowdfunding.OnlyFixedDeadlineCampaignCanUpdateDeadline.selector);

        vm.prank(creator);
        crowdfunding.updateCampaignDeadline(1, 30);
    }

    function testCancelledCampaignCannotUpdateDeadline() public {
        vm.prank(creator);
        crowdfunding.cancelCampaign(0);

        vm.expectRevert(Crowdfunding.CampaignIsCancelled.selector);

        vm.prank(creator);
        crowdfunding.updateCampaignDeadline(0, 30);
    }

    function testDeadlineCannotChangeAfterFirstDonation() public {
        vm.deal(donor, 1 wei);
        vm.prank(donor);
        crowdfunding.donate{value: 1 wei}(0);

        vm.expectRevert(Crowdfunding.DeadlineCannotChangeAfterFirstDonation.selector);

        vm.prank(creator);
        crowdfunding.updateCampaignDeadline(0, 30);
    }

    function testUpdateDeadlineRejectsZeroDuration() public {
        vm.expectRevert(Crowdfunding.DurationMustBeGreaterThanZero.selector);

        vm.prank(creator);
        crowdfunding.updateCampaignDeadline(0, 0);
    }

    function testUpdateDeadlineRejectsDurationAboveMaximum() public {
        uint256 invalidDuration = crowdfunding.MAX_DURATION_DAYS() + 1;

        vm.expectRevert(Crowdfunding.DurationTooLong.selector);

        vm.prank(creator);
        crowdfunding.updateCampaignDeadline(0, invalidDuration);
    }

    function testEndedCampaignCannotUpdateDeadline() public {
        (,,,,, uint256 deadline,,,) = crowdfunding.campaigns(0);
        vm.warp(deadline);

        vm.expectRevert(Crowdfunding.CampaignHasEnded.selector);

        vm.prank(creator);
        crowdfunding.updateCampaignDeadline(0, 30);
    }
}
