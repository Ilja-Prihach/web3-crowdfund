// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Crowdfunding} from "../src/Crowdfunding.sol";
import {DeployCrowdfunding} from "../script/DeployCrowdfunding.s.sol";

contract DeployCrowdfundingTest is Test {
    function testRunDeploysInitializedCrowdfunding() public {
        DeployCrowdfunding deployment = new DeployCrowdfunding();

        Crowdfunding deployedCrowdfunding = deployment.run();

        assertTrue(address(deployedCrowdfunding) != address(0));

        assertEq(deployedCrowdfunding.nextCampaignId(), 0);
    }
}
