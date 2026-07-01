// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC20Template.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title TokenFactory
/// @notice Allows anyone to launch a new ERC-20 token by paying a small creation fee.
///         The fee is forwarded to a configurable `feeReceiver` address.
contract TokenFactory is Ownable {
    // ────────── State ──────────
    uint256 public creationFee;
    address public feeReceiver;

    /// @notice All tokens ever deployed by this factory
    address[] public allTokens;

    /// @notice Tokens deployed by a given creator address
    mapping(address => address[]) public tokensByCreator;

    // ────────── Events ──────────
    event TokenCreated(
        address indexed token,
        address indexed creator,
        string  name,
        string  symbol,
        uint256 initialSupply
    );
    event FeeUpdated(uint256 newFee);
    event FeeReceiverUpdated(address newReceiver);

    // ────────── Constructor ──────────
    constructor(uint256 _creationFee, address _feeReceiver) {
        creationFee  = _creationFee;
        feeReceiver  = _feeReceiver;
    }

    // ────────── View ──────────
    function allTokensLength() external view returns (uint256) {
        return allTokens.length;
    }

    function tokensOfCreator(address creator) external view returns (address[] memory) {
        return tokensByCreator[creator];
    }

    // ────────── Mutative ──────────

    /// @notice Deploy a new ERC-20 token.  Caller must send at least `creationFee` ETH.
    /// @param tokenName     Human-readable name (e.g. "My Token")
    /// @param tokenSymbol   Ticker symbol (e.g. "MTK")
    /// @param tokenDecimals Decimals — typically 18
    /// @param initialSupply Number of whole tokens minted to the caller
    function createToken(
        string calldata tokenName,
        string calldata tokenSymbol,
        uint8           tokenDecimals,
        uint256         initialSupply
    ) external payable returns (address tokenAddress) {
        require(msg.value >= creationFee, "TokenFactory: INSUFFICIENT_FEE");
        require(bytes(tokenName).length   > 0, "TokenFactory: EMPTY_NAME");
        require(bytes(tokenSymbol).length > 0, "TokenFactory: EMPTY_SYMBOL");
        require(initialSupply > 0,             "TokenFactory: ZERO_SUPPLY");

        ERC20Template newToken = new ERC20Template(
            tokenName,
            tokenSymbol,
            tokenDecimals,
            initialSupply,
            msg.sender
        );
        tokenAddress = address(newToken);

        allTokens.push(tokenAddress);
        tokensByCreator[msg.sender].push(tokenAddress);

        // Forward creation fee to receiver
        if (creationFee > 0) {
            (bool ok, ) = feeReceiver.call{value: creationFee}("");
            require(ok, "TokenFactory: FEE_TRANSFER_FAILED");
        }

        // Refund any excess ETH
        uint256 excess = msg.value - creationFee;
        if (excess > 0) {
            (bool refundOk, ) = msg.sender.call{value: excess}("");
            require(refundOk, "TokenFactory: REFUND_FAILED");
        }

        emit TokenCreated(tokenAddress, msg.sender, tokenName, tokenSymbol, initialSupply);
    }

    // ────────── Admin ──────────
    function setCreationFee(uint256 _fee) external onlyOwner {
        creationFee = _fee;
        emit FeeUpdated(_fee);
    }

    function setFeeReceiver(address _receiver) external onlyOwner {
        require(_receiver != address(0), "TokenFactory: ZERO_ADDRESS");
        feeReceiver = _receiver;
        emit FeeReceiverUpdated(_receiver);
    }

    /// @notice Rescue any ETH accidentally sent directly to this contract
    function withdrawETH() external onlyOwner {
        (bool ok, ) = owner().call{value: address(this).balance}("");
        require(ok, "TokenFactory: WITHDRAW_FAILED");
    }
}
