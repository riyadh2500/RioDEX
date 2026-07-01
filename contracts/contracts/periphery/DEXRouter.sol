// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DEXLibrary.sol";
import "../interfaces/IDEXFactory.sol";
import "../interfaces/IDEXPair.sol";
import "../interfaces/IWETH.sol";

/// @title DEXRouter
/// @notice The user-facing periphery contract.  All swap / liquidity operations
///         go through here.  Modelled after Uniswap V2 Router02.
contract DEXRouter {
    // ────────── Immutables ──────────
    address public immutable factory;
    address public immutable WETH;

    // ────────── Modifiers ──────────
    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "DEXRouter: EXPIRED");
        _;
    }

    // ────────── Constructor ──────────
    constructor(address _factory, address _WETH) {
        factory = _factory;
        WETH    = _WETH;
    }

    // ────────── Receive ETH (from WETH.withdraw only) ──────────
    receive() external payable {
        assert(msg.sender == WETH);
    }

    // ══════════════════════════════════════════════════════════════
    //  LIQUIDITY
    // ══════════════════════════════════════════════════════════════

    /// @dev Shared add-liquidity logic.  Creates the pair if it doesn't exist yet.
    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal returns (uint256 amountA, uint256 amountB) {
        // Create pair on first liquidity deposit
        if (IDEXFactory(factory).getPair(tokenA, tokenB) == address(0)) {
            IDEXFactory(factory).createPair(tokenA, tokenB);
        }
        (uint256 reserveA, uint256 reserveB) = DEXLibrary.getReserves(factory, tokenA, tokenB);
        if (reserveA == 0 && reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = DEXLibrary.quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "DEXRouter: INSUFFICIENT_B_AMOUNT");
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = DEXLibrary.quote(amountBDesired, reserveB, reserveA);
                require(amountAOptimal <= amountADesired, "DEXRouter: EXCESSIVE_A_AMOUNT");
                require(amountAOptimal >= amountAMin, "DEXRouter: INSUFFICIENT_A_AMOUNT");
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    /// @notice Add liquidity for a token/token pair
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        ensure(deadline)
        returns (uint256 amountA, uint256 amountB, uint256 liquidity)
    {
        (amountA, amountB) = _addLiquidity(
            tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin
        );
        address pair = IDEXFactory(factory).getPair(tokenA, tokenB);
        _safeTransferFrom(tokenA, msg.sender, pair, amountA);
        _safeTransferFrom(tokenB, msg.sender, pair, amountB);
        liquidity = IDEXPair(pair).mint(to);
    }

    /// @notice Add liquidity for a token/ETH pair — ETH is wrapped to WETH automatically
    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
        external
        payable
        ensure(deadline)
        returns (uint256 amountToken, uint256 amountETH, uint256 liquidity)
    {
        (amountToken, amountETH) = _addLiquidity(
            token, WETH, amountTokenDesired, msg.value, amountTokenMin, amountETHMin
        );
        address pair = IDEXFactory(factory).getPair(token, WETH);
        _safeTransferFrom(token, msg.sender, pair, amountToken);
        IWETH(WETH).deposit{value: amountETH}();
        assert(IWETH(WETH).transfer(pair, amountETH));
        liquidity = IDEXPair(pair).mint(to);
        // Refund excess ETH
        if (msg.value > amountETH) {
            (bool ok, ) = msg.sender.call{value: msg.value - amountETH}("");
            require(ok, "DEXRouter: ETH_REFUND_FAILED");
        }
    }

    /// @notice Remove liquidity from a token/token pair
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        public
        ensure(deadline)
        returns (uint256 amountA, uint256 amountB)
    {
        address pair = IDEXFactory(factory).getPair(tokenA, tokenB);
        IDEXPair(pair).transferFrom(msg.sender, pair, liquidity);
        (uint256 amount0, uint256 amount1) = IDEXPair(pair).burn(to);
        (address token0, ) = DEXLibrary.sortTokens(tokenA, tokenB);
        (amountA, amountB) = tokenA == token0
            ? (amount0, amount1)
            : (amount1, amount0);
        require(amountA >= amountAMin, "DEXRouter: INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "DEXRouter: INSUFFICIENT_B_AMOUNT");
    }

    /// @notice Remove liquidity from a token/ETH pair — WETH is unwrapped automatically
    function removeLiquidityETH(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    )
        public
        ensure(deadline)
        returns (uint256 amountToken, uint256 amountETH)
    {
        (amountToken, amountETH) = removeLiquidity(
            token,
            WETH,
            liquidity,
            amountTokenMin,
            amountETHMin,
            address(this),
            deadline
        );
        _safeTransfer(token, to, amountToken);
        IWETH(WETH).withdraw(amountETH);
        (bool ok, ) = to.call{value: amountETH}("");
        require(ok, "DEXRouter: ETH_TRANSFER_FAILED");
    }

    /// @notice Remove liquidity using a permit signature (gasless approval)
    function removeLiquidityWithPermit(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 amountA, uint256 amountB) {
        address pair = IDEXFactory(factory).getPair(tokenA, tokenB);
        uint256 value = approveMax ? type(uint256).max : liquidity;
        IDEXPair(pair).permit(msg.sender, address(this), value, deadline, v, r, s);
        (amountA, amountB) = removeLiquidity(tokenA, tokenB, liquidity, amountAMin, amountBMin, to, deadline);
    }

    /// @notice Remove liquidity from a token/ETH pair using a permit signature
    function removeLiquidityETHWithPermit(
        address token,
        uint256 liquidity,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external returns (uint256 amountToken, uint256 amountETH) {
        address pair = IDEXFactory(factory).getPair(token, WETH);
        uint256 value = approveMax ? type(uint256).max : liquidity;
        IDEXPair(pair).permit(msg.sender, address(this), value, deadline, v, r, s);
        (amountToken, amountETH) = removeLiquidityETH(
            token, liquidity, amountTokenMin, amountETHMin, to, deadline
        );
    }

    // ══════════════════════════════════════════════════════════════
    //  SWAP (exact-input)
    // ══════════════════════════════════════════════════════════════

    function _swap(uint256[] memory amounts, address[] memory path, address _to) internal {
        for (uint256 i; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0, )              = DEXLibrary.sortTokens(input, output);
            uint256 amountOut               = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) = input == token0
                ? (uint256(0), amountOut)
                : (amountOut, uint256(0));
            address to = i < path.length - 2
                ? IDEXFactory(factory).getPair(output, path[i + 2])
                : _to;
            IDEXPair(IDEXFactory(factory).getPair(input, output)).swap(
                amount0Out, amount1Out, to, new bytes(0)
            );
        }
    }

    /// @notice Swap exact tokens for tokens (multi-hop)
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        amounts = DEXLibrary.getAmountsOut(factory, amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "DEXRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        _safeTransferFrom(path[0], msg.sender, IDEXFactory(factory).getPair(path[0], path[1]), amounts[0]);
        _swap(amounts, path, to);
    }

    /// @notice Swap tokens for exact tokens (multi-hop)
    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        amounts = DEXLibrary.getAmountsIn(factory, amountOut, path);
        require(amounts[0] <= amountInMax, "DEXRouter: EXCESSIVE_INPUT_AMOUNT");
        _safeTransferFrom(path[0], msg.sender, IDEXFactory(factory).getPair(path[0], path[1]), amounts[0]);
        _swap(amounts, path, to);
    }

    /// @notice Swap exact ETH for tokens
    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable ensure(deadline) returns (uint256[] memory amounts) {
        require(path[0] == WETH, "DEXRouter: INVALID_PATH");
        amounts = DEXLibrary.getAmountsOut(factory, msg.value, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "DEXRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        IWETH(WETH).deposit{value: amounts[0]}();
        assert(IWETH(WETH).transfer(IDEXFactory(factory).getPair(path[0], path[1]), amounts[0]));
        _swap(amounts, path, to);
    }

    /// @notice Swap tokens for exact ETH
    function swapTokensForExactETH(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        require(path[path.length - 1] == WETH, "DEXRouter: INVALID_PATH");
        amounts = DEXLibrary.getAmountsIn(factory, amountOut, path);
        require(amounts[0] <= amountInMax, "DEXRouter: EXCESSIVE_INPUT_AMOUNT");
        _safeTransferFrom(path[0], msg.sender, IDEXFactory(factory).getPair(path[0], path[1]), amounts[0]);
        _swap(amounts, path, address(this));
        IWETH(WETH).withdraw(amounts[amounts.length - 1]);
        (bool ok, ) = to.call{value: amounts[amounts.length - 1]}("");
        require(ok, "DEXRouter: ETH_TRANSFER_FAILED");
    }

    /// @notice Swap exact tokens for ETH
    function swapExactTokensForETH(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) returns (uint256[] memory amounts) {
        require(path[path.length - 1] == WETH, "DEXRouter: INVALID_PATH");
        amounts = DEXLibrary.getAmountsOut(factory, amountIn, path);
        require(amounts[amounts.length - 1] >= amountOutMin, "DEXRouter: INSUFFICIENT_OUTPUT_AMOUNT");
        _safeTransferFrom(path[0], msg.sender, IDEXFactory(factory).getPair(path[0], path[1]), amounts[0]);
        _swap(amounts, path, address(this));
        IWETH(WETH).withdraw(amounts[amounts.length - 1]);
        (bool ok, ) = to.call{value: amounts[amounts.length - 1]}("");
        require(ok, "DEXRouter: ETH_TRANSFER_FAILED");
    }

    /// @notice Swap ETH for exact tokens
    function swapETHForExactTokens(
        uint256 amountOut,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable ensure(deadline) returns (uint256[] memory amounts) {
        require(path[0] == WETH, "DEXRouter: INVALID_PATH");
        amounts = DEXLibrary.getAmountsIn(factory, amountOut, path);
        require(amounts[0] <= msg.value, "DEXRouter: EXCESSIVE_INPUT_AMOUNT");
        IWETH(WETH).deposit{value: amounts[0]}();
        assert(IWETH(WETH).transfer(IDEXFactory(factory).getPair(path[0], path[1]), amounts[0]));
        _swap(amounts, path, to);
        // Refund excess ETH
        if (msg.value > amounts[0]) {
            (bool ok, ) = msg.sender.call{value: msg.value - amounts[0]}("");
            require(ok, "DEXRouter: ETH_REFUND_FAILED");
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  VIEW HELPERS (delegate to DEXLibrary)
    // ══════════════════════════════════════════════════════════════

    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB)
        external pure returns (uint256 amountB)
    {
        return DEXLibrary.quote(amountA, reserveA, reserveB);
    }

    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        external pure returns (uint256 amountOut)
    {
        return DEXLibrary.getAmountOut(amountIn, reserveIn, reserveOut);
    }

    function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut)
        external pure returns (uint256 amountIn)
    {
        return DEXLibrary.getAmountIn(amountOut, reserveIn, reserveOut);
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external view returns (uint256[] memory amounts)
    {
        return DEXLibrary.getAmountsOut(factory, amountIn, path);
    }

    function getAmountsIn(uint256 amountOut, address[] calldata path)
        external view returns (uint256[] memory amounts)
    {
        return DEXLibrary.getAmountsIn(factory, amountOut, path);
    }

    // ══════════════════════════════════════════════════════════════
    //  PRIVATE TRANSFER HELPERS
    // ══════════════════════════════════════════════════════════════

    function _safeTransfer(address token, address to, uint256 value) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", to, value)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "DEXRouter: TRANSFER_FAILED");
    }

    function _safeTransferFrom(address token, address from, address to, uint256 value) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, value)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "DEXRouter: TRANSFER_FROM_FAILED");
    }
}
