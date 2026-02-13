package handler

import (
	"strconv"
	"time"
	"x-track/service"
	"x-track/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type StatisticHandler struct {
	statisticService *service.StatisticService
	accountService   *service.AccountService
}

func NewStatisticHandler(db *gorm.DB) *StatisticHandler {
	return &StatisticHandler{
		statisticService: service.NewStatisticService(db),
		accountService:   service.NewAccountService(db),
	}
}

// IngestStatisticRequest represents the statistic ingestion request
type IngestStatisticRequest struct {
	Timestamp    string   `json:"timestamp" binding:"required"`
	DailyPL      *float64 `json:"daily_profit_loss" binding:"required"`
	TradesToday  *int     `json:"total_trades_today" binding:"required,min=0"`
	TotalBalance *float64 `json:"total_balance" binding:"required,min=0"`
}

// IngestStatistic ingests a new statistic (protected by API token)
// @Summary Ingest statistic
// @Description Post new trading statistics (for automated clients)
// @Tags statistics
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param statistic body IngestStatisticRequest true "Statistic data"
// @Success 201 {object} utils.Response
// @Failure 400 {object} utils.Response
// @Router /api/ingest/statistics [post]
func (h *StatisticHandler) IngestStatistic(c *gin.Context) {
	var req IngestStatisticRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid request: "+err.Error())
		return
	}

	// Get account ID from context (set by API token middleware)
	accountID, exists := c.Get("account_id")
	if !exists {
		utils.ErrorResponse(c, 401, "Unauthorized")
		return
	}

	// Parse timestamp
	timestamp, err := time.Parse(time.RFC3339, req.Timestamp)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid timestamp format, use RFC3339 (e.g., 2024-01-15T10:30:00Z)")
		return
	}

	// Create statistic
	statistic, err := h.statisticService.CreateStatistic(
		accountID.(uint),
		timestamp,
		*req.DailyPL,
		*req.TradesToday,
		*req.TotalBalance,
	)
	if err != nil {
		utils.ErrorResponse(c, 400, err.Error())
		return
	}

	utils.SuccessResponse(c, 201, "Statistic ingested successfully", statistic)
}

// GetStatisticsByDateRange retrieves statistics by date range
// @Summary Get statistics by date range
// @Description Retrieve statistics within a date range
// @Tags statistics
// @Produce json
// @Security BearerAuth
// @Param account_id path int true "Account ID"
// @Param start_date query string true "Start date (YYYY-MM-DD)"
// @Param end_date query string true "End date (YYYY-MM-DD)"
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(20)
// @Success 200 {object} utils.PaginatedResponse
// @Failure 400 {object} utils.Response
// @Router /api/statistics/{account_id}/range [get]
func (h *StatisticHandler) GetStatisticsByDateRange(c *gin.Context) {
	accountID, err := strconv.ParseUint(c.Param("account_id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid account ID")
		return
	}

	// Check authorization
	if err := h.checkAccountAccess(c, uint(accountID)); err != nil {
		utils.ErrorResponse(c, 403, err.Error())
		return
	}

	// Parse dates
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	if startDateStr == "" || endDateStr == "" {
		utils.ErrorResponse(c, 400, "start_date and end_date are required")
		return
	}

	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid start_date format, use YYYY-MM-DD")
		return
	}

	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid end_date format, use YYYY-MM-DD")
		return
	}

	// Set end date to end of day
	endDate = endDate.Add(24*time.Hour - time.Second)

	// Parse pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	statistics, pagination, err := h.statisticService.GetStatisticsByDateRange(
		uint(accountID),
		startDate,
		endDate,
		page,
		pageSize,
	)
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to retrieve statistics")
		return
	}

	utils.PaginatedSuccessResponse(c, 200, "Statistics retrieved successfully", statistics, *pagination)
}

// GetTodaySummary retrieves today's summary
// @Summary Get today's summary
// @Description Retrieve today's statistics summary
// @Tags statistics
// @Produce json
// @Security BearerAuth
// @Param account_id path int true "Account ID"
// @Success 200 {object} utils.Response
// @Failure 400 {object} utils.Response
// @Router /api/statistics/{account_id}/today [get]
func (h *StatisticHandler) GetTodaySummary(c *gin.Context) {
	accountID, err := strconv.ParseUint(c.Param("account_id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid account ID")
		return
	}

	// Check authorization
	if err := h.checkAccountAccess(c, uint(accountID)); err != nil {
		utils.ErrorResponse(c, 403, err.Error())
		return
	}

	summary, err := h.statisticService.GetTodaySummary(uint(accountID))
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to retrieve today's summary")
		return
	}

	utils.SuccessResponse(c, 200, "Today's summary retrieved successfully", summary)
}

// GetOverallSummary retrieves overall summary
// @Summary Get overall summary
// @Description Retrieve overall statistics summary
// @Tags statistics
// @Produce json
// @Security BearerAuth
// @Param account_id path int true "Account ID"
// @Success 200 {object} utils.Response
// @Failure 400 {object} utils.Response
// @Router /api/statistics/{account_id}/summary [get]
func (h *StatisticHandler) GetOverallSummary(c *gin.Context) {
	accountID, err := strconv.ParseUint(c.Param("account_id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid account ID")
		return
	}

	// Check authorization
	if err := h.checkAccountAccess(c, uint(accountID)); err != nil {
		utils.ErrorResponse(c, 403, err.Error())
		return
	}

	summary, err := h.statisticService.GetOverallSummary(uint(accountID))
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to retrieve overall summary")
		return
	}

	utils.SuccessResponse(c, 200, "Overall summary retrieved successfully", summary)
}

// GetStatistics retrieves all statistics with pagination
// @Summary Get all statistics
// @Description Retrieve all statistics for an account
// @Tags statistics
// @Produce json
// @Security BearerAuth
// @Param account_id path int true "Account ID"
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(20)
// @Success 200 {object} utils.PaginatedResponse
// @Failure 400 {object} utils.Response
// @Router /api/statistics/{account_id} [get]
func (h *StatisticHandler) GetStatistics(c *gin.Context) {
	accountID, err := strconv.ParseUint(c.Param("account_id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid account ID")
		return
	}

	// Check authorization
	if err := h.checkAccountAccess(c, uint(accountID)); err != nil {
		utils.ErrorResponse(c, 403, err.Error())
		return
	}

	// Parse pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	statistics, pagination, err := h.statisticService.GetStatisticsByAccountID(
		uint(accountID),
		page,
		pageSize,
	)
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to retrieve statistics")
		return
	}

	utils.PaginatedSuccessResponse(c, 200, "Statistics retrieved successfully", statistics, *pagination)
}

// checkAccountAccess verifies if the user has access to the account
func (h *StatisticHandler) checkAccountAccess(c *gin.Context, accountID uint) error {
	role, _ := c.Get("role")
	userID, _ := c.Get("user_id")

	// Admin can access all accounts
	if role == "admin" {
		return nil
	}

	// Regular user can only access their own accounts
	account, err := h.accountService.GetAccountByID(accountID)
	if err != nil {
		return err
	}

	if account.UserID != userID.(uint) {
		return gorm.ErrRecordNotFound
	}

	return nil
}
