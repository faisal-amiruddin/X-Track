package routes

import (
	"x-track/handler"
	"x-track/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SetupRoutes configures all application routes
func SetupRoutes(r *gin.Engine, db *gorm.DB) {
	// Initialize handlers
	authHandler := handler.NewAuthHandler(db)
	userHandler := handler.NewUserHandler(db)
	accountHandler := handler.NewAccountHandler(db)
	statisticHandler := handler.NewStatisticHandler(db)

	// API group
	api := r.Group("/api")
	{
		// Public routes
		auth := api.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
		}

		// Statistics ingestion endpoint (protected by API token)
		ingest := api.Group("/ingest")
		ingest.Use(middleware.APITokenMiddleware())
		{
			ingest.POST("/statistics", statisticHandler.IngestStatistic)
		}

		// Protected routes (JWT required)
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			// User routes (admin only for create, update, delete)
			users := protected.Group("/users")
			{
				users.GET("/:id", userHandler.GetUser)
				
				// Admin only routes
				adminUsers := users.Group("")
				adminUsers.Use(middleware.RequireAdmin())
				{
					adminUsers.POST("", userHandler.CreateUser)
					adminUsers.GET("", userHandler.GetAllUsers)
					adminUsers.PUT("/:id", userHandler.UpdateUser)
					adminUsers.DELETE("/:id", userHandler.DeleteUser)
				}
			}

			// Account routes
			accounts := protected.Group("/accounts")
			{
				accounts.POST("", accountHandler.CreateAccount)
				accounts.GET("/me", accountHandler.GetMyAccounts)
				accounts.GET("/:id", accountHandler.GetAccount)
				accounts.PUT("/:id", accountHandler.UpdateAccount)
				accounts.DELETE("/:id", accountHandler.DeleteAccount)
				accounts.POST("/:id/regenerate-token", accountHandler.RegenerateToken)
				
				// Admin only - get all accounts
				adminAccounts := accounts.Group("")
				adminAccounts.Use(middleware.RequireAdmin())
				{
					adminAccounts.GET("", accountHandler.GetAllAccounts)
				}
			}

			// Statistics routes (query endpoints)
			statistics := protected.Group("/statistics")
			{
				statistics.GET("/:account_id", statisticHandler.GetStatistics)
				statistics.GET("/:account_id/range", statisticHandler.GetStatisticsByDateRange)
				statistics.GET("/:account_id/today", statisticHandler.GetTodaySummary)
				statistics.GET("/:account_id/summary", statisticHandler.GetOverallSummary)
			}
		}
	}

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "healthy",
			"message": "X-Track API is running",
		})
	})
}
