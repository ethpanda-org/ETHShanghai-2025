package logger

import (
	"log/slog"
	"os"
)

var log *slog.Logger

func Init(level string) {
	var logLevel slog.Level
	switch level {
	case "debug":
		logLevel = slog.LevelDebug
	case "info":
		logLevel = slog.LevelInfo
	case "warn":
		logLevel = slog.LevelWarn
	case "error":
		logLevel = slog.LevelError
	default:
		logLevel = slog.LevelInfo
	}

	log = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: logLevel,
	}))
}

func Info(msg string, args ...interface{}) {
	log.Info(msg, args...)
}

func Error(msg string, args ...interface{}) {
	log.Error(msg, args...)
}

func Debug(msg string, args ...interface{}) {
	log.Debug(msg, args...)
}

func Warn(msg string, args ...interface{}) {
	log.Warn(msg, args...)
}
