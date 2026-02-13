package repository

import (
	"x-track/models"

	"gorm.io/gorm"
)

type AccountRepository struct {
	db *gorm.DB
}

func NewAccountRepository(db *gorm.DB) *AccountRepository {
	return &AccountRepository{db: db}
}

// Create creates a new account
func (r *AccountRepository) Create(account *models.Account) error {
	return r.db.Create(account).Error
}

// FindByID finds an account by ID
func (r *AccountRepository) FindByID(id uint) (*models.Account, error) {
	var account models.Account
	if err := r.db.Preload("User").First(&account, id).Error; err != nil {
		return nil, err
	}
	return &account, nil
}

// FindByUserID finds all accounts for a user
func (r *AccountRepository) FindByUserID(userID uint) ([]models.Account, error) {
	var accounts []models.Account
	if err := r.db.Where("user_id = ?", userID).Find(&accounts).Error; err != nil {
		return nil, err
	}
	return accounts, nil
}

// FindByToken finds an account by API token
func (r *AccountRepository) FindByToken(token string) (*models.Account, error) {
	var account models.Account
	if err := r.db.Where("api_token = ?", token).First(&account).Error; err != nil {
		return nil, err
	}
	return &account, nil
}

// FindAll retrieves all accounts
func (r *AccountRepository) FindAll() ([]models.Account, error) {
	var accounts []models.Account
	if err := r.db.Preload("User").Find(&accounts).Error; err != nil {
		return nil, err
	}
	return accounts, nil
}

// Update updates an account
func (r *AccountRepository) Update(account *models.Account) error {
	return r.db.Save(account).Error
}

// Delete deletes an account
func (r *AccountRepository) Delete(id uint) error {
	return r.db.Delete(&models.Account{}, id).Error
}

// TokenExists checks if a token already exists
func (r *AccountRepository) TokenExists(token string) (bool, error) {
	var count int64
	err := r.db.Model(&models.Account{}).Where("api_token = ?", token).Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}
