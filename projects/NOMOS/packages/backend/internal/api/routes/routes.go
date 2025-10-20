package routes

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/api/handlers"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/api/middleware"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/config"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/repository/db"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/service/score"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/service/reputation"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/internal/service/sync"
	"github.com/KamisAyaka/crowdsourcing_graphql/packages/backend/pkg/subgraph"
)

func SetupRoutes(
	database *db.Database,
	subgraphClient *subgraph.Client,
	cfg *config.Config,
) *gin.Engine {
	router := gin.New()

	// 中间件
	router.Use(gin.Recovery())
	router.Use(middleware.Logger())
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "https://yourdomain.com"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// 初始化服务 (去掉 Redis)
	reputationService := reputation.NewService(
		database,
		reputation.NewCalculator(subgraphClient),
	)

	// 初始化同步服务
	syncScheduler := sync.NewSyncScheduler(database, subgraphClient, cfg)

	// 初始化处理器
	reputationHandler := handlers.NewReputationHandler(reputationService)
	syncHandler := handlers.NewSyncHandler(syncScheduler)
	guildScoreService := score.NewEnhancedGuildScoreService(database.DB)
	guildHandler := handlers.NewGuildHandler(guildScoreService)

	// 健康检查
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API v1 路由组
	v1 := router.Group("/api/v1")
	{
		// 声誉评分相关路由
		reputation := v1.Group("/reputation")
		{
			reputation.GET("/score/:address", reputationHandler.GetUserScore)
			reputation.GET("/leaderboard", reputationHandler.GetLeaderboard)
			reputation.GET("/history/:address", reputationHandler.GetScoreHistory)
			reputation.POST("/calculate/:address", reputationHandler.CalculateScore)
			reputation.GET("/suggestions/:address", reputationHandler.GetImprovementSuggestions)
			reputation.GET("/tier/:address", reputationHandler.GetUserTier) // 新增：获取用户等级
		}

		// Guild Score（增强版）相关路由
		guild := v1.Group("/guild")
		{
			guild.GET("/score/:address", guildHandler.GetUserGuildScore)
			guild.GET("/leaderboard", guildHandler.GetGuildLeaderboard)
			guild.GET("/history/:address", guildHandler.GetGuildScoreHistory)
		}

		// 用户相关路由
		users := v1.Group("/users")
		{
			users.GET("/:address", reputationHandler.GetUserProfile)
			users.GET("/:address/stats", reputationHandler.GetUserStats)
		}

		// 数据同步相关路由
		sync := v1.Group("/sync")
		{
			sync.POST("/users", syncHandler.SyncAllUsers)
			sync.POST("/users/:address", syncHandler.SyncUser)
			sync.POST("/users/batch", syncHandler.SyncUsersBatch)
			sync.POST("/users/page", syncHandler.SyncUsersByPage)
			sync.GET("/status", syncHandler.GetSyncStatus)
		}
	}

	admin := v1.Group("/admin")
	{
		admin.POST("/trigger-weekly-update", reputationHandler.TriggerWeeklyUpdate)
		admin.POST("/trigger-monthly-update", reputationHandler.TriggerMonthlyUpdate)
	}

	return router
}
