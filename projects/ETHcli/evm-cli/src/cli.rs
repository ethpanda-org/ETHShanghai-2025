use clap::{Parser, Subcommand};

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Commands,
}

#[derive(Subcommand, Debug)]
pub enum Commands {
    /// Run the interactive CLI
    Cli,
    /// Manage wallets
    Wallet(WalletArgs),
}

#[derive(Parser, Debug)]
pub struct WalletArgs {
    #[command(subcommand)]
    pub action: WalletAction,
}

#[derive(Subcommand, Debug)]
pub enum WalletAction {
    /// Import a new wallet from a private key
    Import(ImportArgs),
    /// List all wallets
    List,
    /// Remove a wallet
    Remove(RemoveArgs),
}

#[derive(Parser, Debug)]
pub struct ImportArgs {
    /// The name of the account to import
    pub account_name: String,
}

#[derive(Parser, Debug)]
pub struct RemoveArgs {
    /// The name of the account to remove
    pub account_name: String,
}

