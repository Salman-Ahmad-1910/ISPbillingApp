package utils

import "github.com/gin-gonic/gin"

// BaseResponse format enforced by frontend interceptors
type BaseResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
	Error   any    `json:"error,omitempty"`
}

// SuccessResponse sends a standard 200 OK
func SuccessResponse(c *gin.Context, message string, data any) {
	c.JSON(200, BaseResponse{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// CreatedResponse sends a standard 201 Created
func CreatedResponse(c *gin.Context, message string, data any) {
	c.JSON(201, BaseResponse{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// ErrorResponse sends a standard 400/500 Error
func ErrorResponse(c *gin.Context, status int, message string, err any) {
	c.JSON(status, BaseResponse{
		Success: false,
		Message: message,
		Error:   err,
	})
}
