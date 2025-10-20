package main

import (
	"fmt"
	"os"
	"time"

	"github.com/spf13/viper"
)

type Config struct {
	DatabasePath string
	EthRPCURL    string
	MonitorInterval time.Duration
	Addresses    []string
}

func loadConfig() (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("/etc/w3hub/")

	// 设置默认值
	viper.SetDefault("database.path", "./w3hub.db")
	viper.SetDefault("monitor.interval", "5m")

	if err := viper.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("读取配置文件失败: %w", err)
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, fmt.Errorf("解析配置失败: %w", err)
	}

	// 环境变量覆盖
	if url := os.Getenv("ETH_RPC_URL"); url != "" {
		config.EthRPCURL = url
	}

	return &config, nil
}

func initDatabase(db *sql.DB) error {
	_, err := db.Exec(`CREATE TABLE IF NOT EXISTS assets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		chain_type TEXT NOT NULL,
		address TEXT NOT NULL,
		balance REAL NOT NULL,
		token_type TEXT,
		last_updated TIMESTAMP,
		UNIQUE(chain_type, address, token_type)
	)`)
	if err != nil {
		return err
	}

	_, err = db.Exec(`CREATE TABLE IF NOT EXISTS asset_history (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		asset_id INTEGER NOT NULL,
		balance REAL NOT NULL,
		timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY(asset_id) REFERENCES assets(id)
	)`)
	return err
}