# Cross-Chain Payment Tool Implementation

This project implements a cross-chain USDT payment tool using the Meson protocol, integrated with the Model Context Protocol (MCP) framework.

## Features

- Cross-chain USDT transfers between different blockchain networks
- Integration with the Meson protocol for efficient cross-chain transactions
- Implementation of the MCP protocol for tool registration and invocation
- Comprehensive error handling and logging

## Implementation Details

The cross-chain payment tool (`src/cross_chain_pay_tool.rs`) implements the following functionality:

1. **Parameter Parsing** - Parses cross-chain payment request parameters from MCP clients
2. **Meson API Integration** - Calls Meson protocol APIs to get price information and encode swap requests
3. **Transaction Processing** - Handles cross-chain transactions based on Meson API responses

### Tool Parameters

```json
{
  "from": "source chain name",
  "to": "destination chain name",
  "amount": "USDT amount",
  "from_address": "sender address",
  "recipient": "recipient address"
}
```

### APIs Used

- Meson Price API: `https://relayer.meson.fi/api/v1/price`
- Meson Swap API: `https://relayer.meson.fi/api/v1/swap`

## Configuration

The configuration file is located at `./.picker-desktop/config.toml`:

```toml
[blockchain]
rpc_url = "https://sepolia.infura.io/v3/YOUR_PROJECT_ID"
explorer_url = "https://sepolia.etherscan.io"
wallet_private = "YOUR_PRIVATE_KEY"
token_usdt_url = "https://www.okx.com/api/v5/market/ticker?instId=ETH-USDT"
usdt_contract_address = "USDT_CONTRACT_ADDRESS"
meson_contract_address = "MESON_CONTRACT_ADDRESS"
```

## Build and Run

```bash
# Build the project
cargo build

# Run the server
cargo run
```

The server will start the MCP service at `http://127.0.0.1:3000`.

## Testing

Use the provided Python script to test the cross-chain payment tool:

```bash
python test_cross_chain_pay.py
```

## Dependencies

- [alloy](https://github.com/alloy-rs/alloy) - Rust blockchain library
- [rust-agent](../rust-agent-crate) - MCP protocol implementation
- [reqwest](https://github.com/seanmonstar/reqwest) - HTTP client
- [serde](https://github.com/serde-rs/serde) - Serialization framework
- [tokio](https://github.com/tokio-rs/tokio) - Asynchronous runtime