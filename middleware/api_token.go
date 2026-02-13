package middleware

import (
	"x-track/models"
	"x-track/utils"

	"github.com/gin-gonic/gin"
)

// APITokenMiddleware validates API tokens for statistics ingestion
func APITokenMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.GetHeader("X-API-Token")
		if token == "" {
			utils.ErrorResponse(c, 401, "API token required")
			c.Abort()
			return
		}

		// Find account by API token
		var account models.Account
		if err := models.DB.Where("api_token = ?", token).First(&account).Error; err != nil {
			utils.ErrorResponse(c, 401, "Invalid API token")
			c.Abort()
			return
		}

		// Set account information in context
		c.Set("account_id", account.ID)
		c.Set("user_id", account.UserID)

		c.Next()
	}
}
