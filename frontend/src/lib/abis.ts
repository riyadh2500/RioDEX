// ─── DEXFactory ABI ───────────────────────────────────────────────────────────
export const DEX_FACTORY_ABI = [
  // View
  { name: 'feeTo',         type: 'function', stateMutability: 'view', inputs: [],                                   outputs: [{ type: 'address' }] },
  { name: 'feeToSetter',   type: 'function', stateMutability: 'view', inputs: [],                                   outputs: [{ type: 'address' }] },
  { name: 'allPairsLength',type: 'function', stateMutability: 'view', inputs: [],                                   outputs: [{ type: 'uint256' }] },
  { name: 'allPairs',      type: 'function', stateMutability: 'view', inputs: [{ name: 'index', type: 'uint256' }], outputs: [{ type: 'address' }] },
  { name: 'getPair',       type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' }], outputs: [{ type: 'address' }] },
  // Mutative
  { name: 'createPair',    type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' }], outputs: [{ name: 'pair', type: 'address' }] },
  { name: 'setFeeTo',      type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_feeTo', type: 'address' }], outputs: [] },
  { name: 'setFeeToSetter',type: 'function', stateMutability: 'nonpayable', inputs: [{ name: '_feeToSetter', type: 'address' }], outputs: [] },
  // Events
  { name: 'PairCreated', type: 'event', inputs: [{ name: 'token0', type: 'address', indexed: true }, { name: 'token1', type: 'address', indexed: true }, { name: 'pair', type: 'address', indexed: false }, { name: 'pairCount', type: 'uint256', indexed: false }] },
] as const

// ─── DEXRouter ABI ───────────────────────────────────────────────────────────
export const DEX_ROUTER_ABI = [
  // View
  { name: 'factory', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'WETH',    type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'quote',         type: 'function', stateMutability: 'pure', inputs: [{ name: 'amountA', type: 'uint256' }, { name: 'reserveA', type: 'uint256' }, { name: 'reserveB', type: 'uint256' }], outputs: [{ name: 'amountB', type: 'uint256' }] },
  { name: 'getAmountOut',  type: 'function', stateMutability: 'pure', inputs: [{ name: 'amountIn', type: 'uint256' }, { name: 'reserveIn', type: 'uint256' }, { name: 'reserveOut', type: 'uint256' }], outputs: [{ name: 'amountOut', type: 'uint256' }] },
  { name: 'getAmountIn',   type: 'function', stateMutability: 'pure', inputs: [{ name: 'amountOut', type: 'uint256' }, { name: 'reserveIn', type: 'uint256' }, { name: 'reserveOut', type: 'uint256' }], outputs: [{ name: 'amountIn', type: 'uint256' }] },
  { name: 'getAmountsOut', type: 'function', stateMutability: 'view', inputs: [{ name: 'amountIn', type: 'uint256' }, { name: 'path', type: 'address[]' }], outputs: [{ name: 'amounts', type: 'uint256[]' }] },
  { name: 'getAmountsIn',  type: 'function', stateMutability: 'view', inputs: [{ name: 'amountOut', type: 'uint256' }, { name: 'path', type: 'address[]' }], outputs: [{ name: 'amounts', type: 'uint256[]' }] },
  // Liquidity
  { name: 'addLiquidity',    type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' }, { name: 'amountADesired', type: 'uint256' }, { name: 'amountBDesired', type: 'uint256' }, { name: 'amountAMin', type: 'uint256' }, { name: 'amountBMin', type: 'uint256' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: 'amountA', type: 'uint256' }, { name: 'amountB', type: 'uint256' }, { name: 'liquidity', type: 'uint256' }] },
  { name: 'addLiquidityETH', type: 'function', stateMutability: 'payable',    inputs: [{ name: 'token', type: 'address' }, { name: 'amountTokenDesired', type: 'uint256' }, { name: 'amountTokenMin', type: 'uint256' }, { name: 'amountETHMin', type: 'uint256' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: 'amountToken', type: 'uint256' }, { name: 'amountETH', type: 'uint256' }, { name: 'liquidity', type: 'uint256' }] },
  { name: 'removeLiquidity',    type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'tokenA', type: 'address' }, { name: 'tokenB', type: 'address' }, { name: 'liquidity', type: 'uint256' }, { name: 'amountAMin', type: 'uint256' }, { name: 'amountBMin', type: 'uint256' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: 'amountA', type: 'uint256' }, { name: 'amountB', type: 'uint256' }] },
  { name: 'removeLiquidityETH', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'token', type: 'address' }, { name: 'liquidity', type: 'uint256' }, { name: 'amountTokenMin', type: 'uint256' }, { name: 'amountETHMin', type: 'uint256' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: 'amountToken', type: 'uint256' }, { name: 'amountETH', type: 'uint256' }] },
  // Swaps
  { name: 'swapExactTokensForTokens', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amountIn', type: 'uint256' }, { name: 'amountOutMin', type: 'uint256' }, { name: 'path', type: 'address[]' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: 'amounts', type: 'uint256[]' }] },
  { name: 'swapTokensForExactTokens', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amountOut', type: 'uint256' }, { name: 'amountInMax', type: 'uint256' }, { name: 'path', type: 'address[]' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: 'amounts', type: 'uint256[]' }] },
  { name: 'swapExactETHForTokens',    type: 'function', stateMutability: 'payable',    inputs: [{ name: 'amountOutMin', type: 'uint256' }, { name: 'path', type: 'address[]' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: 'amounts', type: 'uint256[]' }] },
  { name: 'swapExactTokensForETH',    type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amountIn', type: 'uint256' }, { name: 'amountOutMin', type: 'uint256' }, { name: 'path', type: 'address[]' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: 'amounts', type: 'uint256[]' }] },
  { name: 'swapTokensForExactETH',    type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amountOut', type: 'uint256' }, { name: 'amountInMax', type: 'uint256' }, { name: 'path', type: 'address[]' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: 'amounts', type: 'uint256[]' }] },
  { name: 'swapETHForExactTokens',    type: 'function', stateMutability: 'payable',    inputs: [{ name: 'amountOut', type: 'uint256' }, { name: 'path', type: 'address[]' }, { name: 'to', type: 'address' }, { name: 'deadline', type: 'uint256' }], outputs: [{ name: 'amounts', type: 'uint256[]' }] },
] as const

// ─── DEXPair ABI ─────────────────────────────────────────────────────────────
export const DEX_PAIR_ABI = [
  { name: 'token0',      type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'token1',      type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'factory',     type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf',   type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'allowance',   type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'getReserves', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: 'reserve0', type: 'uint112' }, { name: 'reserve1', type: 'uint112' }, { name: 'blockTimestampLast', type: 'uint32' }] },
  { name: 'kLast',       type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'MINIMUM_LIQUIDITY', type: 'function', stateMutability: 'pure', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'approve',      type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'transfer',     type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'transferFrom', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'mint',  type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }], outputs: [{ name: 'liquidity', type: 'uint256' }] },
  { name: 'burn',  type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }], outputs: [{ name: 'amount0', type: 'uint256' }, { name: 'amount1', type: 'uint256' }] },
  { name: 'sync',  type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  { name: 'Sync',  type: 'event', inputs: [{ name: 'reserve0', type: 'uint112', indexed: false }, { name: 'reserve1', type: 'uint112', indexed: false }] },
  { name: 'Swap',  type: 'event', inputs: [{ name: 'sender', type: 'address', indexed: true }, { name: 'amount0In', type: 'uint256', indexed: false }, { name: 'amount1In', type: 'uint256', indexed: false }, { name: 'amount0Out', type: 'uint256', indexed: false }, { name: 'amount1Out', type: 'uint256', indexed: false }, { name: 'to', type: 'address', indexed: true }] },
  { name: 'Mint',  type: 'event', inputs: [{ name: 'sender', type: 'address', indexed: true }, { name: 'amount0', type: 'uint256', indexed: false }, { name: 'amount1', type: 'uint256', indexed: false }] },
  { name: 'Burn',  type: 'event', inputs: [{ name: 'sender', type: 'address', indexed: true }, { name: 'amount0', type: 'uint256', indexed: false }, { name: 'amount1', type: 'uint256', indexed: false }, { name: 'to', type: 'address', indexed: true }] },
] as const

// ─── ERC-20 ABI (minimal) ─────────────────────────────────────────────────────
export const ERC20_ABI = [
  { name: 'name',        type: 'function', stateMutability: 'view',        inputs: [],                                                                                     outputs: [{ type: 'string' }]  },
  { name: 'symbol',      type: 'function', stateMutability: 'view',        inputs: [],                                                                                     outputs: [{ type: 'string' }]  },
  { name: 'decimals',    type: 'function', stateMutability: 'view',        inputs: [],                                                                                     outputs: [{ type: 'uint8' }]   },
  { name: 'totalSupply', type: 'function', stateMutability: 'view',        inputs: [],                                                                                     outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf',   type: 'function', stateMutability: 'view',        inputs: [{ name: 'account', type: 'address' }],                                                 outputs: [{ type: 'uint256' }] },
  { name: 'allowance',   type: 'function', stateMutability: 'view',        inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],             outputs: [{ type: 'uint256' }] },
  { name: 'approve',     type: 'function', stateMutability: 'nonpayable',  inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],            outputs: [{ type: 'bool' }]    },
  { name: 'transfer',    type: 'function', stateMutability: 'nonpayable',  inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],                 outputs: [{ type: 'bool' }]    },
  { name: 'transferFrom',type: 'function', stateMutability: 'nonpayable',  inputs: [{ name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'Transfer',    type: 'event',    inputs: [{ name: 'from', type: 'address', indexed: true }, { name: 'to', type: 'address', indexed: true }, { name: 'value', type: 'uint256', indexed: false }] },
  { name: 'Approval',    type: 'event',    inputs: [{ name: 'owner', type: 'address', indexed: true }, { name: 'spender', type: 'address', indexed: true }, { name: 'value', type: 'uint256', indexed: false }] },
] as const

// ─── TokenFactory ABI ─────────────────────────────────────────────────────────
export const TOKEN_FACTORY_ABI = [
  { name: 'creationFee',   type: 'function', stateMutability: 'view',        inputs: [],                                                                                                                                                       outputs: [{ type: 'uint256' }] },
  { name: 'feeReceiver',   type: 'function', stateMutability: 'view',        inputs: [],                                                                                                                                                       outputs: [{ type: 'address' }] },
  { name: 'allTokensLength',type:'function', stateMutability: 'view',        inputs: [],                                                                                                                                                       outputs: [{ type: 'uint256' }] },
  { name: 'allTokens',     type: 'function', stateMutability: 'view',        inputs: [{ name: 'index', type: 'uint256' }],                                                                                                                     outputs: [{ type: 'address' }] },
  { name: 'tokensOfCreator',type:'function', stateMutability: 'view',        inputs: [{ name: 'creator', type: 'address' }],                                                                                                                   outputs: [{ type: 'address[]' }] },
  { name: 'createToken',   type: 'function', stateMutability: 'payable',     inputs: [{ name: 'tokenName', type: 'string' }, { name: 'tokenSymbol', type: 'string' }, { name: 'tokenDecimals', type: 'uint8' }, { name: 'initialSupply', type: 'uint256' }], outputs: [{ name: 'tokenAddress', type: 'address' }] },
  { name: 'setCreationFee',type: 'function', stateMutability: 'nonpayable',  inputs: [{ name: '_fee', type: 'uint256' }],                                                                                                                      outputs: [] },
  { name: 'setFeeReceiver',type: 'function', stateMutability: 'nonpayable',  inputs: [{ name: '_receiver', type: 'address' }],                                                                                                                 outputs: [] },
  { name: 'TokenCreated',  type: 'event',    inputs: [{ name: 'token', type: 'address', indexed: true }, { name: 'creator', type: 'address', indexed: true }, { name: 'name', type: 'string', indexed: false }, { name: 'symbol', type: 'string', indexed: false }, { name: 'initialSupply', type: 'uint256', indexed: false }] },
] as const
