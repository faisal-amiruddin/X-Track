package models

import (
	"time"

	"gorm.io/gorm"
)

// User represents a user in the system
type User struct {
	ID           uint           `gorm:"primarykey" json:"id"`
	Username     string         `gorm:"uniqueIndex;not null;size:50" json:"username"`
	PasswordHash string         `gorm:"not null" json:"-"`
	Role         string         `gorm:"not null;size:20;default:'user'" json:"role"` // admin or user
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
	Accounts     []Account      `gorm:"foreignKey:UserID" json:"accounts,omitempty"`
}

// TableName specifies the table name for User model
func (User) TableName() string {
	return "users"
}

// IsAdmin checks if the user has admin role
func (u *User) IsAdmin() bool {
	return u.Role == "admin"
}
