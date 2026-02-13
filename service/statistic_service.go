package service

import (
	"errors"
	"math"
	"time"
	"x-track/models"
	"x-track/repository"
	"x-track/utils"

	"gorm.io/gorm"
)

type StatisticService struct {
	statisticRepo *repository.StatisticRepository
	accountRepo   *repository.AccountRepository
}

func NewStatisticService(db *gorm.DB) *StatisticService {
	return &StatisticService{
		statisticRepo: repository.NewStatisticRepository(db),
		accountRepo:   repository.NewAccountRepository(db),
	}
}

// CreateStatistic creates a new statistic entry
func (s *StatisticService) CreateStatistic(accountID uint, timestamp time.Time, dailyPL float64, tradesToday int, totalBalance float64) (*models.Statistic, error) {
	// Verify account exists
	if _, err := s.accountRepo.FindByID(accountID); err != nil {
		return nil, errors.New("account not found")
	}

	statistic := &models.Statistic{
		AccountID:    accountID,
		Timestamp:    timestamp,
		DailyPL:      dailyPL,
		TradesToday:  tradesToday,
		TotalBalance: totalBalance,
	}

	if err := s.statisticRepo.Create(statistic); err != nil {
		return nil, err
	}

	return statistic, nil
}

// GetStatisticsByDateRange retrieves statistics within a date range
func (s *StatisticService) GetStatisticsByDateRange(accountID uint, startDate, endDate time.Time, page, pageSize int) ([]models.Statistic, *utils.PaginationMeta, error) {
	statistics, total, err := s.statisticRepo.FindByDateRange(accountID, startDate, endDate, page, pageSize)
	if err != nil {
		return nil, nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	pagination := &utils.PaginationMeta{
		Page:       page,
		PageSize:   pageSize,
		TotalItems: total,
		TotalPages: totalPages,
	}

	return statistics, pagination, nil
}

// GetTodaySummary retrieves today's statistics summary
func (s *StatisticService) GetTodaySummary(accountID uint) (map[string]interface{}, error) {
	statistics, err := s.statisticRepo.FindTodayStats(accountID)
	if err != nil {
		return nil, err
	}

	if len(statistics) == 0 {
		return map[string]interface{}{
			"total_records":   0,
			"latest_balance":  0.0,
			"daily_pl":        0.0,
			"trades_today":    0,
			"latest_update":   nil,
		}, nil
	}

	latest := statistics[0]
	
	return map[string]interface{}{
		"total_records":   len(statistics),
		"latest_balance":  latest.TotalBalance,
		"daily_pl":        latest.DailyPL,
		"trades_today":    latest.TradesToday,
		"latest_update":   latest.Timestamp,
		"statistics":      statistics,
	}, nil
}

// GetOverallSummary retrieves overall statistics summary
func (s *StatisticService) GetOverallSummary(accountID uint) (map[string]interface{}, error) {
	latest, err := s.statisticRepo.GetLatestStatistic(accountID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return map[string]interface{}{
				"has_data":        false,
				"current_balance": 0.0,
				"latest_update":   nil,
			}, nil
		}
		return nil, err
	}

	return map[string]interface{}{
		"has_data":        true,
		"current_balance": latest.TotalBalance,
		"latest_pl":       latest.DailyPL,
		"latest_trades":   latest.TradesToday,
		"latest_update":   latest.Timestamp,
	}, nil
}

// GetStatisticsByAccountID retrieves all statistics for an account with pagination
func (s *StatisticService) GetStatisticsByAccountID(accountID uint, page, pageSize int) ([]models.Statistic, *utils.PaginationMeta, error) {
	statistics, total, err := s.statisticRepo.FindByAccountID(accountID, page, pageSize)
	if err != nil {
		return nil, nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))

	pagination := &utils.PaginationMeta{
		Page:       page,
		PageSize:   pageSize,
		TotalItems: total,
		TotalPages: totalPages,
	}

	return statistics, pagination, nil
}
