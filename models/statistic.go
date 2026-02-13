package models

import (
	"time"

	"gorm.io/gorm"
)

// Statistic represents trading statistics
type Statistic struct {
	ID            uint           `gorm:"primarykey" json:"id"`
	AccountID     uint           `gorm:"not null;index:idx_account_timestamp" json:"account_id"`
	Timestamp     time.Time      `gorm:"not null;index:idx_account_timestamp;index:idx_timestamp" json:"timestamp"`
	DailyPL       float64        `gorm:"not null;column:daily_pl" json:"daily_pl"`
	TradesToday   int            `gorm:"not null" json:"trades_today"`
	TotalBalance  float64        `gorm:"not null" json:"total_balance"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
	Account       Account        `gorm:"foreignKey:AccountID" json:"account,omitempty"`
}

// TableName specifies the table name for Statistic model
func (Statistic) TableName() string {
	return "statistics"
}
