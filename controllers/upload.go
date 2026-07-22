package controllers

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// UploadCompanyImage handles company image uploads
func UploadCompanyImage(c *gin.Context) {
	// Get company ID from middleware
	companyID, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 401, "Company ID not found", "")
		return
	}

	companyUUID, ok := companyID.(uuid.UUID)
	if !ok {
		utils.ErrorResponse(c, 400, "Invalid company ID", "")
		return
	}

	// Get uploaded file
	file, header, err := c.Request.FormFile("image")
	if err != nil {
		utils.ErrorResponse(c, 400, "No image file provided", err.Error())
		return
	}
	defer file.Close()

	// Validate file type
	if !isValidImageType(header.Filename) {
		utils.ErrorResponse(c, 400, "Invalid file type. Only JPG, JPEG, PNG files are allowed", "")
		return
	}

	// Validate file size (max 5MB)
	if header.Size > 5*1024*1024 {
		utils.ErrorResponse(c, 400, "File too large. Maximum size is 5MB", "")
		return
	}

	// Create upload directory if it doesn't exist
	uploadDir := "uploads/company_images"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		utils.ErrorResponse(c, 500, "Failed to create upload directory", err.Error())
		return
	}

	// Generate filename with company ID (overwrite existing)
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		ext = ".png" // Default to .png if no extension
	}
	filename := fmt.Sprintf("%s%s", companyUUID.String(), ext)
	filepath := filepath.Join(uploadDir, filename)

	// Save the file
	if err := saveUploadedFile(file, filepath); err != nil {
		utils.ErrorResponse(c, 500, "Failed to save image", err.Error())
		return
	}

	// Update company record with image path
	updateQuery := `UPDATE companies SET logo = ? WHERE id = ?`
	if err := config.DB.Exec(updateQuery, filename, companyUUID).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to update company record", err.Error())
		return
	}

	utils.SuccessResponse(c, "Image uploaded successfully", gin.H{
		"imageUrl": fmt.Sprintf("/uploads/company_images/%s", filename),
		"filename": filename,
	})
}

// GetCompanyImage serves the company image
func GetCompanyImage(c *gin.Context) {
	companyID := c.Param("companyId")
	if companyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Company ID is required"})
		return
	}

	// Parse company ID as UUID
	companyUUID, err := uuid.Parse(companyID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid company ID format"})
		return
	}

	// Get company image filename from database
	var imageUrl string
	query := `SELECT logo FROM companies WHERE id = ? AND deleted_at IS NULL`
	if err := config.DB.Raw(query, companyUUID).Scan(&imageUrl).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Company not found"})
		return
	}

	if imageUrl == "" {
		// Return default image if no image is set
		defaultImagePath := "uploads/company_images/default.png"
		if _, err := os.Stat(defaultImagePath); os.IsNotExist(err) {
			c.JSON(http.StatusNotFound, gin.H{"error": "No image found"})
			return
		}
		c.File(defaultImagePath)
		return
	}

	// Serve the image file
	imagePath := filepath.Join("uploads/company_images", imageUrl)
	if _, err := os.Stat(imagePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Image file not found"})
		return
	}

	c.File(imagePath)
}

// isValidImageType checks if the file has a valid image extension
func isValidImageType(filename string) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	validExts := []string{".jpg", ".jpeg", ".png"}
	for _, validExt := range validExts {
		if ext == validExt {
			return true
		}
	}
	return false
}

// saveUploadedFile saves the uploaded file to the specified path
func saveUploadedFile(file multipart.File, dst string) error {
	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, file)
	return err
}

// DeleteCompanyImage removes a company's image
func DeleteCompanyImage(c *gin.Context) {
	companyID, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 401, "Company ID not found", "")
		return
	}

	companyUUID, ok := companyID.(uuid.UUID)
	if !ok {
		utils.ErrorResponse(c, 400, "Invalid company ID", "")
		return
	}

	// Get current image URL
	var imageUrl string
	query := `SELECT logo FROM companies WHERE id = ? AND deleted_at IS NULL`
	if err := config.DB.Raw(query, companyUUID).Scan(&imageUrl).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to get company image", err.Error())
		return
	}

	// Delete file if it exists
	if imageUrl != "" {
		imagePath := filepath.Join("uploads/company_images", imageUrl)
		os.Remove(imagePath) // Ignore error if file doesn't exist
	}

	// Update database to remove image URL
	updateQuery := `UPDATE companies SET logo = NULL WHERE id = ?`
	if err := config.DB.Exec(updateQuery, companyUUID).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to update company record", err.Error())
		return
	}

	utils.SuccessResponse(c, "Image deleted successfully", nil)
}

