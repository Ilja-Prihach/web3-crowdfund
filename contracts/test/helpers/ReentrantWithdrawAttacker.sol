// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Crowdfunding} from "../../src/Crowdfunding.sol";

contract ReentrantWithdrawAttacker {
    Crowdfunding public immutable crowdfunding;

    uint256 public campaignId;
    bool public reentrySucceeded;
    bytes public reentryRevertData;

    constructor(Crowdfunding crowdfunding_) {
        crowdfunding = crowdfunding_;
    }

    function createCampaign(uint256 goal, uint256 durationInDays) external {
        campaignId = crowdfunding.nextCampaignId();

        crowdfunding.createCampaign(
            "Reentrant creator",
            "Campaign created by an attacker contract",
            goal,
            Crowdfunding.FundingMode.FixedDeadline,
            durationInDays
        );
    }

    function attackWithdraw() external {
        crowdfunding.withdrawFunds(campaignId);
    }

    receive() external payable {
        (bool success, bytes memory revertData) =
            address(crowdfunding).call(abi.encodeCall(Crowdfunding.withdrawFunds, (campaignId)));

        reentrySucceeded = success;
        reentryRevertData = revertData;
    }
}
