package controllers

import (
	"time"

	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateDealer handles creating a new dealer
func CreateDealer(c *gin.Context) {
	var dealer models.Dealer
	if err := c.ShouldBindJSON(&dealer); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input", err.Error())
		return
	}

	companyID, _ := c.Get("companyID")
	dealer.CompanyID = companyID.(uuid.UUID)

	// Check if email already exists in users table
	var existingUser models.User
	if err := config.DB.Where("email = ?", dealer.Email).First(&existingUser).Error; err == nil {
		utils.ErrorResponse(c, 400, "Email already exists", "A user with this email already exists in the system")
		return
	}

	// Hash the password
	hashedPassword, err := utils.HashPassword(dealer.Password)
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to hash password", err.Error())
		return
	}
	dealer.Password = hashedPassword

	// Create dealer and user in a transaction
	err = config.DB.Transaction(func(tx *gorm.DB) error {
		// Create the dealer
		if err := tx.Create(&dealer).Error; err != nil {
			return err
		}

		// Create user account for the dealer
		user := models.User{
			Name:      dealer.Name,
			Email:     dealer.Email,
			Password:  hashedPassword,
			Status:    "active",
			Role:      "dealer",
			CreatedBy: nil, // Will be set by the current user if needed
		}

		if err := tx.Create(&user).Error; err != nil {
			return err
		}

		// Create user-company relationship
		userCompany := models.UserCompany{
			UserID:    user.ID,
			CompanyID: dealer.CompanyID,
			UserRole:  "dealer",
		}

		if err := tx.Create(&userCompany).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to create dealer", err.Error())
		return
	}

	// Don't return password in response
	dealer.Password = ""
	utils.CreatedResponse(c, "Dealer created successfully", dealer)
}

// CreateSubDealer handles creating a new sub-dealer
func CreateSubDealer(c *gin.Context) {
	var subDealer models.Dealer
	if err := c.ShouldBindJSON(&subDealer); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input", err.Error())
		return
	}

	companyID, _ := c.Get("companyID")
	subDealer.CompanyID = companyID.(uuid.UUID)
	// Note: ParentDealerID should be set in the request to indicate this is a sub-dealer

	// Check if email already exists in users table
	var existingUser models.User
	if err := config.DB.Where("email = ?", subDealer.Email).First(&existingUser).Error; err == nil {
		utils.ErrorResponse(c, 400, "Email already exists", "A user with this email already exists in the system")
		return
	}

	// Hash the password
	hashedPassword, err := utils.HashPassword(subDealer.Password)
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to hash password", err.Error())
		return
	}
	subDealer.Password = hashedPassword

	// Create sub-dealer and user in a transaction
	err = config.DB.Transaction(func(tx *gorm.DB) error {
		// Create the sub-dealer
		if err := tx.Create(&subDealer).Error; err != nil {
			return err
		}

		// Create user account for the sub-dealer
		user := models.User{
			Name:      subDealer.Name,
			Email:     subDealer.Email,
			Password:  hashedPassword,
			Status:    "active",
			Role:      "sub_dealer",
			CreatedBy: nil, // Will be set by the current user if needed
		}

		if err := tx.Create(&user).Error; err != nil {
			return err
		}

		// Create user-company relationship
		userCompany := models.UserCompany{
			UserID:    user.ID,
			CompanyID: subDealer.CompanyID,
			UserRole:  "sub_dealer",
		}

		if err := tx.Create(&userCompany).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to create sub-dealer", err.Error())
		return
	}

	// Don't return password in response
	subDealer.Password = ""
	utils.CreatedResponse(c, "Sub-dealer created successfully", subDealer)
}

// CreateDealerCollection handles creating a dealer collection and updating the dealer's lastPaymentDate, walletBalance, and remainingAmount
func CreateDealerCollection(c *gin.Context) {
	companyID, _ := c.Get("companyID")

	var collection models.DealerCollection
	if err := c.ShouldBindJSON(&collection); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input data", err.Error())
		return
	}

	collection.CompanyID = companyID.(uuid.UUID)

	if err := config.DB.Create(&collection).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to create collection", err.Error())
		return
	}

	// Update the dealer's lastPaymentDate, walletBalance, and remainingAmount
	collectionDate := collection.CollectionDate
	if collectionDate == "" {
		collectionDate = time.Now().Format("2006-01-02")
	}
	config.DB.Model(&models.Dealer{}).
		Where("id = ?", collection.DealerID).
		UpdateColumns(map[string]interface{}{
			"last_payment_date": collectionDate,
			"wallet_balance":    gorm.Expr("GREATEST(wallet_balance - ?, 0)", collection.Amount),
			"remaining_amount":  gorm.Expr("GREATEST(remaining_amount - ?, 0)", collection.Amount),
		})

	utils.CreatedResponse(c, "Collection created", collection)
}

// DeleteDealer handles deleting a dealer and its associated user account
func DeleteDealer(c *gin.Context) {
	companyID, _ := c.Get("companyID")
	id := c.Param("id")

	var dealer models.Dealer
	if err := config.DB.Where("id = ? AND company_id = ?", id, companyID).First(&dealer).Error; err != nil {
		utils.ErrorResponse(c, 404, "Dealer not found", err.Error())
		return
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		// Delete the associated user based on email
		if err := tx.Where("email = ?", dealer.Email).Delete(&models.User{}).Error; err != nil {
			return err
		}

		// Delete the dealer
		if err := tx.Delete(&dealer).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to delete dealer", err.Error())
		return
	}

	utils.SuccessResponse(c, "Dealer deleted successfully", nil)
}
