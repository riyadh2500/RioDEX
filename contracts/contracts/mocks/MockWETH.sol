// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockWETH
/// @notice Drop-in Wrapped-Ether for local Hardhat networks.
///         Implements the canonical WETH deposit/withdraw interface.
contract MockWETH is ERC20 {
    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);

    constructor() ERC20("Wrapped Ether", "WETH") {}

    /// @notice Wrap ETH → WETH
    receive() external payable {
        deposit();
    }

    function deposit() public payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    /// @notice Unwrap WETH → ETH
    function withdraw(uint256 wad) external {
        require(balanceOf(msg.sender) >= wad, "MockWETH: INSUFFICIENT_BALANCE");
        _burn(msg.sender, wad);
        (bool ok, ) = msg.sender.call{value: wad}("");
        require(ok, "MockWETH: ETH_TRANSFER_FAILED");
        emit Withdrawal(msg.sender, wad);
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
