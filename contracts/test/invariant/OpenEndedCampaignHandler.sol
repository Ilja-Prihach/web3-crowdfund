// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Crowdfunding} from "../../src/Crowdfunding.sol";

contract OpenEndedCampaignHandler is Test {
    Crowdfunding public immutable crowdfunding;
    address public immutable creator;
    uint256 public immutable goal;

    address[3] private donors;

    uint256 public ghostTotalRaised;
    bool public ghostWithdrawn;

    mapping(address => uint256) public ghostContributions;

    constructor(Crowdfunding crowdfunding_, address creator_, uint256 goal_) {
        crowdfunding = crowdfunding_;
        creator = creator_;
        goal = goal_;

        donors[0] = makeAddr("open-donor-0");
        donors[1] = makeAddr("open-donor-1");
        donors[2] = makeAddr("open-donor-2");
    }

    function donate(uint256 donorSeed, uint256 rawAmount) external {
        if (ghostTotalRaised >= goal || ghostWithdrawn) return;

        address donor = donors[donorSeed % donors.length];
        uint256 amount = bound(rawAmount, 1 wei, 10 ether);

        vm.deal(donor, amount);
        vm.prank(donor);
        crowdfunding.donate{value: amount}(0);

        ghostTotalRaised += amount;
        ghostContributions[donor] += amount;
    }

    function refund(uint256 donorSeed) external {
        if (ghostTotalRaised >= goal || ghostWithdrawn) return;

        address donor = donors[donorSeed % donors.length];
        uint256 contribution = ghostContributions[donor];

        if (contribution == 0) return;

        vm.prank(donor);
        crowdfunding.refund(0);

        ghostTotalRaised -= contribution;
        ghostContributions[donor] = 0;
    }

    function withdraw() external {
        if (ghostTotalRaised < goal || ghostWithdrawn) return;

        vm.prank(creator);
        crowdfunding.withdrawFunds(0);

        ghostWithdrawn = true;
    }

    function donorCount() external pure returns (uint256) {
        return 3;
    }

    function donorAt(uint256 index) external view returns (address) {
        return donors[index];
    }
}
