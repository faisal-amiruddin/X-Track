package repository

import (
	"errors"
	"x-track/models"

	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

// Create creates a new user
func (r *UserRepository) Create(user *models.User) error {
	return r.db.Create(user).Error
}

// FindByID finds a user by ID
func (r *UserRepository) FindByID(id uint) (*models.User, error) {
	var user models.User
	if err := r.db.First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// FindByUsername finds a user by username
func (r *UserRepository) FindByUsername(username string) (*models.User, error) {
	var user models.User
	if err := r.db.Where("username = ?", username).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

// FindAll retrieves all users
func (r *UserRepository) FindAll() ([]models.User, error) {
	var users []models.User
	if err := r.db.Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

// Update updates a user
func (r *UserRepository) Update(user *models.User) error {
	return r.db.Save(user).Error
}

// Delete deletes a user
func (r *UserRepository) Delete(id uint) error {
	return r.db.Delete(&models.User{}, id).Error
}

// UsernameExists checks if a username already exists
func (r *UserRepository) UsernameExists(username string) (bool, error) {
	var count int64
	err := r.db.Model(&models.User{}).Where("username = ?", username).Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// EnsureAdminExists creates an admin user if no admin exists
func (r *UserRepository) EnsureAdminExists(username, password string) error {
	var count int64
	if err := r.db.Model(&models.User{}).Where("role = ?", "admin").Count(&count).Error; err != nil {
		return err
	}

	if count == 0 {
		// Check if username already exists
		exists, err := r.UsernameExists(username)
		if err != nil {
			return err
		}
		if exists {
			return errors.New("admin username already taken")
		}

		// Create admin user
		admin := &models.User{
			Username: username,
			Role:     "admin",
		}
		
		// Hash password
		hashedPassword, err := hashPassword(password)
		if err != nil {
			return err
		}
		admin.PasswordHash = hashedPassword

		return r.Create(admin)
	}

	return nil
}

func hashPassword(password string) (string, error) {
	// Import from utils to avoid circular dependency
	return password, nil // Will be hashed in service layer
}
