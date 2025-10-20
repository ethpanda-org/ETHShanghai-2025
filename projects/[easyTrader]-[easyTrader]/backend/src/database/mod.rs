use anyhow::Result;
use sqlx::{PgPool, postgres::PgPoolOptions};
use std::time::Duration;

pub mod operations;

pub struct Database {
    pool: PgPool,
}

impl Database {
    pub async fn new(database_url: &str) -> Result<Self> {
        let pool = PgPoolOptions::new()
            .max_connections(20)
            .acquire_timeout(Duration::from_secs(30))
            .connect(database_url)
            .await?;

        Ok(Self { pool })
    }

    pub fn pool(&self) -> &PgPool {
        &self.pool
    }

    pub async fn create_tables(&self) -> Result<()> {
        operations::SystemOperations::create_tables(&self.pool).await?;
        operations::SystemOperations::create_indexes(&self.pool).await?;
        Ok(())
    }

    pub async fn health_check(&self) -> Result<bool> {
        operations::SystemOperations::health_check(&self.pool).await
    }
}