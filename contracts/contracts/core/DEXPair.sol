// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DEXErc20.sol";
import "../interfaces/IDEXFactory.sol";
import "../interfaces/IDEXCallee.sol";

/// @title DEXPair
/// @notice Constant-product AMM pair (x·y = k), modelled after Uniswap V2.
///         The pair contract is also the LP token (inherits DEXErc20).
contract DEXPair is DEXErc20 {
    using UQ112x112 for uint224;

    // ────────── Constants ──────────
    uint256 public constant MINIMUM_LIQUIDITY = 10 ** 3;

    // ────────── State ──────────
    address public factory;
    address public token0;
    address public token1;

    uint112 private reserve0;
    uint112 private reserve1;
    uint32  private blockTimestampLast;

    uint256 public price0CumulativeLast;
    uint256 public price1CumulativeLast;
    uint256 public kLast; // reserve0 * reserve1 after last fee-bearing event

    uint256 private unlocked = 1;

    // ────────── Events ──────────
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    // ────────── Modifiers ──────────
    modifier lock() {
        require(unlocked == 1, "DEXPair: LOCKED");
        unlocked = 0;
        _;
        unlocked = 1;
    }

    // ────────── Constructor ──────────
    constructor() {
        factory = msg.sender;
    }

    /// @notice Called once by the factory on deployment
    function initialize(address _token0, address _token1) external {
        require(msg.sender == factory, "DEXPair: FORBIDDEN");
        token0 = _token0;
        token1 = _token1;
    }

    // ────────── View ──────────
    function getReserves()
        public
        view
        returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast)
    {
        _reserve0          = reserve0;
        _reserve1          = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    // ────────── Internal helpers ──────────

    function _safeTransfer(address token, address to, uint256 value) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", to, value)
        );
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            "DEXPair: TRANSFER_FAILED"
        );
    }

    /// @dev Update reserves and the price accumulators (TWAP building blocks)
    function _update(
        uint256 balance0,
        uint256 balance1,
        uint112 _reserve0,
        uint112 _reserve1
    ) private {
        require(balance0 <= type(uint112).max && balance1 <= type(uint112).max, "DEXPair: OVERFLOW");

        uint32 blockTimestamp = uint32(block.timestamp % 2 ** 32);
        uint32 timeElapsed    = blockTimestamp - blockTimestampLast;

        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            // Overflow is intentional here — matches Uniswap V2 behaviour
            unchecked {
                price0CumulativeLast += uint256(UQ112x112.encode(_reserve1).uqdiv(_reserve0)) * timeElapsed;
                price1CumulativeLast += uint256(UQ112x112.encode(_reserve0).uqdiv(_reserve1)) * timeElapsed;
            }
        }

        reserve0           = uint112(balance0);
        reserve1           = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        emit Sync(reserve0, reserve1);
    }

    /// @dev Mint the 1/6th protocol fee (if feeTo is set) by issuing extra LP tokens
    function _mintFee(uint112 _reserve0, uint112 _reserve1) private returns (bool feeOn) {
        address feeTo = IDEXFactory(factory).feeTo();
        feeOn = feeTo != address(0);
        uint256 _kLast = kLast;
        if (feeOn) {
            if (_kLast != 0) {
                uint256 rootK     = _sqrt(uint256(_reserve0) * uint256(_reserve1));
                uint256 rootKLast = _sqrt(_kLast);
                if (rootK > rootKLast) {
                    uint256 numerator   = totalSupply * (rootK - rootKLast);
                    uint256 denominator = rootK * 5 + rootKLast;
                    uint256 liquidity   = numerator / denominator;
                    if (liquidity > 0) _mint(feeTo, liquidity);
                }
            }
        } else if (_kLast != 0) {
            kLast = 0;
        }
    }

    // ────────── Mutative ──────────

    /// @notice Add liquidity. Caller transfers tokens in first, then calls mint().
    function mint(address to) external lock returns (uint256 liquidity) {
        (uint112 _reserve0, uint112 _reserve1, ) = getReserves();
        uint256 balance0 = _tokenBalance(token0);
        uint256 balance1 = _tokenBalance(token1);
        uint256 amount0  = balance0 - _reserve0;
        uint256 amount1  = balance1 - _reserve1;

        bool feeOn        = _mintFee(_reserve0, _reserve1);
        uint256 _totalSupply = totalSupply;

        if (_totalSupply == 0) {
            liquidity = _sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(0), MINIMUM_LIQUIDITY); // permanently lock the minimum
        } else {
            liquidity = _min(
                (amount0 * _totalSupply) / _reserve0,
                (amount1 * _totalSupply) / _reserve1
            );
        }

        require(liquidity > 0, "DEXPair: INSUFFICIENT_LIQUIDITY_MINTED");
        _mint(to, liquidity);
        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint256(reserve0) * uint256(reserve1);
        emit Mint(msg.sender, amount0, amount1);
    }

    /// @notice Remove liquidity. Caller transfers LP tokens in first, then calls burn().
    function burn(address to) external lock returns (uint256 amount0, uint256 amount1) {
        (uint112 _reserve0, uint112 _reserve1, ) = getReserves();
        address _token0 = token0;
        address _token1 = token1;
        uint256 balance0    = _tokenBalance(_token0);
        uint256 balance1    = _tokenBalance(_token1);
        uint256 liquidity   = balanceOf[address(this)];

        bool feeOn        = _mintFee(_reserve0, _reserve1);
        uint256 _totalSupply = totalSupply;

        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;
        require(amount0 > 0 && amount1 > 0, "DEXPair: INSUFFICIENT_LIQUIDITY_BURNED");

        _burn(address(this), liquidity);
        _safeTransfer(_token0, to, amount0);
        _safeTransfer(_token1, to, amount1);
        balance0 = _tokenBalance(_token0);
        balance1 = _tokenBalance(_token1);

        _update(balance0, balance1, _reserve0, _reserve1);
        if (feeOn) kLast = uint256(reserve0) * uint256(reserve1);
        emit Burn(msg.sender, amount0, amount1, to);
    }

    /// @notice Execute a swap. amount0Out and/or amount1Out indicate what the caller wants.
    ///         Tokens must already be sent to this contract (or data != "" for flash swaps).
    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) external lock {
        require(amount0Out > 0 || amount1Out > 0, "DEXPair: INSUFFICIENT_OUTPUT_AMOUNT");
        (uint112 _reserve0, uint112 _reserve1, ) = getReserves();
        require(amount0Out < _reserve0 && amount1Out < _reserve1, "DEXPair: INSUFFICIENT_LIQUIDITY");

        address _token0 = token0;
        address _token1 = token1;
        require(to != _token0 && to != _token1, "DEXPair: INVALID_TO");

        if (amount0Out > 0) _safeTransfer(_token0, to, amount0Out);
        if (amount1Out > 0) _safeTransfer(_token1, to, amount1Out);
        if (data.length > 0) IDEXCallee(to).dexCall(msg.sender, amount0Out, amount1Out, data);

        uint256 balance0 = _tokenBalance(_token0);
        uint256 balance1 = _tokenBalance(_token1);

        uint256 amount0In = balance0 > _reserve0 - amount0Out
            ? balance0 - (_reserve0 - amount0Out)
            : 0;
        uint256 amount1In = balance1 > _reserve1 - amount1Out
            ? balance1 - (_reserve1 - amount1Out)
            : 0;
        require(amount0In > 0 || amount1In > 0, "DEXPair: INSUFFICIENT_INPUT_AMOUNT");

        // 0.3 % fee: k must not decrease
        uint256 balance0Adjusted = balance0 * 1000 - amount0In * 3;
        uint256 balance1Adjusted = balance1 * 1000 - amount1In * 3;
        require(
            balance0Adjusted * balance1Adjusted >= uint256(_reserve0) * uint256(_reserve1) * (1000 ** 2),
            "DEXPair: K"
        );

        _update(balance0, balance1, _reserve0, _reserve1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    /// @notice Force the pair's token balances to match its reserves (send excess to `to`)
    function skim(address to) external lock {
        _safeTransfer(token0, to, _tokenBalance(token0) - reserve0);
        _safeTransfer(token1, to, _tokenBalance(token1) - reserve1);
    }

    /// @notice Force the pair's reserves to match its actual token balances
    function sync() external lock {
        _update(_tokenBalance(token0), _tokenBalance(token1), reserve0, reserve1);
    }

    // ────────── Private helpers ──────────
    function _tokenBalance(address token) private view returns (uint256) {
        (bool success, bytes memory data) = token.staticcall(
            abi.encodeWithSignature("balanceOf(address)", address(this))
        );
        require(success, "DEXPair: BALANCE_FAILED");
        return abi.decode(data, (uint256));
    }

    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function _min(uint256 x, uint256 y) private pure returns (uint256) {
        return x < y ? x : y;
    }
}

// ────────────────────────────────────────────────────────────────────────────
// UQ112x112 — fixed-point library for TWAP accumulators
// ────────────────────────────────────────────────────────────────────────────
library UQ112x112 {
    uint224 constant Q112 = 2 ** 112;

    function encode(uint112 y) internal pure returns (uint224 z) {
        z = uint224(y) * Q112;
    }

    function uqdiv(uint224 x, uint112 y) internal pure returns (uint224 z) {
        z = x / uint224(y);
    }
}
