package service

import (
	"errors"
	"x-track/models"
	"x-track/repository"
	"x-track/utils"

	"gorm.io/gorm"
)

type AccountService struct {
	accountRepo *repository.AccountRepository
	userRepo    *repository.UserRepository
}

func NewAccountService(db *gorm.DB) *AccountService {
	return &AccountService{
		accountRepo: repository.NewAccountRepository(db),
		userRepo:    repository.NewUserRepository(db),
	}
}

// CreateAccount creates a new account for a user
func (s *AccountService) CreateAccount(userID uint, name string) (*models.Account, error) {
	// Verify user exists
	if _, err := s.userRepo.FindByID(userID); err != nil {
		return nil, errors.New("user not found")
	}

	// Generate unique API token
	token, err := s.generateUniqueToken()
	if err != nil {
		return nil, err
	}

	account := &models.Account{
		UserID:   userID,
		Name:     name,
		APIToken: token,
	}

	if err := s.accountRepo.Create(account); err != nil {
		return nil, err
	}

	return account, nil
}

// GetAccountByID retrieves an account by ID
func (s *AccountService) GetAccountByID(id uint) (*models.Account, error) {
	return s.accountRepo.FindByID(id)
}

// GetAccountsByUserID retrieves all accounts for a user
func (s *AccountService) GetAccountsByUserID(userID uint) ([]models.Account, error) {
	return s.accountRepo.FindByUserID(userID)
}

// GetAllAccounts retrieves all accounts
func (s *AccountService) GetAllAccounts() ([]models.Account, error) {
	return s.accountRepo.FindAll()
}

// UpdateAccount updates an account
func (s *AccountService) UpdateAccount(id uint, name string) (*models.Account, error) {
	account, err := s.accountRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if name != "" {
		account.Name = name
	}

	if err := s.accountRepo.Update(account); err != nil {
		return nil, err
	}

	return account, nil
}

// RegenerateToken generates a new API token for an account
func (s *AccountService) RegenerateToken(id uint) (*models.Account, error) {
	account, err := s.accountRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	// Generate new unique token
	token, err := s.generateUniqueToken()
	if err != nil {
		return nil, err
	}

	account.APIToken = token

	if err := s.accountRepo.Update(account); err != nil {
		return nil, err
	}

	return account, nil
}

// DeleteAccount deletes an account
func (s *AccountService) DeleteAccount(id uint) error {
	return s.accountRepo.Delete(id)
}

// generateUniqueToken generates a unique API token
func (s *AccountService) generateUniqueToken() (string, error) {
	maxAttempts := 5
	for i := 0; i < maxAttempts; i++ {
		token, err := utils.GenerateSecureToken(32)
		if err != nil {
			return "", err
		}

		exists, err := s.accountRepo.TokenExists(token)
		if err != nil {
			return "", err
		}

		if !exists {
			return token, nil
		}
	}

	return "", errors.New("failed to generate unique token")
}
