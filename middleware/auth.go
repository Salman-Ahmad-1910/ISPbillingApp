package middleware

import (
	"strings"

	"awesomeProject/utils"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware extracts JWT, validates it, and mounts claims to Gin context
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")

		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			utils.ErrorResponse(c, 401, "Unauthorized", "Missing or invalid Authorization header")
			c.Abort()
			return
		}

		tokenString := strings.Split(authHeader, "Bearer ")[1]
		claims, err := utils.ValidateToken(tokenString)

		if err != nil {
			utils.ErrorResponse(c, 401, "Unauthorized", err.Error())
			c.Abort()
			return
		}

		// Mount claims into context for controllers/scopes to access
		c.Set("userID", claims.UserID)
		c.Set("companyID", claims.CompanyID)
		c.Set("roleInCompany", claims.RoleInCompany)

		c.Next()
	}
}
