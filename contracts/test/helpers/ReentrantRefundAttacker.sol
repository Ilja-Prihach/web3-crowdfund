// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Crowdfunding} from "../../src/Crowdfunding.sol";

contract ReentrantRefundAttacker {
    Crowdfunding public immutable crowdfunding;

    uint256 public campaignId;
    bool public reentrySucceeded;
    bytes public reentryRevertData;

    constructor(Crowdfunding crowdfunding_) {
        crowdfunding = crowdfunding_;
    }

    function donate(uint256 campaignId_) external payable {
        campaignId = campaignId_;

        crowdfunding.donate{value: msg.value}(campaignId_);
    }

    function attackRefund() external {
        crowdfunding.refund(campaignId);
    }

    receive() external payable {
        (bool success, bytes memory revertData) =
            address(crowdfunding).call(abi.encodeCall(Crowdfunding.refund, (campaignId)));

        reentrySucceeded = success;
        reentryRevertData = revertData;
    }
}
