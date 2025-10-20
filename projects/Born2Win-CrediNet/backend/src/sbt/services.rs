use sqlx::{SqlitePool, Row};
use chrono::Utc;
use crate::shared::errors::AppError;
use super::types::*;
use super::contract::SbtContract;
use super::mapper::SbtMapper;

/// SBT 发放服务
pub struct SbtService {
    db: SqlitePool,
    contract: SbtContract,
    mapper: SbtMapper,
}

impl SbtService {
    pub fn new(db: SqlitePool) -> Self {
        Self {
            contract: SbtContract::from_env(),
            mapper: SbtMapper::new(db.clone()),
            db,
        }
    }

    /// 自动发放SBT（基于用户画像）
    pub async fn auto_issue_sbts(&self, user_id: &str) -> Result<Vec<SbtIssuanceInfo>, AppError> {
        println!("🎁 Starting auto SBT issuance for user {}", user_id);

        // 1. 获取用户主钱包地址
        let primary_wallet = self.get_primary_wallet(user_id).await?;
        if primary_wallet.is_none() {
            return Err(AppError::ValidationError("未设置主钱包地址".to_string()));
        }
        let recipient = primary_wallet.unwrap();

        // 2. 根据信用画像确定符合条件的SBT
        let eligible_sbts = self.mapper.determine_eligible_sbts(user_id).await?;
        
        if eligible_sbts.is_empty() {
            println!("  ℹ️  No eligible SBTs for user {}", user_id);
            return Ok(vec![]);
        }

        // 3. 过滤已发放的SBT
        let to_issue = self.mapper.filter_unissued_sbts(user_id, eligible_sbts).await?;
        
        if to_issue.is_empty() {
            println!("  ℹ️  All eligible SBTs already issued");
            return Ok(vec![]);
        }

        // 4. 批量发放SBT
        let mut issued_sbts = Vec::new();
        
        for sbt_type in to_issue {
            let sbt_type_str = sbt_type.as_str().to_string();
            match self.issue_single_sbt(user_id, &recipient, sbt_type).await {
                Ok(info) => {
                    issued_sbts.push(info);
                }
                Err(e) => {
                    println!("⚠️  Failed to issue SBT {}: {}", sbt_type_str, e);
                    // 继续处理其他SBT
                }
            }
        }

        println!("✅ Successfully issued {} SBTs", issued_sbts.len());

        Ok(issued_sbts)
    }

    /// 手动发放指定类型的SBT
    pub async fn manual_issue_sbt(
        &self,
        user_id: &str,
        sbt_type_str: &str,
    ) -> Result<SbtIssuanceInfo, AppError> {
        let sbt_type = SbtType::from_str(sbt_type_str)
            .ok_or_else(|| AppError::ValidationError(format!("无效的SBT类型: {}", sbt_type_str)))?;

        // 获取主钱包地址
        let primary_wallet = self.get_primary_wallet(user_id).await?
            .ok_or_else(|| AppError::ValidationError("未设置主钱包地址".to_string()))?;

        // 检查是否已发放
        if self.mapper.filter_unissued_sbts(user_id, vec![sbt_type.clone()]).await?.is_empty() {
            return Err(AppError::ValidationError("该SBT已发放".to_string()));
        }

        self.issue_single_sbt(user_id, &primary_wallet, sbt_type).await
    }

    /// 发放单个SBT
    async fn issue_single_sbt(
        &self,
        user_id: &str,
        recipient: &str,
        sbt_type: SbtType,
    ) -> Result<SbtIssuanceInfo, AppError> {
        let now = Utc::now().to_rfc3339();
        let token_id = sbt_type.token_id();
        let sbt_type_str = sbt_type.as_str().to_string();

        println!("  🔨 Issuing SBT: type={}, token_id={}, to={}", sbt_type_str, token_id, recipient);

        // 1. 创建发放记录（状态：PENDING）
        sqlx::query(
            "INSERT OR REPLACE INTO sbt_issuance 
             (user_id, sbt_type, token_id, status, issued_at) 
             VALUES (?, ?, ?, 'PENDING', ?)"
        )
        .bind(user_id)
        .bind(&sbt_type_str)
        .bind(token_id.to_string())
        .bind(&now)
        .execute(&self.db)
        .await?;

        // 2. 调用智能合约发放SBT
        let tx_hash = match self.contract.issue_sbt(recipient, token_id, None).await {
            Ok(hash) => {
                // 更新状态为 PROCESSING
                sqlx::query(
                    "UPDATE sbt_issuance 
                     SET status = 'PROCESSING', tx_hash = ? 
                     WHERE user_id = ? AND sbt_type = ?"
                )
                .bind(&hash)
                .bind(user_id)
                .bind(&sbt_type_str)
                .execute(&self.db)
                .await?;

                hash
            }
            Err(e) => {
                // 更新状态为 FAILED
                sqlx::query(
                    "UPDATE sbt_issuance 
                     SET status = 'FAILED' 
                     WHERE user_id = ? AND sbt_type = ?"
                )
                .bind(user_id)
                .bind(&sbt_type_str)
                .execute(&self.db)
                .await?;

                return Err(AppError::ValidationError(format!("合约调用失败: {}", e)));
            }
        };

        // 3. 异步确认交易（后台任务）
        // 实际应该使用后台任务队列，这里简化为立即确认
        let _ = self.confirm_transaction(user_id, &sbt_type_str, &tx_hash).await;

        // 4. 返回发放信息
        Ok(SbtIssuanceInfo {
            sbt_type: sbt_type_str.to_string(),
            token_id: Some(token_id),
            tx_hash: Some(tx_hash.clone()),
            status: "PROCESSING".to_string(),
            recipient_address: recipient.to_string(),
            issued_at: now.clone(),
            confirmed_at: None,
        })
    }

