// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IDEXPair.sol";
import "../interfaces/IDEXFactory.sol";

/// @title DEXLibrary
/// @notice Pure/view helper functions used by DEXRouter — quote prices, compute amounts, sort tokens.
library DEXLibrary {
    // ────────── Token helpers ──────────

    /// @notice Sort two tokens into (token0, token1) canonical order (token0 < token1)
    function sortTokens(address tokenA, address tokenB)
        internal
        pure
        returns (address token0, address token1)
    {
        require(tokenA != tokenB, "DEXLibrary: IDENTICAL_ADDRESSES");
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "DEXLibrary: ZERO_ADDRESS");
    }

    /// @notice Compute the deterministic CREATE2 address for a pair without making any state reads
    function pairFor(address factory, address tokenA, address tokenB)
        internal
        view
        returns (address pair)
    {
        // Read from the factory directly — avoids hard-coding bytecode hashes
        pair = IDEXFactory(factory).getPair(tokenA, tokenB);
        require(pair != address(0), "DEXLibrary: PAIR_NOT_FOUND");
    }

    // ────────── Reserve helpers ──────────

    /// @notice Fetch the reserves for a pair, ordered so that reserveA corresponds to tokenA
    function getReserves(address factory, address tokenA, address tokenB)
        internal
        view
        returns (uint256 reserveA, uint256 reserveB)
    {
        (address token0, ) = sortTokens(tokenA, tokenB);
        address pair = IDEXFactory(factory).getPair(tokenA, tokenB);
        (uint256 reserve0, uint256 reserve1, ) = IDEXPair(pair).getReserves();
        (reserveA, reserveB) = tokenA == token0
            ? (reserve0, reserve1)
            : (reserve1, reserve0);
    }

    // ────────── Pricing ──────────

    /// @notice Given some amountA of tokenA and current reserves, return the equivalent amount of tokenB
    ///         (used when adding liquidity to maintain the current price ratio)
    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB)
        internal
        pure
        returns (uint256 amountB)
    {
        require(amountA > 0, "DEXLibrary: INSUFFICIENT_AMOUNT");
        require(reserveA > 0 && reserveB > 0, "DEXLibrary: INSUFFICIENT_LIQUIDITY");
        amountB = (amountA * reserveB) / reserveA;
    }

    /// @notice Given an exact input amount and reserves, return the output amount (0.3% fee applied)
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        internal
        pure
        returns (uint256 amountOut)
    {
        require(amountIn > 0, "DEXLibrary: INSUFFICIENT_INPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "DEXLibrary: INSUFFICIENT_LIQUIDITY");
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator       = amountInWithFee * reserveOut;
        uint256 denominator     = reserveIn * 1000 + amountInWithFee;
        amountOut               = numerator / denominator;
    }

    /// @notice Given a desired exact output amount and reserves, return the required input amount (0.3% fee applied)
    function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut)
        internal
        pure
        returns (uint256 amountIn)
    {
        require(amountOut > 0, "DEXLibrary: INSUFFICIENT_OUTPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "DEXLibrary: INSUFFICIENT_LIQUIDITY");
        uint256 numerator   = reserveIn * amountOut * 1000;
        uint256 denominator = (reserveOut - amountOut) * 997;
        amountIn            = numerator / denominator + 1;
    }

    // ────────── Multi-hop helpers ──────────

    /// @notice Given an exact input and a swap path, compute all intermediate and final output amounts
    function getAmountsOut(address factory, uint256 amountIn, address[] memory path)
        internal
        view
        returns (uint256[] memory amounts)
    {
        require(path.length >= 2, "DEXLibrary: INVALID_PATH");
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i; i < path.length - 1; i++) {
            (uint256 reserveIn, uint256 reserveOut) = getReserves(factory, path[i], path[i + 1]);
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    /// @notice Given a desired exact output and a swap path, compute all required input amounts
    function getAmountsIn(address factory, uint256 amountOut, address[] memory path)
        internal
        view
        returns (uint256[] memory amounts)
    {
        require(path.length >= 2, "DEXLibrary: INVALID_PATH");
        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint256 i = path.length - 1; i > 0; i--) {
            (uint256 reserveIn, uint256 reserveOut) = getReserves(factory, path[i - 1], path[i]);
            amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
        }
    }
}
