// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Crowdfunding} from "../../src/Crowdfunding.sol";

contract DonationHandler is Test {
    Crowdfunding public immutable crowdfunding;

    address[3] private donors;

    uint256 public ghostTotalDonated;

    mapping(address => uint256) public ghostDonations;

    constructor(Crowdfunding crowdfunding_) {
        crowdfunding = crowdfunding_;

        donors[0] = makeAddr("donor-0");
        donors[1] = makeAddr("donor-1");
        donors[2] = makeAddr("donor-2");
    }

    function donate(uint256 donorSeed, uint256 rawAmount) external {
        address donor = donors[donorSeed % donors.length];
        uint256 amount = bound(rawAmount, 1 wei, 10 ether);

        vm.deal(donor, amount);
        vm.prank(donor);

        crowdfunding.donate{value: amount}(0);

        ghostTotalDonated += amount;
        ghostDonations[donor] += amount;
    }

    function donorCount() external pure returns (uint256) {
        return 3;
    }

    function donorAt(uint256 index) external view returns (address) {
        return donors[index];
    }
}
