package controllers

import (
	"fmt"
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

// maxSharedFileSize caps uploads at 100MB.
const maxSharedFileSize = 100 * 1024 * 1024

// sharedFileDir is where uploaded shared files are stored.
const sharedFileDir = "uploads/files"

// allowedSharedExts lists the permitted upload extensions.
var allowedSharedExts = map[string]bool{".exe": true, ".msi": true, ".zip": true}

// UploadDriverFile handles upload of a driver/installer file for the company.
func UploadDriverFile(c *gin.Context) {
	handleUploadSharedFile(c, "driver")
}

// UploadApplicationFile handles upload of the company application file.
func UploadApplicationFile(c *gin.Context) {
	handleUploadSharedFile(c, "application")
}

// handleUploadSharedFile stores an uploaded file of the given kind.
func handleUploadSharedFile(c *gin.Context, kind string) {
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

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		utils.ErrorResponse(c, 400, "No file provided", err.Error())
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if !allowedSharedExts[ext] {
		utils.ErrorResponse(c, 400, "Only .exe, .msi, or .zip files are allowed", "")
		return
	}

	if header.Size > maxSharedFileSize {
		utils.ErrorResponse(c, 400, "File too large. Maximum size is 100MB", "")
		return
	}

	if err := os.MkdirAll(sharedFileDir, 0755); err != nil {
		utils.ErrorResponse(c, 500, "Failed to create upload directory", err.Error())
		return
	}

	storedName := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	dst := filepath.Join(sharedFileDir, storedName)

	if err := saveUploadedFile(file, dst); err != nil {
		utils.ErrorResponse(c, 500, "Failed to save file", err.Error())
		return
	}

	record := models.SharedFile{
		Kind:         kind,
		OriginalName: header.Filename,
		StoredName:   storedName,
		Size:         header.Size,
		ContentType:  header.Header.Get("Content-Type"),
	}
	record.CompanyID = companyUUID

	if err := config.DB.Create(&record).Error; err != nil {
		os.Remove(dst)
		utils.ErrorResponse(c, 500, "Failed to save file record", err.Error())
		return
	}

	utils.SuccessResponse(c, "File uploaded successfully", toSharedFileResponse(record))
}

// ListDriverFiles returns driver files for the current company.
func ListDriverFiles(c *gin.Context) {
	handleListSharedFiles(c, "driver")
}

// ListApplications returns application files for the current company.
func ListApplications(c *gin.Context) {
	handleListSharedFiles(c, "application")
}

// handleListSharedFiles lists shared files of the given kind for the company.
func handleListSharedFiles(c *gin.Context, kind string) {
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

	var files []models.SharedFile
	if err := config.DB.
		Where("company_id = ? AND kind = ?", companyUUID, kind).
		Order("created_at DESC").
		Find(&files).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to list files", err.Error())
		return
	}

	resp := make([]gin.H, 0, len(files))
	for _, f := range files {
		resp = append(resp, toSharedFileResponse(f))
	}

	utils.SuccessResponse(c, "Files fetched", gin.H{"files": resp})
}

// DeleteSharedFile removes a shared file (record + stored file) for the company.
func DeleteSharedFile(c *gin.Context) {
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

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid file id", "")
		return
	}

	var record models.SharedFile
	if err := config.DB.
		Where("id = ? AND company_id = ?", id, companyUUID).
		First(&record).Error; err != nil {
		utils.ErrorResponse(c, 404, "File not found", err.Error())
		return
	}

	os.Remove(filepath.Join(sharedFileDir, record.StoredName))

	if err := config.DB.Delete(&record).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to delete file", err.Error())
		return
	}

	utils.SuccessResponse(c, "File deleted successfully", nil)
}

// DownloadSharedFile serves a stored shared file for download, using the
// original filename in Content-Disposition.
func DownloadSharedFile(c *gin.Context) {
	filename := c.Param("filename")
	if filename == "" || strings.Contains(filename, "..") || !allowedSharedExts[strings.ToLower(filepath.Ext(filename))] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid filename"})
		return
	}

	var record models.SharedFile
	if err := config.DB.Where("stored_name = ?", filename).First(&record).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	filePath := filepath.Join(sharedFileDir, record.StoredName)
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "File missing"})
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%q", record.OriginalName))
	c.Header("Content-Type", "application/octet-stream")
	c.File(filePath)
}

// toSharedFileResponse builds the JSON payload for a shared file.
func toSharedFileResponse(f models.SharedFile) gin.H {
	return gin.H{
		"id":           f.ID,
		"kind":         f.Kind,
		"originalName": f.OriginalName,
		"storedName":   f.StoredName,
		"size":         f.Size,
		"createdAt":    f.CreatedAt,
		"downloadUrl":  fmt.Sprintf("/api/v1/uploads/files/%s", f.StoredName),
	}
}
