# cross-chain-pay-one-usdt

Meson API Cross Chain Pay One USDT - A Node.js-based cross-chain payment tool for transferring USDT between different blockchain networks.

## Project Structure

```text
cross-chain-pay-one-usdt/
├── src/                    # Source code directory
│   └── main.js             # Main business logic implementation
├── config.toml             # Project configuration file
├── entry.js                # Program entry file
├── package.json            # Node.js project configuration
├── package-lock.json       # Dependency version lock file
├── README.md               # Project documentation
└── .gitignore              # Git ignore rules
```

## Features

- Cross-chain USDT transfer based on Meson API
- Support for transferring from Sepolia ETH chain to other chains (e.g., Avalanche)
- Automatic token approval and transaction submission
- Complete error handling and logging
- Task status management

## Technology Stack

- Node.js
- Axios (HTTP requests)
- Ethers.js (Blockchain interaction)
- TOML (Configuration file parsing)

## Usage

### Install Dependencies

First, clone the repository and install project dependencies:

```bash
git clone <repository-url>
cd cross-chain-pay-one-usdt
npm install
```

### Configure the Project

Before running the program, you need to configure the `config.toml` file:

```toml
[environment]
from = "cfx:usdt"            # Source chain and token
to = "avax:usdt"            # Target chain and token
fromAddress = "0xYourAddress"  # Sender address
recipient = "0xRecipientAddress" # Recipient address
amount = 0.7                # Transfer amount
privateKey = ""             # Private key (please keep it secure)

[project]
name = "cross-chain-pay-one-usdt"
version = "1.0.0"
description = "Meson API Cross Chain Pay One USDT"
author = "openpick"
email = "openpicklabs@hotmail.com"
license = "MIT"

[task]
id = "b7e3a5d1-2c4f-41a7-b9d5-6a3c2b8d1e4f"
name = "Picker Nodejs task"
status = "Idle"
installed = "240128"
runs = 128
last_run = "240301"
```

### Run the Program

After configuration, you can run the program with the following command:

```bash
npm start
```

## Code Explanation

### Program Flow

1. `entry.js` reads the configuration file and initializes task status
2. Calls the main function in `src/main.js` to execute cross-chain transfer
3. Cross-chain transfer process includes:
   - Fetching price information
   - Approving tokens to Meson contract
   - Encoding cross-chain transfer request
   - Submitting transaction to blockchain
   - Waiting for transaction confirmation
4. Updates task status upon completion

### Main Functions

- `getPrice(from, to, amount, fromAddress)`: Fetches price information for cross-chain transfer
- `approveToken(provider, privateKey, amount)`: Approves tokens to Meson contract
- `encodeSwap(from, to, amount, fromAddress, recipient)`: Encodes cross-chain transfer request
- `submitTransaction(provider, privateKey, txData)`: Submits transaction to blockchain

## Development Guide

If you want to extend or modify this project, you can refer to the following guidelines:

1. Implement new features or modify existing ones in the `src/` directory
2. Keep `entry.js` as the program entry point, responsible for configuration loading and task status management
3. All blockchain interaction-related code should be placed in `src/main.js` or other specialized modules
4. Use `config.toml` to manage configuration parameters and avoid hardcoding sensitive information

## Security Tips

- Private key (`privateKey`) is very sensitive information, please ensure not to commit it to version control systems
- It is recommended to use environment variables or other secure methods to manage private keys
- Use testnets in testing environments and conduct thorough testing before production

## License

MIT License