    /// 确认交易状态（链上状态同步）
    async fn confirm_transaction(
        &self,
        user_id: &str,
        sbt_type: &str,
        tx_hash: &str,
    ) -> Result<(), AppError> {
        // 查询交易状态
        let tx_status = self.contract.get_transaction_status(tx_hash).await?;

        if tx_status.status == "confirmed" {
            // 更新状态为 CONFIRMED
            let now = Utc::now().to_rfc3339();
            sqlx::query(
                "UPDATE sbt_issuance 
                 SET status = 'CONFIRMED', confirmed_at = ? 
                 WHERE user_id = ? AND sbt_type = ? AND tx_hash = ?"
            )
            .bind(&now)
            .bind(user_id)
            .bind(sbt_type)
            .bind(tx_hash)
            .execute(&self.db)
            .await?;

            println!("  ✅ Transaction confirmed: {}", tx_hash);
        } else if tx_status.status == "failed" {
            // 更新状态为 FAILED
            sqlx::query(
                "UPDATE sbt_issuance 
                 SET status = 'FAILED' 
                 WHERE user_id = ? AND sbt_type = ? AND tx_hash = ?"
            )
            .bind(user_id)
            .bind(sbt_type)
            .bind(tx_hash)
            .execute(&self.db)
            .await?;

            println!("  ❌ Transaction failed: {}", tx_hash);
        }

        Ok(())
    }

    /// 后台同步所有待确认的SBT交易
    pub async fn sync_pending_transactions(&self) -> Result<usize, AppError> {
        let rows = sqlx::query(
            "SELECT user_id, sbt_type, tx_hash 
             FROM sbt_issuance 
             WHERE status = 'PROCESSING' AND tx_hash IS NOT NULL"
        )
        .fetch_all(&self.db)
        .await?;

        let mut synced_count = 0;

        for row in rows {
            let user_id: String = row.try_get("user_id")?;
            let sbt_type: String = row.try_get("sbt_type")?;
            let tx_hash: String = row.try_get("tx_hash")?;

            if self.confirm_transaction(&user_id, &sbt_type, &tx_hash).await.is_ok() {
                synced_count += 1;
            }
        }

        println!("🔄 Synced {} pending SBT transactions", synced_count);

        Ok(synced_count)
    }

    /// 获取用户已发放的SBT列表
    pub async fn get_user_sbts(&self, user_id: &str) -> Result<Vec<SbtIssuanceInfo>, AppError> {
        let rows = sqlx::query(
            "SELECT sbt_type, token_id, tx_hash, status, issued_at, confirmed_at 
             FROM sbt_issuance 
             WHERE user_id = ? 
             ORDER BY issued_at DESC"
        )
        .bind(user_id)
        .fetch_all(&self.db)
        .await?;

        // 获取主钱包地址
        let primary_wallet = self.get_primary_wallet(user_id).await?.unwrap_or_default();

        let mut sbts = Vec::new();
        for row in rows {
            sbts.push(SbtIssuanceInfo {
                sbt_type: row.try_get("sbt_type")?,
                token_id: row.try_get::<Option<String>, _>("token_id")?.and_then(|s| s.parse().ok()),
                tx_hash: row.try_get("tx_hash")?,
                status: row.try_get("status")?,
                recipient_address: primary_wallet.clone(),
                issued_at: row.try_get("issued_at")?,
                confirmed_at: row.try_get("confirmed_at")?,
            });
        }

        Ok(sbts)
    }

