// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IDEXCallee
/// @notice Callback interface for flash swaps — any contract receiving tokens mid-swap must implement this
interface IDEXCallee {
    /// @param sender   Address that initiated the swap
    /// @param amount0  Amount of token0 sent to callee
    /// @param amount1  Amount of token1 sent to callee
    /// @param data     Arbitrary data passed through from the swap call
    function dexCall(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
}
