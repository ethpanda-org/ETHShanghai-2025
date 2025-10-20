use aes_gcm::{aead::{Aead, KeyInit, OsRng}, Aes256Gcm, Nonce};
use anyhow::{anyhow, Context, Result};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::fs::{self, File, OpenOptions};
use std::path::PathBuf;
use colored::*;

// EVM 相关导入
use secp256k1::{Secp256k1, SecretKey, PublicKey};
use tiny_keccak::{Hasher, Keccak};

const KEY_ITERATIONS: u32 = 100_000;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Wallet {
    pub name: String,
    #[serde(default)]
    pub public_key: Option<String>, // Ethereum address (0x...)
    pub encrypted_private_key: String, // hex encoded
    pub salt: String,               // hex encoded
    pub nonce: String,              // hex encoded
}

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct WalletStore {
    pub(crate) wallets: Vec<Wallet>,
    #[serde(skip)]
    path: PathBuf,
}

impl WalletStore {
    pub fn new(path: PathBuf) -> Result<Self> {
        let mut store = if path.exists() {
            let file = File::open(&path).context("Failed to open wallet file")?;
            serde_json::from_reader(file).context("Failed to deserialize wallet file")?
        } else {
            WalletStore::default()
        };
        store.path = path;
        Ok(store)
    }

    pub fn get_wallet_path() -> Result<PathBuf> {
        let data_dir = dirs::data_dir().ok_or_else(|| anyhow!("Could not find data directory"))?;
        let app_dir = data_dir.join("evm-cli");
        fs::create_dir_all(&app_dir).context("Failed to create app directory")?;
        Ok(app_dir.join("wallets.json"))
    }

    fn save(&self) -> Result<()> {
        let file = OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(&self.path)
            .context("Failed to open wallet file for writing")?;
        serde_json::to_writer_pretty(file, self).context("Failed to serialize and write wallet data")?;
        Ok(())
    }

    pub fn add_wallet(&mut self, name: &str, private_key_str: &str, password: &str) -> Result<()> {
        if self.wallets.iter().any(|w| w.name == name) {
            return Err(anyhow!("Wallet with name '{}' already exists", name));
        }

        // 派生并存储公钥（以太坊地址）
        let public_key = derive_ethereum_address(private_key_str)?;

        // 加密并存储私钥
        let mut salt = [0u8; 16];
        OsRng.fill_bytes(&mut salt);

        let key = derive_key(password, &salt);
        let cipher = Aes256Gcm::new((&key).into());

        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        let encrypted_private_key = cipher
            .encrypt(nonce, private_key_str.as_bytes())
            .map_err(|e| anyhow!("Encryption failed: {}", e))?;

        let wallet = Wallet {
            name: name.to_string(),
            public_key: Some(public_key),
            encrypted_private_key: hex::encode(encrypted_private_key),
            salt: hex::encode(salt),
            nonce: hex::encode(nonce_bytes),
        };

        self.wallets.push(wallet);
        self.save()
    }

    pub fn list_wallets(&self) {
        if self.wallets.is_empty() {
            println!("\n{} {}", "⚠️".yellow(), "No wallets found.".bold());
            return;
        }
        println!("\n{} {}", "✨".cyan(), "Available wallets:".bold());
        for (i, wallet) in self.wallets.iter().enumerate() {
            let pk_str = wallet.public_key.as_deref().unwrap_or("[address not derived]");
            println!(
                "  {}. {} ({})",
                (i + 1).to_string().green(),
                wallet.name.bold(),
                pk_str.dimmed()
            );
        }
        println!();
    }

    pub fn get_wallets(&self) -> &Vec<Wallet> {
        &self.wallets
    }

