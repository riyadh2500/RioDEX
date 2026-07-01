// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IDEXFactory
/// @notice Interface for the DEX factory that deploys and tracks trading pairs
interface IDEXFactory {
    // ────────── Events ──────────
    event PairCreated(
        address indexed token0,
        address indexed token1,
        address pair,
        uint256 pairCount
    );

    // ────────── View ──────────
    /// @notice Address that receives the protocol fee (if enabled)
    function feeTo() external view returns (address);

    /// @notice Address allowed to change the feeTo address
    function feeToSetter() external view returns (address);

    /// @notice Returns the pair address for two tokens (order-insensitive)
    function getPair(address tokenA, address tokenB) external view returns (address pair);

    /// @notice Returns the pair at a given index
    function allPairs(uint256 index) external view returns (address pair);

    /// @notice Total number of pairs created
    function allPairsLength() external view returns (uint256);

    // ────────── Mutative ──────────
    /// @notice Deploy a new pair for tokenA / tokenB
    function createPair(address tokenA, address tokenB) external returns (address pair);

    /// @notice Set the address that receives the protocol fee
    function setFeeTo(address) external;

    /// @notice Transfer the feeToSetter role
    function setFeeToSetter(address) external;
}
