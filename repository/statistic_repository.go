package repository

import (
	"time"
	"x-track/models"

	"gorm.io/gorm"
)

type StatisticRepository struct {
	db *gorm.DB
}

func NewStatisticRepository(db *gorm.DB) *StatisticRepository {
	return &StatisticRepository{db: db}
}

// Create creates a new statistic
func (r *StatisticRepository) Create(statistic *models.Statistic) error {
	return r.db.Create(statistic).Error
}

// FindByID finds a statistic by ID
func (r *StatisticRepository) FindByID(id uint) (*models.Statistic, error) {
	var statistic models.Statistic
	if err := r.db.First(&statistic, id).Error; err != nil {
		return nil, err
	}
	return &statistic, nil
}

// FindByAccountID finds statistics for an account with pagination
func (r *StatisticRepository) FindByAccountID(accountID uint, page, pageSize int) ([]models.Statistic, int64, error) {
	var statistics []models.Statistic
	var total int64

	offset := (page - 1) * pageSize

	if err := r.db.Model(&models.Statistic{}).Where("account_id = ?", accountID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := r.db.Where("account_id = ?", accountID).
		Order("timestamp DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&statistics).Error; err != nil {
		return nil, 0, err
	}

	return statistics, total, nil
}

// FindByDateRange finds statistics within a date range
func (r *StatisticRepository) FindByDateRange(accountID uint, startDate, endDate time.Time, page, pageSize int) ([]models.Statistic, int64, error) {
	var statistics []models.Statistic
	var total int64

	offset := (page - 1) * pageSize

	query := r.db.Model(&models.Statistic{}).
		Where("account_id = ? AND timestamp >= ? AND timestamp <= ?", accountID, startDate, endDate)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if err := query.Order("timestamp DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&statistics).Error; err != nil {
		return nil, 0, err
	}

	return statistics, total, nil
}

// FindTodayStats finds today's statistics for an account
func (r *StatisticRepository) FindTodayStats(accountID uint) ([]models.Statistic, error) {
	var statistics []models.Statistic
	
	now := time.Now()
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	endOfDay := startOfDay.Add(24 * time.Hour)

	if err := r.db.Where("account_id = ? AND timestamp >= ? AND timestamp < ?", accountID, startOfDay, endOfDay).
		Order("timestamp DESC").
		Find(&statistics).Error; err != nil {
		return nil, err
	}

	return statistics, nil
}

// GetLatestStatistic gets the most recent statistic for an account
func (r *StatisticRepository) GetLatestStatistic(accountID uint) (*models.Statistic, error) {
	var statistic models.Statistic
	if err := r.db.Where("account_id = ?", accountID).
		Order("timestamp DESC").
		First(&statistic).Error; err != nil {
		return nil, err
	}
	return &statistic, nil
}

// Delete deletes a statistic
func (r *StatisticRepository) Delete(id uint) error {
	return r.db.Delete(&models.Statistic{}, id).Error
}
