package controllers

import (
	"strings"
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

	if dealer.Status == "" {
		dealer.Status = "active"
	}

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
			Status:    dealer.Status,
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

	if subDealer.Status == "" {
		subDealer.Status = "active"
	}

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
			Status:    subDealer.Status,
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

// UpdateDealerRequest holds the updatable fields for a dealer
type UpdateDealerRequest struct {
	Name           string     `json:"name"`
	Phone          string     `json:"phone"`
	Email          string     `json:"email"`
	Password       *string    `json:"password"`
	Cnic           string     `json:"cnic"`
	Address        string     `json:"address"`
	Status         string     `json:"status"`
	CommissionRate *float64   `json:"commissionRate"`
	WalletBalance  *float64   `json:"walletBalance"`
	FranchiseID    *uuid.UUID `json:"franchiseId"`
	ParentDealerID *string    `json:"parentDealerId"`
	AreaID         *uuid.UUID `json:"areaId"`
}

// UpdateDealer updates a dealer and its linked user account (email, status,
// and hashed password when a new one is provided).
func UpdateDealer(c *gin.Context) {
	companyID := c.MustGet("companyID").(uuid.UUID)
	id := c.Param("id")

	var req UpdateDealerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid input", err.Error())
		return
	}

	var dealer models.Dealer
	if err := config.DB.Where("id = ? AND company_id = ?", id, companyID).First(&dealer).Error; err != nil {
		utils.ErrorResponse(c, 404, "Dealer not found", err.Error())
		return
	}

	// Linked user account (dealer login identity)
	var user models.User
	userFound := true
	if err := config.DB.Where("email = ?", dealer.Email).First(&user).Error; err != nil {
		userFound = false
	}

	if req.Name != "" {
		dealer.Name = req.Name
	}
	if req.Phone != "" {
		dealer.Phone = req.Phone
	}
	newEmail := strings.ToLower(strings.TrimSpace(req.Email))
	if newEmail != "" {
		if newEmail != strings.ToLower(dealer.Email) {
			var clash models.User
			if err := config.DB.Where("LOWER(email) = LOWER(?)", newEmail).First(&clash).Error; err == nil && (!userFound || clash.ID != user.ID) {
				utils.ErrorResponse(c, 400, "Email already exists", "A user with this email already exists in the system")
				return
			}
		}
		dealer.Email = newEmail
	}
	if req.Cnic != "" {
		dealer.Cnic = req.Cnic
	}
	dealer.Address = req.Address
	if req.Status != "" {
		dealer.Status = req.Status
	}
	if req.CommissionRate != nil {
		dealer.CommissionRate = *req.CommissionRate
	}
	if req.WalletBalance != nil {
		dealer.WalletBalance = *req.WalletBalance
	}
	if req.FranchiseID != nil {
		dealer.FranchiseID = req.FranchiseID
	}
	if req.AreaID != nil {
		dealer.AreaID = req.AreaID
	}
	if req.ParentDealerID != nil {
		if *req.ParentDealerID == "" || *req.ParentDealerID == "none" {
			dealer.ParentDealerID = nil
		} else if pid, err := uuid.Parse(*req.ParentDealerID); err == nil {
			dealer.ParentDealerID = &pid
		}
	}

	hashedPassword := ""
	if req.Password != nil && *req.Password != "" {
		hash, err := utils.HashPassword(*req.Password)
		if err != nil {
			utils.ErrorResponse(c, 500, "Failed to hash password", err.Error())
			return
		}
		hashedPassword = hash
		dealer.Password = hash
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&dealer).Error; err != nil {
			return err
		}

		updates := map[string]interface{}{
			"name":   dealer.Name,
			"email":  dealer.Email,
			"status": dealer.Status,
		}
		if hashedPassword != "" {
			updates["password"] = hashedPassword
		}

		if userFound {
			return tx.Model(&models.User{}).Where("id = ?", user.ID).Updates(updates).Error
		}

		// No linked user found - create one so the dealer can log in
		newUser := models.User{
			Name:     dealer.Name,
			Email:    dealer.Email,
			Password: dealer.Password,
			Status:   dealer.Status,
			Role:     "dealer",
		}
		if err := tx.Create(&newUser).Error; err != nil {
			return err
		}
		userCompany := models.UserCompany{
			UserID:    newUser.ID,
			CompanyID: dealer.CompanyID,
			UserRole:  "dealer",
		}
		return tx.Create(&userCompany).Error
	})

	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to update dealer", err.Error())
		return
	}

	dealer.Password = ""
	utils.SuccessResponse(c, "Dealer updated successfully", dealer)
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
