// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DEXPair.sol";
import "../interfaces/IDEXFactory.sol";

/// @title DEXFactory
/// @notice Deploys and tracks all DEXPair contracts. Based on Uniswap V2 factory pattern.
contract DEXFactory is IDEXFactory {
    // ────────── State ──────────
    address public feeTo;
    address public feeToSetter;

    /// @notice tokenA → tokenB → pair address (always stored with token0 < token1)
    mapping(address => mapping(address => address)) public getPair;

    /// @notice Ordered list of every pair ever deployed
    address[] public allPairs;

    // ────────── Constructor ──────────
    constructor(address _feeToSetter) {
        feeToSetter = _feeToSetter;
    }

    // ────────── View ──────────
    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    // ────────── Mutative ──────────

    /// @notice Deploy a new AMM pair for tokenA / tokenB.
    ///         Reverts if either address is zero, they are identical, or the pair already exists.
    function createPair(address tokenA, address tokenB)
        external
        returns (address pair)
    {
        require(tokenA != tokenB, "DEXFactory: IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        require(token0 != address(0), "DEXFactory: ZERO_ADDRESS");
        require(getPair[token0][token1] == address(0), "DEXFactory: PAIR_EXISTS");

        // Deploy the pair using CREATE2 so the address is deterministic
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        DEXPair newPair = new DEXPair{salt: salt}();
        newPair.initialize(token0, token1);
        pair = address(newPair);

        // Store both orderings for convenience
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    /// @notice Direct the 1/6th protocol fee to `_feeTo`
    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, "DEXFactory: FORBIDDEN");
        feeTo = _feeTo;
    }

    /// @notice Transfer the admin role for feeTo changes
    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, "DEXFactory: FORBIDDEN");
        feeToSetter = _feeToSetter;
    }
}
