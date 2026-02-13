package service

import (
	"errors"
	"x-track/models"
	"x-track/repository"
	"x-track/utils"

	"gorm.io/gorm"
)

type UserService struct {
	userRepo *repository.UserRepository
}

func NewUserService(db *gorm.DB) *UserService {
	return &UserService{
		userRepo: repository.NewUserRepository(db),
	}
}

// CreateUser creates a new user
func (s *UserService) CreateUser(username, password, role string) (*models.User, error) {
	// Validate role
	if role != "admin" && role != "user" {
		return nil, errors.New("invalid role, must be 'admin' or 'user'")
	}

	// Check if username already exists
	exists, err := s.userRepo.UsernameExists(username)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("username already exists")
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Username:     username,
		PasswordHash: hashedPassword,
		Role:         role,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	return user, nil
}

// GetUserByID retrieves a user by ID
func (s *UserService) GetUserByID(id uint) (*models.User, error) {
	return s.userRepo.FindByID(id)
}

// GetAllUsers retrieves all users
func (s *UserService) GetAllUsers() ([]models.User, error) {
	return s.userRepo.FindAll()
}

// UpdateUser updates a user's information
func (s *UserService) UpdateUser(id uint, username, password, role string) (*models.User, error) {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return nil, err
	}

	if username != "" && username != user.Username {
		exists, err := s.userRepo.UsernameExists(username)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, errors.New("username already exists")
		}
		user.Username = username
	}

	if password != "" {
		hashedPassword, err := utils.HashPassword(password)
		if err != nil {
			return nil, err
		}
		user.PasswordHash = hashedPassword
	}

	if role != "" {
		if role != "admin" && role != "user" {
			return nil, errors.New("invalid role, must be 'admin' or 'user'")
		}
		user.Role = role
	}

	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	return user, nil
}

// DeleteUser deletes a user
func (s *UserService) DeleteUser(id uint) error {
	return s.userRepo.Delete(id)
}

// AuthenticateUser validates user credentials and returns user info
func (s *UserService) AuthenticateUser(username, password string) (*models.User, error) {
	user, err := s.userRepo.FindByUsername(username)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	if err := utils.CheckPassword(user.PasswordHash, password); err != nil {
		return nil, errors.New("invalid credentials")
	}

	return user, nil
}

// EnsureAdminExists creates admin user if none exists
func (s *UserService) EnsureAdminExists(username, password string) error {
	var count int64
	if err := models.DB.Model(&models.User{}).Where("role = ?", "admin").Count(&count).Error; err != nil {
		return err
	}

	if count == 0 {
		_, err := s.CreateUser(username, password, "admin")
		return err
	}

	return nil
}
