// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Crowdfunding} from "../../src/Crowdfunding.sol";

contract RejectingEtherReceiver {
    Crowdfunding public immutable crowdfunding;

    error EtherRejected();

    constructor(Crowdfunding crowdfunding_) {
        crowdfunding = crowdfunding_;
    }

    function createCampaign(uint256 goal, uint256 durationInDays) external {
        crowdfunding.createCampaign(
            "Rejecting receiver",
            "Campaign created by a contract that rejects ETH",
            goal,
            Crowdfunding.FundingMode.FixedDeadline,
            durationInDays
        );
    }

    function donate(uint256 campaignId) external payable {
        crowdfunding.donate{value: msg.value}(campaignId);
    }

    function withdrawFunds(uint256 campaignId) external {
        crowdfunding.withdrawFunds(campaignId);
    }

    function refund(uint256 campaignId) external {
        crowdfunding.refund(campaignId);
    }

    receive() external payable {
        revert EtherRejected();
    }
}