// UploadCompanyStamp handles company stamp uploads
func UploadCompanyStamp(c *gin.Context) {
	companyID, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 401, "Company ID not found", "")
		return
	}

	companyUUID, ok := companyID.(uuid.UUID)
	if !ok {
		utils.ErrorResponse(c, 400, "Invalid company ID", "")
		return
	}

	file, header, err := c.Request.FormFile("image")
	if err != nil {
		utils.ErrorResponse(c, 400, "No image file provided", err.Error())
		return
	}
	defer file.Close()

	if !isValidImageType(header.Filename) {
		utils.ErrorResponse(c, 400, "Invalid file type. Only JPG, JPEG, PNG files are allowed", "")
		return
	}

	if header.Size > 5*1024*1024 {
		utils.ErrorResponse(c, 400, "File too large. Maximum size is 5MB", "")
		return
	}

	uploadDir := "uploads/company_stamps"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		utils.ErrorResponse(c, 500, "Failed to create upload directory", err.Error())
		return
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		ext = ".png"
	}
	filename := fmt.Sprintf("%s%s", companyUUID.String(), ext)
	filePath := filepath.Join(uploadDir, filename)

	if err := saveUploadedFile(file, filePath); err != nil {
		utils.ErrorResponse(c, 500, "Failed to save stamp", err.Error())
		return
	}

	updateQuery := `UPDATE companies SET stamp = ? WHERE id = ?`
	if err := config.DB.Exec(updateQuery, filename, companyUUID).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to update company record", err.Error())
		return
	}

	utils.SuccessResponse(c, "Stamp uploaded successfully", gin.H{
		"stampUrl": fmt.Sprintf("/uploads/company_stamps/%s", filename),
		"filename": filename,
	})
}

// GetCompanyStamp serves the company stamp
func GetCompanyStamp(c *gin.Context) {
	companyID := c.Param("companyId")
	if companyID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Company ID is required"})
		return
	}

	companyUUID, err := uuid.Parse(companyID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid company ID format"})
		return
	}

	var stamp string
	query := `SELECT stamp FROM companies WHERE id = ? AND deleted_at IS NULL`
	if err := config.DB.Raw(query, companyUUID).Scan(&stamp).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Company not found"})
		return
	}

	if stamp == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "No stamp found"})
		return
	}

	imagePath := filepath.Join("uploads/company_stamps", stamp)
	if _, err := os.Stat(imagePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Stamp file not found"})
		return
	}

	c.File(imagePath)
}

// DeleteCompanyStamp removes a company's stamp
func DeleteCompanyStamp(c *gin.Context) {
	companyID, exists := c.Get("companyID")
	if !exists {
		utils.ErrorResponse(c, 401, "Company ID not found", "")
		return
	}

	companyUUID, ok := companyID.(uuid.UUID)
	if !ok {
		utils.ErrorResponse(c, 400, "Invalid company ID", "")
		return
	}

	var stamp string
	query := `SELECT stamp FROM companies WHERE id = ? AND deleted_at IS NULL`
	if err := config.DB.Raw(query, companyUUID).Scan(&stamp).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to get company stamp", err.Error())
		return
	}

	if stamp != "" {
		imagePath := filepath.Join("uploads/company_stamps", stamp)
		os.Remove(imagePath)
	}

	updateQuery := `UPDATE companies SET stamp = NULL WHERE id = ?`
	if err := config.DB.Exec(updateQuery, companyUUID).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to update company record", err.Error())
		return
	}

	utils.SuccessResponse(c, "Stamp deleted successfully", nil)
}

// UploadProductImage handles product image uploads. The product id is passed
// as a URL param; the image is stored under uploads/product_images and the
// Product.image column is updated with the served path.
func UploadProductImage(c *gin.Context) {
	productID := c.Param("id")
	if productID == "" {
		utils.ErrorResponse(c, 400, "Product id is required", "")
		return
	}
	productUUID, err := uuid.Parse(productID)
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid product id format", "")
		return
	}

	file, header, err := c.Request.FormFile("image")
	if err != nil {
		utils.ErrorResponse(c, 400, "No image file provided", err.Error())
		return
	}
	defer file.Close()

	if !isValidImageType(header.Filename) {
		utils.ErrorResponse(c, 400, "Invalid file type. Only JPG, JPEG, PNG files are allowed", "")
		return
	}
	if header.Size > 5*1024*1024 {
		utils.ErrorResponse(c, 400, "File too large. Maximum size is 5MB", "")
		return
	}

	uploadDir := "uploads/product_images"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		utils.ErrorResponse(c, 500, "Failed to create upload directory", err.Error())
		return
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		ext = ".png"
	}
	// Unique filename per product (overwrite on re-upload).
	filename := fmt.Sprintf("%s%s", productUUID.String(), ext)
	dst := filepath.Join(uploadDir, filename)

	if err := saveUploadedFile(file, dst); err != nil {
		utils.ErrorResponse(c, 500, "Failed to save image", err.Error())
		return
	}

	// Store the served path on the product.
	imagePath := fmt.Sprintf("/uploads/product_images/%s", filename)
	if err := config.DB.Model(&models.Product{}).
		Where("id = ?", productUUID).
		Update("image", imagePath).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to update product image", err.Error())
		return
	}

	utils.SuccessResponse(c, "Image uploaded successfully", gin.H{
		"image": imagePath,
	})
}

// GetProductImage serves a product image file by filename.
func GetProductImage(c *gin.Context) {
	filename := c.Param("filename")
	if filename == "" || strings.Contains(filename, "..") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid filename"})
		return
	}
	imagePath := filepath.Join("uploads/product_images", filename)
	if _, err := os.Stat(imagePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "Image file not found"})
		return
	}
	c.File(imagePath)
}
