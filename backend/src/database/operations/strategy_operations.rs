use anyhow::Result;
use sqlx::PgPool;
use uuid::Uuid;
use rust_decimal::Decimal;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Strategy {
    pub id: Uuid,
    pub user_id: String,
    pub token_pair: String,
    pub base_token: String,
    pub quote_token: String,
    pub base_token_symbol: Option<String>,
    pub quote_token_symbol: Option<String>,
    pub grid_count: i32,
    pub price_range_min: Decimal,
    pub price_range_max: Decimal,
    pub total_investment: Decimal,
    pub status: String,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub paused_at: Option<DateTime<Utc>>,
    pub stopped_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateStrategyRequest {
    pub user_id: String,
    pub token_pair: String,
    pub base_token: String,
    pub quote_token: String,
    pub base_token_symbol: Option<String>,
    pub quote_token_symbol: Option<String>,
    pub grid_count: i32,
    pub price_range_min: Decimal,
    pub price_range_max: Decimal,
    pub total_investment: Decimal,
}

pub struct StrategyOperations;

impl StrategyOperations {
    pub async fn create_strategy(pool: &PgPool, request: CreateStrategyRequest) -> Result<Strategy> {
        let row = sqlx::query!(
            r#"
            INSERT INTO strategies (
                user_id, token_pair, base_token, quote_token, 
                base_token_symbol, quote_token_symbol, grid_count,
                price_range_min, price_range_max, total_investment
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            "#,
            request.user_id,
            request.token_pair,
            request.base_token,
            request.quote_token,
            request.base_token_symbol,
            request.quote_token_symbol,
            request.grid_count,
            request.price_range_min,
            request.price_range_max,
            request.total_investment
        )
        .fetch_one(pool)
        .await?;

        let strategy = Strategy {
            id: row.id,
            user_id: row.user_id,
            token_pair: row.token_pair,
            base_token: row.base_token,
            quote_token: row.quote_token,
            base_token_symbol: row.base_token_symbol,
            quote_token_symbol: row.quote_token_symbol,
            grid_count: row.grid_count,
            price_range_min: row.price_range_min,
            price_range_max: row.price_range_max,
            total_investment: row.total_investment,
            status: row.status,
            created_at: row.created_at,
            updated_at: row.updated_at,
            paused_at: row.paused_at,
            stopped_at: row.stopped_at,
        };

        Ok(strategy)
    }

    pub async fn get_strategy_by_id(pool: &PgPool, strategy_id: Uuid) -> Result<Option<Strategy>> {
        let row = sqlx::query!(
            "SELECT * FROM strategies WHERE id = $1",
            strategy_id
        )
        .fetch_optional(pool)
        .await?;

        let strategy = match row {
            Some(row) => Some(Strategy {
                id: row.id,
                user_id: row.user_id,
                token_pair: row.token_pair,
                base_token: row.base_token,
                quote_token: row.quote_token,
                base_token_symbol: row.base_token_symbol,
                quote_token_symbol: row.quote_token_symbol,
                grid_count: row.grid_count,
                price_range_min: row.price_range_min,
                price_range_max: row.price_range_max,
                total_investment: row.total_investment,
                status: row.status,
                created_at: row.created_at,
                updated_at: row.updated_at,
                paused_at: row.paused_at,
                stopped_at: row.stopped_at,
            }),
            None => None,
        };

        Ok(strategy)
    }

    pub async fn get_strategies_by_user(pool: &PgPool, user_id: &str) -> Result<Vec<Strategy>> {
        let rows = sqlx::query!(
            "SELECT * FROM strategies WHERE user_id = $1 ORDER BY created_at DESC",
            user_id
        )
        .fetch_all(pool)
        .await?;

        let strategies = rows.into_iter().map(|row| Strategy {
            id: row.id,
            user_id: row.user_id,
            token_pair: row.token_pair,
            base_token: row.base_token,
            quote_token: row.quote_token,
            base_token_symbol: row.base_token_symbol,
            quote_token_symbol: row.quote_token_symbol,
            grid_count: row.grid_count,
            price_range_min: row.price_range_min,
            price_range_max: row.price_range_max,
            total_investment: row.total_investment,
            status: row.status,
            created_at: row.created_at,
            updated_at: row.updated_at,
            paused_at: row.paused_at,
            stopped_at: row.stopped_at,
        }).collect();

        Ok(strategies)
    }

    pub async fn update_strategy_status(
        pool: &PgPool,
        strategy_id: Uuid,
        status: &str,
    ) -> Result<()> {
        let now = Utc::now();
        
        match status {
            "paused" => {
                sqlx::query!(
                    "UPDATE strategies SET status = $1, paused_at = $2, updated_at = $3 WHERE id = $4",
                    status,
                    now,
                    now,
                    strategy_id
                )
                .execute(pool)
                .await?;
            }
            "stopped" => {
                sqlx::query!(
                    "UPDATE strategies SET status = $1, stopped_at = $2, updated_at = $3 WHERE id = $4",
                    status,
                    now,
                    now,
                    strategy_id
                )
                .execute(pool)
                .await?;
            }
            _ => {
                sqlx::query!(
                    "UPDATE strategies SET status = $1, updated_at = $2 WHERE id = $3",
                    status,
                    now,
                    strategy_id
                )
                .execute(pool)
                .await?;
            }
        }

        Ok(())
    }

    pub async fn delete_strategy(pool: &PgPool, strategy_id: Uuid) -> Result<()> {
        sqlx::query!("DELETE FROM strategies WHERE id = $1", strategy_id)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn get_active_strategies(pool: &PgPool) -> Result<Vec<Strategy>> {
        let rows = sqlx::query!(
            "SELECT * FROM strategies WHERE status = 'active' ORDER BY created_at DESC"
        )
        .fetch_all(pool)
        .await?;

        let strategies = rows.into_iter().map(|row| Strategy {
            id: row.id,
            user_id: row.user_id,
            token_pair: row.token_pair,
            base_token: row.base_token,
            quote_token: row.quote_token,
            base_token_symbol: row.base_token_symbol,
            quote_token_symbol: row.quote_token_symbol,
            grid_count: row.grid_count,
            price_range_min: row.price_range_min,
            price_range_max: row.price_range_max,
            total_investment: row.total_investment,
            status: row.status,
            created_at: row.created_at,
            updated_at: row.updated_at,
            paused_at: row.paused_at,
            stopped_at: row.stopped_at,
        }).collect();

        Ok(strategies)
    }
}