    /// 获取特定SBT的状态
    pub async fn get_sbt_status(
        &self,
        user_id: &str,
        sbt_type_str: &str,
    ) -> Result<Option<SbtStatusResponse>, AppError> {
        let row = sqlx::query(
            "SELECT status, tx_hash, confirmed_at 
             FROM sbt_issuance 
             WHERE user_id = ? AND sbt_type = ?"
        )
        .bind(user_id)
        .bind(sbt_type_str)
        .fetch_optional(&self.db)
        .await?;

        if let Some(r) = row {
            let status: String = r.try_get("status")?;
            let tx_hash: Option<String> = r.try_get("tx_hash")?;

            // 如果有交易哈希，查询链上状态
            let (block_number, error) = if let Some(ref hash) = tx_hash {
                match self.contract.get_transaction_status(hash).await {
                    Ok(tx_status) => (tx_status.block_number, None),
                    Err(e) => (None, Some(e.to_string())),
                }
            } else {
                (None, None)
            };

            Ok(Some(SbtStatusResponse {
                sbt_type: sbt_type_str.to_string(),
                status,
                tx_hash,
                block_number,
                confirmed_at: r.try_get("confirmed_at")?,
                error,
            }))
        } else {
            Ok(None)
        }
    }

    /// 重试失败的SBT发放
    pub async fn retry_failed_issuance(
        &self,
        user_id: &str,
        sbt_type_str: &str,
    ) -> Result<SbtIssuanceInfo, AppError> {
        // 检查状态
        let row = sqlx::query(
            "SELECT status FROM sbt_issuance 
             WHERE user_id = ? AND sbt_type = ?"
        )
        .bind(user_id)
        .bind(sbt_type_str)
        .fetch_optional(&self.db)
        .await?;

        if let Some(r) = row {
            let status: String = r.try_get("status")?;
            if status != "FAILED" {
                return Err(AppError::ValidationError(
                    format!("SBT状态为{}，无法重试", status)
                ));
            }
        }

        // 重新发放
        self.manual_issue_sbt(user_id, sbt_type_str).await
    }

    /// 撤销SBT发放记录（仅限PENDING或FAILED状态）
    pub async fn cancel_issuance(
        &self,
        user_id: &str,
        sbt_type: &str,
    ) -> Result<(), AppError> {
        let result = sqlx::query(
            "DELETE FROM sbt_issuance 
             WHERE user_id = ? AND sbt_type = ? AND status IN ('PENDING', 'FAILED')"
        )
        .bind(user_id)
        .bind(sbt_type)
        .execute(&self.db)
        .await?;

        if result.rows_affected() == 0 {
            return Err(AppError::ValidationError("无法撤销已确认的SBT".to_string()));
        }

        Ok(())
    }

    /// 获取统计信息
    pub async fn get_issuance_stats(&self, user_id: &str) -> Result<serde_json::Value, AppError> {
        let total: i64 = sqlx::query(
            "SELECT COUNT(*) as count FROM sbt_issuance WHERE user_id = ?"
        )
        .bind(user_id)
        .fetch_one(&self.db)
        .await?
        .try_get("count")?;

        let confirmed: i64 = sqlx::query(
            "SELECT COUNT(*) as count FROM sbt_issuance 
             WHERE user_id = ? AND status = 'CONFIRMED'"
        )
        .bind(user_id)
        .fetch_one(&self.db)
        .await?
        .try_get("count")?;

        let pending: i64 = sqlx::query(
            "SELECT COUNT(*) as count FROM sbt_issuance 
             WHERE user_id = ? AND status IN ('PENDING', 'PROCESSING')"
        )
        .bind(user_id)
        .fetch_one(&self.db)
        .await?
        .try_get("count")?;

        let failed: i64 = sqlx::query(
            "SELECT COUNT(*) as count FROM sbt_issuance 
             WHERE user_id = ? AND status = 'FAILED'"
        )
        .bind(user_id)
        .fetch_one(&self.db)
        .await?
        .try_get("count")?;

        Ok(serde_json::json!({
            "total": total,
            "confirmed": confirmed,
            "pending": pending,
            "failed": failed,
        }))
    }

    // ========== 内部辅助方法 ==========

    async fn get_primary_wallet(&self, user_id: &str) -> Result<Option<String>, AppError> {
        let result = sqlx::query(
            "SELECT address FROM wallet_addresses 
             WHERE user_id = ? AND is_primary = 1"
        )
        .bind(user_id)
        .fetch_optional(&self.db)
        .await?;

        if let Some(row) = result {
            Ok(Some(row.try_get("address")?))
        } else {
            Ok(None)
        }
    }
}


