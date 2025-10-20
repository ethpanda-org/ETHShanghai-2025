use sqlx::{PgPool, Row};
use anyhow::Result;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GridOrder {
    pub id: Uuid,
    pub strategy_id: Uuid,
    pub order_type: String,
    pub price: Decimal,
    pub amount: Decimal,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateOrderRequest {
    pub strategy_id: Uuid,
    pub order_type: String,
    pub price: Decimal,
    pub amount: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TradeHistory {
    pub id: Uuid,
    pub strategy_id: Uuid,
    pub order_id: Uuid,
    pub trade_type: String,
    pub price: Decimal,
    pub amount: Decimal,
    pub profit: Option<Decimal>,
    pub created_at: DateTime<Utc>,
}

pub struct OrderOperations;

impl OrderOperations {
    pub async fn create_order(pool: &PgPool, request: &CreateOrderRequest) -> Result<GridOrder> {
        let row = sqlx::query(
            r#"
            INSERT INTO grid_orders (strategy_id, order_type, price, amount)
            VALUES ($1, $2, $3, $4)
            RETURNING id, strategy_id, order_type, price, amount, status, created_at, updated_at
            "#
        )
        .bind(&request.strategy_id)
        .bind(&request.order_type)
        .bind(&request.price)
        .bind(&request.amount)
        .fetch_one(pool)
        .await?;

        Ok(GridOrder {
            id: row.get("id"),
            strategy_id: row.get("strategy_id"),
            order_type: row.get("order_type"),
            price: row.get("price"),
            amount: row.get("amount"),
            status: row.get("status"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        })
    }

    pub async fn get_orders_by_strategy(pool: &PgPool, strategy_id: Uuid) -> Result<Vec<GridOrder>> {
        let rows = sqlx::query(
            "SELECT id, strategy_id, order_type, price, amount, status, created_at, updated_at FROM grid_orders WHERE strategy_id = $1 ORDER BY created_at DESC"
        )
        .bind(strategy_id)
        .fetch_all(pool)
        .await?;

        let orders = rows.into_iter().map(|row| GridOrder {
            id: row.get("id"),
            strategy_id: row.get("strategy_id"),
            order_type: row.get("order_type"),
            price: row.get("price"),
            amount: row.get("amount"),
            status: row.get("status"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        }).collect();

        Ok(orders)
    }

    pub async fn get_pending_orders(pool: &PgPool, strategy_id: Uuid) -> Result<Vec<GridOrder>> {
        let rows = sqlx::query(
            "SELECT id, strategy_id, order_type, price, amount, status, created_at, updated_at FROM grid_orders WHERE strategy_id = $1 AND status = 'pending' ORDER BY created_at DESC"
        )
        .bind(strategy_id)
        .fetch_all(pool)
        .await?;

        let orders = rows.into_iter().map(|row| GridOrder {
            id: row.get("id"),
            strategy_id: row.get("strategy_id"),
            order_type: row.get("order_type"),
            price: row.get("price"),
            amount: row.get("amount"),
            status: row.get("status"),
            created_at: row.get("created_at"),
            updated_at: row.get("updated_at"),
        }).collect();

        Ok(orders)
    }

    pub async fn update_order_status(pool: &PgPool, order_id: Uuid, status: &str) -> Result<()> {
        sqlx::query(
            "UPDATE grid_orders SET status = $1, updated_at = NOW() WHERE id = $2"
        )
        .bind(status)
        .bind(order_id)
        .execute(pool)
        .await?;

        Ok(())
    }

    pub async fn delete_order(pool: &PgPool, order_id: Uuid) -> Result<()> {
        sqlx::query("DELETE FROM grid_orders WHERE id = $1")
            .bind(order_id)
            .execute(pool)
            .await?;

        Ok(())
    }

    pub async fn create_trade_history(
        pool: &PgPool,
        strategy_id: Uuid,
        order_id: Uuid,
        trade_type: &str,
        price: Decimal,
        amount: Decimal,
        profit: Option<Decimal>,
    ) -> Result<TradeHistory> {
        let row = sqlx::query(
            r#"
            INSERT INTO trade_history (strategy_id, order_id, trade_type, price, amount, profit)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, strategy_id, order_id, trade_type, price, amount, profit, created_at
            "#
        )
        .bind(strategy_id)
        .bind(order_id)
        .bind(trade_type)
        .bind(price)
        .bind(amount)
        .bind(profit)
        .fetch_one(pool)
        .await?;

        Ok(TradeHistory {
            id: row.get("id"),
            strategy_id: row.get("strategy_id"),
            order_id: row.get("order_id"),
            trade_type: row.get("trade_type"),
            price: row.get("price"),
            amount: row.get("amount"),
            profit: row.get("profit"),
            created_at: row.get("created_at"),
        })
    }

    pub async fn get_trade_history_by_strategy(pool: &PgPool, strategy_id: Uuid) -> Result<Vec<TradeHistory>> {
        let rows = sqlx::query(
            "SELECT id, strategy_id, order_id, trade_type, price, amount, profit, created_at FROM trade_history WHERE strategy_id = $1 ORDER BY created_at DESC"
        )
        .bind(strategy_id)
        .fetch_all(pool)
        .await?;

        let trades = rows.into_iter().map(|row| TradeHistory {
            id: row.get("id"),
            strategy_id: row.get("strategy_id"),
            order_id: row.get("order_id"),
            trade_type: row.get("trade_type"),
            price: row.get("price"),
            amount: row.get("amount"),
            profit: row.get("profit"),
            created_at: row.get("created_at"),
        }).collect();

        Ok(trades)
    }

    pub async fn cancel_pending_orders(pool: &PgPool, strategy_id: Uuid) -> Result<()> {
        sqlx::query(
            "UPDATE grid_orders SET status = 'cancelled', updated_at = NOW() WHERE strategy_id = $1 AND status = 'pending'"
        )
        .bind(strategy_id)
        .execute(pool)
        .await?;

        Ok(())
    }
}