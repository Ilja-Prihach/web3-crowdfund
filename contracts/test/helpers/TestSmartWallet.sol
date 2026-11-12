// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC1271} from "@openzeppelin/contracts/interfaces/IERC1271.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @notice Тестовый смарт-кошелёк для проверки входа SIWE: подпись верна, если её сделал владелец.
contract TestSmartWallet is IERC1271 {
    address public immutable owner;

    constructor(address owner_) {
        owner = owner_;
    }

    function isValidSignature(bytes32 hash, bytes calldata signature) external view returns (bytes4) {
        (address signer, ECDSA.RecoverError error,) = ECDSA.tryRecover(hash, signature);
        bool valid = error == ECDSA.RecoverError.NoError && signer == owner;
        return valid ? IERC1271.isValidSignature.selector : bytes4(0xffffffff);
    }
}

/// @notice Фабрика с CREATE2: адрес кошелька известен до развёртывания — это нужно для ERC-6492.
contract TestSmartWalletFactory {
    function deploy(address owner, bytes32 salt) external returns (TestSmartWallet) {
        return new TestSmartWallet{salt: salt}(owner);
    }

    function predict(address owner, bytes32 salt) external view returns (address) {
        bytes32 codeHash = keccak256(abi.encodePacked(type(TestSmartWallet).creationCode, abi.encode(owner)));
        return address(uint160(uint256(keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, codeHash)))));
    }
}
