package handler

import (
	"strconv"
	"x-track/service"
	"x-track/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type UserHandler struct {
	userService *service.UserService
}

func NewUserHandler(db *gorm.DB) *UserHandler {
	return &UserHandler{
		userService: service.NewUserService(db),
	}
}

// CreateUserRequest represents the create user request
type CreateUserRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
	Role     string `json:"role" binding:"required,oneof=admin user"`
}

// UpdateUserRequest represents the update user request
type UpdateUserRequest struct {
	Username string `json:"username"`
	Password string `json:"password,omitempty" binding:"omitempty,min=6"`
	Role     string `json:"role,omitempty" binding:"omitempty,oneof=admin user"`
}

// CreateUser creates a new user (admin only)
// @Summary Create a new user
// @Description Admin creates a new user account
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param user body CreateUserRequest true "User details"
// @Success 201 {object} utils.Response
// @Failure 400 {object} utils.Response
// @Failure 403 {object} utils.Response
// @Router /api/users [post]
func (h *UserHandler) CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid request: "+err.Error())
		return
	}

	user, err := h.userService.CreateUser(req.Username, req.Password, req.Role)
	if err != nil {
		utils.ErrorResponse(c, 400, err.Error())
		return
	}

	utils.SuccessResponse(c, 201, "User created successfully", user)
}

// GetAllUsers retrieves all users (admin only)
// @Summary Get all users
// @Description Retrieve all user accounts
// @Tags users
// @Produce json
// @Security BearerAuth
// @Success 200 {object} utils.Response
// @Failure 500 {object} utils.Response
// @Router /api/users [get]
func (h *UserHandler) GetAllUsers(c *gin.Context) {
	users, err := h.userService.GetAllUsers()
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to retrieve users")
		return
	}

	utils.SuccessResponse(c, 200, "Users retrieved successfully", users)
}

// GetUser retrieves a user by ID
// @Summary Get user by ID
// @Description Retrieve user details by ID
// @Tags users
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Success 200 {object} utils.Response
// @Failure 404 {object} utils.Response
// @Router /api/users/{id} [get]
func (h *UserHandler) GetUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid user ID")
		return
	}

	user, err := h.userService.GetUserByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, 404, "User not found")
		return
	}

	utils.SuccessResponse(c, 200, "User retrieved successfully", user)
}

// UpdateUser updates a user (admin only)
// @Summary Update user
// @Description Update user details
// @Tags users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Param user body UpdateUserRequest true "User details"
// @Success 200 {object} utils.Response
// @Failure 400 {object} utils.Response
// @Router /api/users/{id} [put]
func (h *UserHandler) UpdateUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid user ID")
		return
	}

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid request: "+err.Error())
		return
	}

	user, err := h.userService.UpdateUser(uint(id), req.Username, req.Password, req.Role)
	if err != nil {
		utils.ErrorResponse(c, 400, err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "User updated successfully", user)
}

// DeleteUser deletes a user (admin only)
// @Summary Delete user
// @Description Delete a user account
// @Tags users
// @Produce json
// @Security BearerAuth
// @Param id path int true "User ID"
// @Success 200 {object} utils.Response
// @Failure 400 {object} utils.Response
// @Router /api/users/{id} [delete]
func (h *UserHandler) DeleteUser(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid user ID")
		return
	}

	if err := h.userService.DeleteUser(uint(id)); err != nil {
		utils.ErrorResponse(c, 400, "Failed to delete user")
		return
	}

	utils.SuccessResponse(c, 200, "User deleted successfully", nil)
}
