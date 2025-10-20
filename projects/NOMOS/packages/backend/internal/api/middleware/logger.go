package middleware

import (
	"time"

	"github.com/gin-gonic/gin"

	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/pkg/logger"
)

// Logger returns a gin.HandlerFunc that logs basic request information.
// It records method, path, status, latency and client IP.
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// process request
		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()

		logger.Info("http request",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", status,
			"latency", latency.String(),
			"client_ip", c.ClientIP(),
		)
	}
}
