package handler

import (
	"x-track/config"
	"x-track/service"
	"x-track/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AuthHandler struct {
	userService *service.UserService
}

func NewAuthHandler(db *gorm.DB) *AuthHandler {
	return &AuthHandler{
		userService: service.NewUserService(db),
	}
}

// LoginRequest represents the login request payload
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse represents the login response
type LoginResponse struct {
	Token string      `json:"token"`
	User  interface{} `json:"user"`
}

// Login handles user authentication
// @Summary User login
// @Description Authenticate user and return JWT token
// @Tags auth
// @Accept json
// @Produce json
// @Param login body LoginRequest true "Login credentials"
// @Success 200 {object} utils.Response{data=LoginResponse}
// @Failure 400 {object} utils.Response
// @Failure 401 {object} utils.Response
// @Router /api/auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid request: "+err.Error())
		return
	}

	// Authenticate user
	user, err := h.userService.AuthenticateUser(req.Username, req.Password)
	if err != nil {
		utils.ErrorResponse(c, 401, err.Error())
		return
	}

	// Generate JWT token
	token, err := utils.GenerateJWT(
		user.ID,
		user.Username,
		user.Role,
		config.AppConfig.JWT.Secret,
		config.AppConfig.JWT.ExpirationHours,
	)
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to generate token")
		return
	}

	response := LoginResponse{
		Token: token,
		User: map[string]interface{}{
			"id":       user.ID,
			"username": user.Username,
			"role":     user.Role,
		},
	}

	utils.SuccessResponse(c, 200, "Login successful", response)
}
