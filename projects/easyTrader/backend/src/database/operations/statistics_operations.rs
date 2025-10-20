use sqlx::{PgPool, Row};
use anyhow::Result;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StrategyStatistics {
    pub id: Uuid,
    pub strategy_id: Uuid,
    pub total_profit: Decimal,
    pub total_trades: i32,
    pub successful_trades: i32,
    pub current_price: Option<Decimal>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

pub struct StatisticsOperations;

impl StatisticsOperations {
    pub async fn create_or_update_statistics(
        pool: &PgPool,
        strategy_id: Uuid,
        total_profit: Decimal,
        total_trades: i32,
        successful_trades: i32,
        current_price: Option<Decimal>,
    ) -> Result<StrategyStatistics> {
        let row = sqlx::query(
            r#"
            INSERT INTO strategy_statistics (strategy_id, total_profit, total_trades, successful_trades, current_price)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (strategy_id) DO UPDATE SET
                total_profit = EXCLUDED.total_profit,
                total_trades = EXCLUDED.total_trades,
                successful_trades = EXCLUDED.successful_trades,
                current_price = EXCLUDED.current_price,
                updated_at = NOW()
            RETURNING id, strategy_id, total_profit, total_trades, successful_trades, current_price, created_at, updated_at
            "#
        )
        .bind(strategy_id)
        .bind(total_profit)
        .bind(total_trades)
        .bind(successful_trades)
        .bind(current_price)
        .fetch_one(pool)
        .await?;

        Ok(StrategyStatistics {
            id: row.get("id"),
            strategy_id: row.get("strategy_id"),
            total_profit: row.get("total_profit"),
            total_trades: row.get("total_trades"),
            successful_trades: row.get("successful_trades"),
            current_price: row.get("current_price"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
    }

    pub async fn get_statistics_by_strategy(pool: &PgPool, strategy_id: Uuid) -> Result<Option<StrategyStatistics>> {
        let row = sqlx::query(
            "SELECT id, strategy_id, total_profit, total_trades, successful_trades, current_price, created_at, updated_at FROM strategy_statistics WHERE strategy_id = $1"
        )
        .bind(strategy_id)
        .fetch_optional(pool)
        .await?;

        if let Some(row) = row {
            Ok(Some(StrategyStatistics {
                id: row.get("id"),
                strategy_id: row.get("strategy_id"),
                total_profit: row.get("total_profit"),
                total_trades: row.get("total_trades"),
                successful_trades: row.get("successful_trades"),
                current_price: row.get("current_price"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn update_profit(pool: &PgPool, strategy_id: Uuid, profit_delta: Decimal) -> Result<()> {
        sqlx::query(
            "UPDATE strategy_statistics SET total_profit = total_profit + $1, updated_at = NOW() WHERE strategy_id = $2"
        )
        .bind(profit_delta)
        .bind(strategy_id)
        .execute(pool)
        .await?;

        Ok(())
    }

    pub async fn increment_trade_count(pool: &PgPool, strategy_id: Uuid, successful: bool) -> Result<()> {
        if successful {
            sqlx::query(
                "UPDATE strategy_statistics SET total_trades = total_trades + 1, successful_trades = successful_trades + 1, updated_at = NOW() WHERE strategy_id = $1"
            )
            .bind(strategy_id)
            .execute(pool)
            .await?;
        } else {
            sqlx::query(
                "UPDATE strategy_statistics SET total_trades = total_trades + 1, updated_at = NOW() WHERE strategy_id = $1"
            )
            .bind(strategy_id)
            .execute(pool)
            .await?;
        }

        Ok(())
    }

    pub async fn update_current_price(pool: &PgPool, strategy_id: Uuid, price: Decimal) -> Result<()> {
        sqlx::query(
            "UPDATE strategy_statistics SET current_price = $1, updated_at = NOW() WHERE strategy_id = $2"
        )
        .bind(price)
        .bind(strategy_id)
        .execute(pool)
        .await?;

        Ok(())
    }

    pub async fn get_all_statistics(pool: &PgPool) -> Result<Vec<StrategyStatistics>> {
        let rows = sqlx::query(
            "SELECT id, strategy_id, total_profit, total_trades, successful_trades, current_price, created_at, updated_at FROM strategy_statistics ORDER BY created_at DESC"
        )
        .fetch_all(pool)
        .await?;

        let statistics = rows.into_iter().map(|row| StrategyStatistics {
            id: row.get("id"),
            strategy_id: row.get("strategy_id"),
            total_profit: row.get("total_profit"),
            total_trades: row.get("total_trades"),
            successful_trades: row.get("successful_trades"),
            current_price: row.get("current_price"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        }).collect();

        Ok(statistics)
    }

    pub async fn delete_statistics(pool: &PgPool, strategy_id: Uuid) -> Result<()> {
        sqlx::query("DELETE FROM strategy_statistics WHERE strategy_id = $1")
            .bind(strategy_id)
            .execute(pool)
            .await?;

        Ok(())
    }
}