# Foundry Template with OpenZeppelin

> This template provides a basic setup for a Foundry project with OpenZeppelin 5.1.0 contracts integration.

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

-   **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
-   **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
-   **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
-   **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Dependencies Management

This project uses [Soldeer](https://github.com/mario-eth/soldeer) for dependency management, which is integrated into Forge.

### Install Dependencies

To install all dependencies listed in `foundry.toml`:

```shell
$ forge soldeer install
```

### Add New Dependencies

To add a new dependency (e.g., OpenZeppelin contracts):

```shell
$ forge soldeer install @openzeppelin-contracts~5.4.0
```

To add Forge standard library:

```shell
$ forge soldeer install forge-std~1.9.3
```

### Update Dependencies

To update a specific dependency:

```shell
$ forge soldeer update @openzeppelin-contracts
```

To update all dependencies:

```shell
$ forge soldeer update
```

### Remove Dependencies

To remove a dependency:

```shell
$ forge soldeer uninstall @openzeppelin-contracts
```

### Current Dependencies

This project includes:
- `@openzeppelin-contracts` (5.4.0) - OpenZeppelin smart contract library
- `forge-std` (1.9.3) - Foundry standard library for testing

Dependencies are stored in the `dependencies/` directory and managed through `soldeer.lock`.

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