    pub fn decrypt_private_key(&self, name: &str, password: &str) -> Result<String> {
        let wallet = self
            .wallets
            .iter()
            .find(|w| w.name == name)
            .ok_or_else(|| anyhow!("Wallet '{}' not found", name))?;

        let salt = hex::decode(&wallet.salt).context("Failed to decode salt")?;
        let key = derive_key(password, &salt);
        let cipher = Aes256Gcm::new((&key).into());
        let nonce_bytes = hex::decode(&wallet.nonce).context("Failed to decode nonce")?;
        let nonce = Nonce::from_slice(&nonce_bytes);
        let encrypted_private_key_bytes = hex::decode(&wallet.encrypted_private_key).context("Failed to decode private key")?;

        let decrypted_body = cipher
            .decrypt(nonce, encrypted_private_key_bytes.as_ref())
            .map_err(|_| anyhow!("Invalid password"))?;

        String::from_utf8(decrypted_body).context("Failed to convert decrypted bytes to string")
    }

    pub fn remove_wallet(&mut self, name: &str, password: &str) -> Result<()> {
        // 使用解密函数验证密码
        self.decrypt_private_key(name, password)?;

        let wallet_index = self
            .wallets
            .iter()
            .position(|w| w.name == name)
            .ok_or_else(|| anyhow!("Wallet '{}' not found", name))?;

        self.wallets.remove(wallet_index);
        self.save()
    }
}

// Derive a 256-bit key from a password and salt using PBKDF2-HMAC-SHA256.
fn derive_key(password: &str, salt: &[u8]) -> [u8; 32] {
    let mut key = [0u8; 32];
    pbkdf2::pbkdf2_hmac::<Sha256>(password.as_bytes(), salt, KEY_ITERATIONS, &mut key);
    key
}

/// 从私钥派生以太坊地址
/// 支持两种格式：
/// 1. 十六进制（带或不带 0x 前缀）
/// 2. 64 字符的十六进制字符串
fn derive_ethereum_address(private_key_str: &str) -> Result<String> {
    // 移除 0x 前缀
    let pk_hex = private_key_str.trim_start_matches("0x");
    
    // 解码十六进制私钥
    let pk_bytes = hex::decode(pk_hex)
        .context("Invalid private key hex. Expected 64 hex characters (32 bytes).")?;

    if pk_bytes.len() != 32 {
        return Err(anyhow!("Private key must be exactly 32 bytes. Got {} bytes.", pk_bytes.len()));
    }

    // 使用 secp256k1 派生公钥
    let secp = Secp256k1::new();
    let secret_key = SecretKey::from_slice(&pk_bytes)
        .map_err(|e| anyhow!("Invalid private key: {}", e))?;
    let public_key = PublicKey::from_secret_key(&secp, &secret_key);

    // 获取未压缩公钥（65 字节：0x04 + X(32) + Y(32)）
    // 移除第一个字节 0x04，只保留 X 和 Y 坐标
    let pubkey_bytes = &public_key.serialize_uncompressed()[1..];

    // 对公钥进行 Keccak256 哈希
    let mut hasher = Keccak::v256();
    let mut hash = [0u8; 32];
    hasher.update(pubkey_bytes);
    hasher.finalize(&mut hash);

    // 以太坊地址是哈希的后 20 字节
    let address = format!("0x{}", hex::encode(&hash[12..]));
    Ok(address)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_derive_ethereum_address() {
        // 测试已知的私钥和地址对
        // 这是一个公开的测试私钥，不要在生产环境使用！
        let private_key = "0x4c0883a69102937d6231471b5dbb6204fe512961708279f8f640c63f4e4e1c9d";
        let expected_address = "0x2c7536e3605d9c16a7a3d7b1898e529396a65c23";
        
        let derived = derive_ethereum_address(private_key).unwrap();
        assert_eq!(derived.to_lowercase(), expected_address.to_lowercase());
    }
    
    #[test]
    fn test_derive_without_0x_prefix() {
        let private_key = "4c0883a69102937d6231471b5dbb6204fe512961708279f8f640c63f4e4e1c9d";
        let expected_address = "0x2c7536e3605d9c16a7a3d7b1898e529396a65c23";
        
        let derived = derive_ethereum_address(private_key).unwrap();
        assert_eq!(derived.to_lowercase(), expected_address.to_lowercase());
    }
}

