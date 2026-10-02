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

// OptionalAuthMiddleware mounts the JWT claims when a valid token is present
// but lets anonymous requests through.
//
// A few route groups are intentionally reachable without a token (accounts is
// documented as public for testing), yet they also carry page permission guards.
// Those guards resolve permissions against the request's user, so without this
// every guarded write on such a group failed with "User not authenticated"
// regardless of how the caller was authenticated. Mounting the claims when
// available lets the guards work for signed-in users while an anonymous caller
// is still rejected by the guard itself rather than crashing on a missing key.
func OptionalAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")

		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenString := strings.Split(authHeader, "Bearer ")[1]
			if claims, err := utils.ValidateToken(tokenString); err == nil {
				c.Set("userID", claims.UserID)
				c.Set("companyID", claims.CompanyID)
				c.Set("roleInCompany", claims.RoleInCompany)
			}
		}

		c.Next()
	}
}
