package routes

import (
	"awesomeProject/controllers"
	"awesomeProject/middleware"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func SetupUserRoutes(router *gin.Engine, db *gorm.DB) {
	// Apply authentication and company validation middleware to all user routes
	userGroup := router.Group("/api/v1/users")
	userGroup.Use(middleware.AuthMiddleware())
	userGroup.Use(middleware.CompanyMiddleware(db))
	userGroup.Use(middleware.AuditMiddleware())

	{
		// Get all users in company (admin/owner only)
		userGroup.GET("",
			middleware.RequireOwnerOrAdmin(db),
			controllers.GetUserDetails)

		// Create sub-user (admin/owner only)
		userGroup.POST("",
			middleware.RequireOwnerOrAdmin(db),
			controllers.CreateSubUser)

		// Get specific user details (admin/owner only)
		userGroup.GET("/:id",
			middleware.RequireOwnerOrAdmin(db),
			controllers.GetUserDetails)

		// Update user role (owner only)
		userGroup.PUT("/:id/role",
			middleware.RequireRole(db, "owner"),
			controllers.UpdateUserRole)

		// Delete user (owner only)
		userGroup.DELETE("/:id",
			middleware.RequireRole(db, "owner"),
			controllers.DeleteUser)
	}

	// Recovery Officer specific routes
	recoveryGroup := router.Group("/api/v1/recovery-officers")
	recoveryGroup.Use(middleware.AuthMiddleware())
	recoveryGroup.Use(middleware.CompanyMiddleware(db))
	recoveryGroup.Use(middleware.AuditMiddleware())
	{
		// Create recovery officer (admin/owner only)
		recoveryGroup.POST("",
			middleware.RequireOwnerOrAdmin(db),
			controllers.CreateSubUser)

		// Get recovery officers (admin/owner only)
		recoveryGroup.GET("",
			middleware.RequireOwnerOrAdmin(db),
			controllers.GetStaff)
	}

	// Staff specific routes
	staffGroup := router.Group("/api/v1/staff")
	staffGroup.Use(middleware.AuthMiddleware())
	staffGroup.Use(middleware.CompanyMiddleware(db))
	staffGroup.Use(middleware.AuditMiddleware())
	{
		// Create staff (admin/owner only)
		staffGroup.POST("",
			middleware.RequireOwnerOrAdmin(db),
			controllers.CreateSubUser)

		// Get staff (admin/owner only)
		staffGroup.GET("",
			middleware.RequireOwnerOrAdmin(db),
			controllers.GetStaff)
	}
}
