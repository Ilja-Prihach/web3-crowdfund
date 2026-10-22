// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {Crowdfunding} from "../src/Crowdfunding.sol";

contract DeployCrowdfunding is Script {
    function run() external returns (Crowdfunding deployedCrowdfunding) {
        vm.startBroadcast();

        deployedCrowdfunding = new Crowdfunding();

        vm.stopBroadcast();
    }
}
