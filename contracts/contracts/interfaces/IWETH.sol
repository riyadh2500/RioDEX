// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IWETH
/// @notice Minimal interface for the canonical Wrapped-Ether contract
interface IWETH {
    /// @notice Wrap ETH → WETH (msg.value is deposited)
    function deposit() external payable;

    /// @notice Unwrap WETH → ETH
    function withdraw(uint256 amount) external;

    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}
