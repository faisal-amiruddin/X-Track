package handler

import (
	"net/http"
	"os"
	"sync"

	"x-track/config"
	"x-track/middleware"
	"x-track/models"
	"x-track/routes"
	"x-track/service"

	"github.com/gin-gonic/gin"
)

var (
	router *gin.Engine
	once   sync.Once
)

// Handler is the main entry point for Vercel serverless function
func Handler(w http.ResponseWriter, r *http.Request) {
	once.Do(func() {
		initializeApp()
	})
	router.ServeHTTP(w, r)
}

func initializeApp() {
	// Load configuration from environment variables
	cfg, err := config.LoadConfig()
	if err != nil {
		panic("Failed to load configuration: " + err.Error())
	}

	// Set Gin mode
	gin.SetMode(cfg.Server.GinMode)

	// Initialize database
	db, err := models.InitDB(cfg.Database.GetDSN())
	if err != nil {
		panic("Failed to connect to database: " + err.Error())
	}

	// Initialize Gin router
	router = gin.New()
	router.Use(gin.Recovery())

	// Apply CORS middleware
	router.Use(middleware.CORSMiddleware())

	// Setup routes
	routes.SetupRoutes(router, db)
}

// For local testing
func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	initializeApp()
	router.Run(":" + port)
}
