package main

import (
	"log"
	"x-track/config"
	"x-track/middleware"
	"x-track/models"
	"x-track/routes"
	//"x-track/service"

	"github.com/gin-gonic/gin"
)

// @title X-Track API
// @version 1.0
// @description REST API for X-Track trading statistics tracking system
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.email support@x-track.com

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8080
// @BasePath /

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

// @securityDefinitions.apikey ApiKeyAuth
// @in header
// @name X-API-Token
// @description API token for statistics ingestion

func main() {
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	// Set Gin mode
	gin.SetMode(cfg.Server.GinMode)

	// Initialize database
	db, err := models.InitDB(cfg.Database.GetDSN())
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Run migrations
	/*
	if err := models.AutoMigrate(db); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}
	*/

	// Ensure admin user exists
	/*
	userService := service.NewUserService(db)
	if err := userService.EnsureAdminExists(cfg.Admin.Username, cfg.Admin.Password); err != nil {
		log.Printf("Warning: Failed to create admin user: %v", err)
	} else {
		log.Printf("Admin user ensured (username: %s)", cfg.Admin.Username)
	}
	*/

	// Initialize Gin router
	router := gin.Default()

	// Apply middleware
	router.Use(middleware.CORSMiddleware())

	// Setup routes
	routes.SetupRoutes(router, db)

	// Start server
	serverAddr := ":" + cfg.Server.Port
	log.Printf("Starting X-Track API server on %s", serverAddr)
	log.Printf("Environment: %s", cfg.Server.GinMode)
	
	if err := router.Run(serverAddr); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
