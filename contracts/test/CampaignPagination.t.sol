// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Crowdfunding} from "../src/Crowdfunding.sol";

contract CampaignPaginationTest is Test {
    Crowdfunding crowdfunding;

    function setUp() public {
        crowdfunding = new Crowdfunding();

        crowdfunding.createCampaign("Campaign 0", "Description 0", 1 ether, 7);
        crowdfunding.createCampaign("Campaign 1", "Description 1", 2 ether, 14);
        crowdfunding.createCampaign("Campaign 2", "Description 2", 3 ether, 21);

        crowdfunding.cancelCampaign(1);
    }

    function testReturnsRequestedPage() public view {
        Crowdfunding.CampaignView[] memory page = crowdfunding.getCampaigns(0, 2);

        assertEq(page.length, 2);

        assertEq(page[0].id, 0);
        assertEq(page[0].campaign.title, "Campaign 0");
        assertEq(uint256(page[0].status), uint256(Crowdfunding.CampaignStatus.Active));

        assertEq(page[1].id, 1);
        assertEq(page[1].campaign.title, "Campaign 1");
        assertEq(uint256(page[1].status), uint256(Crowdfunding.CampaignStatus.Cancelled));
    }

    function testTruncatesLastPageToRemainingCampaigns() public view {
        Crowdfunding.CampaignView[] memory page = crowdfunding.getCampaigns(2, 20);

        assertEq(page.length, 1);
        assertEq(page[0].id, 2);
        assertEq(page[0].campaign.title, "Campaign 2");
    }

    function testReturnsEmptyPageAtEnd() public view {
        Crowdfunding.CampaignView[] memory page = crowdfunding.getCampaigns(3, 20);

        assertEq(page.length, 0);
    }

    function testReturnsEmptyPagePastEnd() public view {
        Crowdfunding.CampaignView[] memory page = crowdfunding.getCampaigns(100, 20);

        assertEq(page.length, 0);
    }

    function testRevertsWhenPageSizeIsZero() public {
        vm.expectRevert(Crowdfunding.PageSizeMustBeGreaterThanZero.selector);

        crowdfunding.getCampaigns(0, 0);
    }

    function testRevertsWhenPageSizeIsTooLarge() public {
        uint256 tooLarge = crowdfunding.MAX_PAGE_SIZE() + 1;

        vm.expectRevert(Crowdfunding.PageSizeTooLarge.selector);

        crowdfunding.getCampaigns(0, tooLarge);
    }
}
