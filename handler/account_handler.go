package handler

import (
	"strconv"
	"x-track/service"
	"x-track/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type AccountHandler struct {
	accountService *service.AccountService
}

func NewAccountHandler(db *gorm.DB) *AccountHandler {
	return &AccountHandler{
		accountService: service.NewAccountService(db),
	}
}

// CreateAccountRequest represents the create account request
type CreateAccountRequest struct {
	UserID uint   `json:"user_id" binding:"required"`
	Name   string `json:"name" binding:"required"`
}

// UpdateAccountRequest represents the update account request
type UpdateAccountRequest struct {
	Name string `json:"name" binding:"required"`
}

// CreateAccount creates a new trading account
// @Summary Create a new account
// @Description Create a new trading account for a user
// @Tags accounts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param account body CreateAccountRequest true "Account details"
// @Success 201 {object} utils.Response
// @Failure 400 {object} utils.Response
// @Router /api/accounts [post]
func (h *AccountHandler) CreateAccount(c *gin.Context) {
	var req CreateAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid request: "+err.Error())
		return
	}

	// Check authorization
	role, _ := c.Get("role")
	currentUserID, _ := c.Get("user_id")

	// Only admin can create accounts for other users
	if role != "admin" && req.UserID != currentUserID.(uint) {
		utils.ErrorResponse(c, 403, "You can only create accounts for yourself")
		return
	}

	account, err := h.accountService.CreateAccount(req.UserID, req.Name)
	if err != nil {
		utils.ErrorResponse(c, 400, err.Error())
		return
	}

	utils.SuccessResponse(c, 201, "Account created successfully", account)
}

// GetAllAccounts retrieves all accounts (admin only)
// @Summary Get all accounts
// @Description Retrieve all trading accounts (admin only)
// @Tags accounts
// @Produce json
// @Security BearerAuth
// @Success 200 {object} utils.Response
// @Failure 500 {object} utils.Response
// @Router /api/accounts [get]
func (h *AccountHandler) GetAllAccounts(c *gin.Context) {
	accounts, err := h.accountService.GetAllAccounts()
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to retrieve accounts")
		return
	}

	utils.SuccessResponse(c, 200, "Accounts retrieved successfully", accounts)
}

// GetMyAccounts retrieves current user's accounts
// @Summary Get my accounts
// @Description Retrieve current user's trading accounts
// @Tags accounts
// @Produce json
// @Security BearerAuth
// @Success 200 {object} utils.Response
// @Failure 500 {object} utils.Response
// @Router /api/accounts/me [get]
func (h *AccountHandler) GetMyAccounts(c *gin.Context) {
	userID, _ := c.Get("user_id")

	accounts, err := h.accountService.GetAccountsByUserID(userID.(uint))
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to retrieve accounts")
		return
	}

	utils.SuccessResponse(c, 200, "Accounts retrieved successfully", accounts)
}

// GetAccount retrieves an account by ID
// @Summary Get account by ID
// @Description Retrieve account details by ID
// @Tags accounts
// @Produce json
// @Security BearerAuth
// @Param id path int true "Account ID"
// @Success 200 {object} utils.Response
// @Failure 404 {object} utils.Response
// @Router /api/accounts/{id} [get]
func (h *AccountHandler) GetAccount(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid account ID")
		return
	}

	account, err := h.accountService.GetAccountByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, 404, "Account not found")
		return
	}

	// Check authorization
	role, _ := c.Get("role")
	userID, _ := c.Get("user_id")

	if role != "admin" && account.UserID != userID.(uint) {
		utils.ErrorResponse(c, 403, "Access denied")
		return
	}

	utils.SuccessResponse(c, 200, "Account retrieved successfully", account)
}

// UpdateAccount updates an account
// @Summary Update account
// @Description Update account details
// @Tags accounts
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path int true "Account ID"
// @Param account body UpdateAccountRequest true "Account details"
// @Success 200 {object} utils.Response
// @Failure 400 {object} utils.Response
// @Router /api/accounts/{id} [put]
func (h *AccountHandler) UpdateAccount(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid account ID")
		return
	}

	// Check authorization
	account, err := h.accountService.GetAccountByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, 404, "Account not found")
		return
	}

	role, _ := c.Get("role")
	userID, _ := c.Get("user_id")

	if role != "admin" && account.UserID != userID.(uint) {
		utils.ErrorResponse(c, 403, "Access denied")
		return
	}

	var req UpdateAccountRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid request: "+err.Error())
		return
	}

	account, err = h.accountService.UpdateAccount(uint(id), req.Name)
	if err != nil {
		utils.ErrorResponse(c, 400, err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Account updated successfully", account)
}

// RegenerateToken regenerates API token for an account
// @Summary Regenerate API token
// @Description Generate a new API token for an account
// @Tags accounts
// @Produce json
// @Security BearerAuth
// @Param id path int true "Account ID"
// @Success 200 {object} utils.Response
// @Failure 400 {object} utils.Response
// @Router /api/accounts/{id}/regenerate-token [post]
func (h *AccountHandler) RegenerateToken(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid account ID")
		return
	}

	// Check authorization
	account, err := h.accountService.GetAccountByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, 404, "Account not found")
		return
	}

	role, _ := c.Get("role")
	userID, _ := c.Get("user_id")

	if role != "admin" && account.UserID != userID.(uint) {
		utils.ErrorResponse(c, 403, "Access denied")
		return
	}

	account, err = h.accountService.RegenerateToken(uint(id))
	if err != nil {
		utils.ErrorResponse(c, 400, "Failed to regenerate token")
		return
	}

	utils.SuccessResponse(c, 200, "Token regenerated successfully", account)
}

// DeleteAccount deletes an account
// @Summary Delete account
// @Description Delete a trading account
// @Tags accounts
// @Produce json
// @Security BearerAuth
// @Param id path int true "Account ID"
// @Success 200 {object} utils.Response
// @Failure 400 {object} utils.Response
// @Router /api/accounts/{id} [delete]
func (h *AccountHandler) DeleteAccount(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid account ID")
		return
	}

	// Check authorization
	account, err := h.accountService.GetAccountByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, 404, "Account not found")
		return
	}

	role, _ := c.Get("role")
	userID, _ := c.Get("user_id")

	if role != "admin" && account.UserID != userID.(uint) {
		utils.ErrorResponse(c, 403, "Access denied")
		return
	}

	if err := h.accountService.DeleteAccount(uint(id)); err != nil {
		utils.ErrorResponse(c, 400, "Failed to delete account")
		return
	}

	utils.SuccessResponse(c, 200, "Account deleted successfully", nil)
}
