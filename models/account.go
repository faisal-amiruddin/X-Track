package models

import (
	"time"

	"gorm.io/gorm"
)

// Account represents a trading account
type Account struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	UserID     uint           `gorm:"not null;index" json:"user_id"`
	Name       string         `gorm:"not null;size:100" json:"name"`
	APIToken   string         `gorm:"uniqueIndex;not null;size:64" json:"api_token"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
	User       User           `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Statistics []Statistic    `gorm:"foreignKey:AccountID" json:"statistics,omitempty"`
}

// TableName specifies the table name for Account model
func (Account) TableName() string {
	return "accounts"
}
