package config

import (
	"github.com/spf13/viper"
)

type Config struct {
	Environment string
	Port        int
	LogLevel    string
	Database    DatabaseConfig
	Redis       RedisConfig
	SubgraphURL string `mapstructure:"subgraph_url"`
	Blockchain  BlockchainConfig
	Scheduler   SchedulerConfig
}

type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
	SSLMode  string
}

type RedisConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
}

type BlockchainConfig struct {
	RPCURL             string `mapstructure:"rpc_url"`
	ChainID            int64  `mapstructure:"chain_id"`
	PrivateKey         string `mapstructure:"private_key"`
	ReputationContract string `mapstructure:"reputation_contract"`
}

type SchedulerConfig struct {
	WeeklyUpdateEnabled bool   `mapstructure:"weekly_update_enabled"`
	WeeklyUpdateDay     string `mapstructure:"weekly_update_day"`
	WeeklyUpdateHour    int    `mapstructure:"weekly_update_hour"`

	MonthlyUpdateEnabled bool `mapstructure:"monthly_update_enabled"`
	MonthlyUpdateDay     int  `mapstructure:"monthly_update_day"`
	MonthlyUpdateHour    int  `mapstructure:"monthly_update_hour"`

	DevMode                   bool `mapstructure:"dev_mode"`
	DevWeeklyIntervalMinutes  int  `mapstructure:"dev_weekly_interval_minutes"`
	DevMonthlyIntervalMinutes int  `mapstructure:"dev_monthly_interval_minutes"`
}

func Load() (*Config, error) {
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./config")
	viper.AddConfigPath("../config")
	viper.AddConfigPath("../../config")

	// 设置默认值
	viper.SetDefault("environment", "development")
	viper.SetDefault("port", 8080)
	viper.SetDefault("log_level", "info")

	// Scheduler 默认值
	viper.SetDefault("scheduler.weekly_update_enabled", true)
	viper.SetDefault("scheduler.monthly_update_enabled", true)
	viper.SetDefault("scheduler.dev_mode", true)
	viper.SetDefault("scheduler.dev_weekly_interval_minutes", 10)
	viper.SetDefault("scheduler.dev_monthly_interval_minutes", 30)

	// 环境变量覆盖
	viper.AutomaticEnv()

	if err := viper.ReadInConfig(); err != nil {
		return nil, err
	}

	var config Config
	if err := viper.Unmarshal(&config); err != nil {
		return nil, err
	}

	return &config, nil
}
