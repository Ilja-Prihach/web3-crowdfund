// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {StdInvariant} from "forge-std/StdInvariant.sol";
import {Test} from "forge-std/Test.sol";
import {Crowdfunding} from "../../src/Crowdfunding.sol";
import {DonationHandler} from "./DonationHandler.sol";

contract CrowdfundingInvariantTest is StdInvariant, Test {
    Crowdfunding crowdfunding;
    DonationHandler handler;

    function setUp() public {
        crowdfunding = new Crowdfunding();

        crowdfunding.createCampaign(
            "Invariant Campaign", "Campaign used for invariant testing", type(uint128).max, 36_500
        );

        handler = new DonationHandler(crowdfunding);

        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = DonationHandler.donate.selector;

        targetContract(address(handler));
        targetSelector(FuzzSelector({addr: address(handler), selectors: selectors}));
    }

    function invariantBalanceMatchesRaised() public view {
        (,,,,, uint256 totalRaised,,) = crowdfunding.campaigns(0);

        assertEq(address(crowdfunding).balance, totalRaised);
        assertEq(totalRaised, handler.ghostTotalDonated());
    }

    function invariantContributionsMatchGhostAccounting() public view {
        uint256 donorCount = handler.donorCount();
        uint256 contributionSum;

        for (uint256 index; index < donorCount; index++) {
            address donor = handler.donorAt(index);
            uint256 storedContribution = crowdfunding.contributions(0, donor);
            uint256 expectedContribution = handler.ghostDonations(donor);

            assertEq(storedContribution, expectedContribution);

            contributionSum += storedContribution;
        }

        (,,,,, uint256 totalRaised,,) = crowdfunding.campaigns(0);

        assertEq(contributionSum, totalRaised);
    }
}
