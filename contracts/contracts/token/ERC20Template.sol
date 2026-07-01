// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC20Template
/// @notice A simple ERC-20 token deployed by TokenFactory.
///         The deployer receives the full initial supply and becomes the owner.
contract ERC20Template is ERC20, Ownable {
    uint8 private _decimals;

    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        uint8  tokenDecimals,
        uint256 initialSupply,
        address creator
    )
        ERC20(tokenName, tokenSymbol)
    {
        _decimals = tokenDecimals;
        _transferOwnership(creator);
        _mint(creator, initialSupply * (10 ** tokenDecimals));
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /// @notice Owner can mint additional tokens at any time
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Anyone can burn their own tokens
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }
}
