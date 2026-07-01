package routes

import (
	"awesomeProject/config"
	"awesomeProject/controllers"
	"awesomeProject/middleware"
	"awesomeProject/models"

	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func SetupRoutes(r *gin.Engine) {
	// Middleware setup
	r.Use(middleware.Logger())
	r.Use(middleware.CORSMiddleware())

	// Simple test route
	r.GET("/test", func(c *gin.Context) {
		fmt.Printf("DEBUG: Root test route called!\n")
		c.JSON(http.StatusOK, gin.H{"message": "Root test route works!"})
	})

	api := r.Group("/api/v1")

	// Accounts routes (temporarily public for testing)
	accounts := api.Group("/accounts")
	accounts.Use(func(c *gin.Context) {
		// Get company ID from header first, then query parameter
		companyIDHeader := c.GetHeader("x-company-id")
		companyIDQuery := c.Query("companyId")

		companyIDStr := companyIDHeader
		if companyIDStr == "" {
			companyIDStr = companyIDQuery
		}

		if companyIDStr != "" {
			// Parse and set company ID
			if companyID, err := uuid.Parse(companyIDStr); err == nil {
				c.Set("companyID", companyID)
			}
		}

		// Set db in context for generic CRUD
		c.Set("db", config.DB)

		fmt.Printf("DEBUG: Accounts middleware called for path: %s, companyID: %s\n", c.Request.URL.Path, companyIDStr)
		c.Next()
	})
	{
		accounts.GET("/test", controllers.TestAccounts)
		accounts.GET("/ledger", controllers.GetLedgerEntries)
		accounts.POST("/ledger", controllers.CreateLedgerEntry)
		accounts.PUT("/ledger/:id", controllers.UpdateLedgerEntry)
		accounts.DELETE("/ledger/:id", controllers.DeleteLedgerEntry)
		controllers.RegisterGenericCRUD[models.Expense](accounts, "/expenses")
	}

	// Public routes
	auth := api.Group("/auth")
	{
		auth.POST("/login", controllers.Login)
		auth.POST("/signup", controllers.Register)
	}

	// Protected routes that don't require company context
	authProtected := api.Group("/auth")
	authProtected.Use(middleware.AuthMiddleware())
	{
		authProtected.GET("/me", controllers.GetMe)
		authProtected.POST("/logout", controllers.Logout)
		authProtected.PUT("/status", controllers.UpdateUserStatus)
	}

	// Admin routes for company management
	admin := api.Group("/admin")
	admin.Use(middleware.AuthMiddleware())
	{
		controllers.RegisterGenericCRUDScoped[models.Company](admin, "/companies", false)

		// Custom users endpoint to handle password and role properly
		adminUsers := admin.Group("/users")
		adminUsers.Use(middleware.CompanyMiddleware(config.DB))
		adminUsers.Use(middleware.AuditMiddleware())
		{
			adminUsers.GET("", controllers.GetAllUsers)
			adminUsers.POST("", controllers.CreateSubUser)
			adminUsers.PUT("/:id", controllers.UpdateSubUser)
			adminUsers.DELETE("/:id", controllers.DeleteSubUser)

			// Import/Export endpoints
			userImportExport := controllers.UserImportExport{}
			adminUsers.GET("/export", userImportExport.ExportUsers)
			adminUsers.GET("/template", userImportExport.DownloadTemplate)
			adminUsers.POST("/import", userImportExport.ImportUsers)
		}

		// Recovery Officers
		recoveryOfficers := admin.Group("/recovery-officers")
		recoveryOfficers.Use(middleware.AuthMiddleware())
		recoveryOfficers.Use(middleware.CompanyMiddleware(config.DB))
		{
			recoveryOfficers.GET("", controllers.GetRecoveryOfficers)
			recoveryOfficers.POST("", controllers.CreateSubUser)
			recoveryOfficers.PUT("/:id", controllers.UpdateSubUser)
			recoveryOfficers.DELETE("/:id", controllers.DeleteSubUser)
		}
	}

	// Protected routes for user's own companies
	userCompanies := api.Group("/companies")
	userCompanies.Use(middleware.AuthMiddleware())
	{
		userCompanies.GET("", controllers.GetUserCompanies)
		userCompanies.POST("", controllers.CreateUserCompany)
	}

	// Protected routes that require company context
	protected := api.Group("/")
	protected.Use(middleware.AuthMiddleware())
	protected.Use(middleware.CompanyMiddleware(config.DB))
	protected.Use(middleware.AuditMiddleware())

	{
		// Dashboard
		protected.GET("/dashboard", controllers.GetDashboardData)

		// Upload routes
		upload := protected.Group("/upload")
		{
			upload.POST("/company-image", controllers.UploadCompanyImage)
			upload.DELETE("/company-image", controllers.DeleteCompanyImage)
			upload.POST("/product-image/:id", controllers.UploadProductImage)
		}

		// Static file serving for company images
		api.GET("/uploads/company_images/:companyId", controllers.GetCompanyImage)
		// Static file serving for product images
		api.GET("/uploads/product_images/:filename", controllers.GetProductImage)

		// Network routes (with RBAC)
		network := protected.Group("/network")
		network.Use(middleware.RBACMiddleware(config.DB, "network", "read"))
		{
			controllers.RegisterGenericCRUDScoped[models.Area](network, "/areas", true)
			controllers.RegisterGenericCRUDScoped[models.OLT](network, "/olts", true)
			controllers.RegisterGenericCRUDScoped[models.OLT](network, "/olt", true) // Alias
			controllers.RegisterGenericCRUDScoped[models.Splitter](network, "/splitters", true)
			controllers.RegisterGenericCRUDScoped[models.POP](network, "/pops", true)
			controllers.RegisterGenericCRUDScoped[models.POP](network, "/pop", true) // Alias
		}

		// Billing routes (with RBAC)
		billing := protected.Group("/billing")
		billing.Use(middleware.RBACMiddleware(config.DB, "billing", "read"))
		{
			controllers.RegisterGenericCRUD[models.Package](billing, "/packages")
			controllers.RegisterGenericCRUD[models.Subscriber](billing, "/subscribers")
			controllers.RegisterGenericCRUD[models.Invoice](billing, "/invoices")
			billing.POST("/payments/process", middleware.RBACMiddleware(config.DB, "billing", "add"), controllers.ProcessPayment)
			billing.GET("/payments", controllers.GetPayments)
			billing.POST("/payments", controllers.CreatePayment)
			billing.PUT("/payments/:id", controllers.UpdatePayment)
			billing.DELETE("/payments/:id", controllers.DeletePayment)
		}

		crm := api.Group("/crm")
		crm.Use(func(c *gin.Context) {
			// Get company ID from header first, then query parameter
			companyIDHeader := c.GetHeader("x-company-id")
			companyIDQuery := c.Query("companyId")

			companyIDStr := companyIDHeader
			if companyIDStr == "" {
				companyIDStr = companyIDQuery
			}

			if companyIDStr != "" {
				// Parse and set company ID
				if companyID, err := uuid.Parse(companyIDStr); err == nil {
					c.Set("companyID", companyID)
				}
			}

			// Set db in context for generic CRUD
			c.Set("db", config.DB)

			fmt.Printf("DEBUG: CRM middleware called for path: %s, companyID: %s\n", c.Request.URL.Path, companyIDStr)
			c.Next()
		})
		{
			controllers.RegisterGenericCRUD[models.Customer](crm, "/customers")
			controllers.RegisterGenericCRUD[models.Guarantor](crm, "/guarantors")
			controllers.RegisterGenericCRUD[models.Vendor](crm, "/vendors")

			// Vendor Invoice specific routes
			crm.GET("/vendor-invoices", controllers.GetVendorInvoices)
			crm.GET("/vendor-invoices/:id", controllers.GetVendorInvoiceByID)
			crm.POST("/vendor-invoices", controllers.CreateVendorInvoice)
			crm.PUT("/vendor-invoices/:id", controllers.UpdateVendorInvoice)
			crm.DELETE("/vendor-invoices/:id", controllers.DeleteVendorInvoice)
		}

		// Roles and permissions
		roles := admin.Group("/roles")
		roles.Use(middleware.RBACMiddleware(config.DB, "roles", "read"))
		{
			controllers.RegisterGenericCRUD[models.Role](roles, "")
			controllers.RegisterGenericCRUD[models.Permission](roles, "/permissions")
			controllers.RegisterGenericCRUD[models.RolePermission](roles, "/role-permissions")
			roles.GET("/default", controllers.GetDefaultRoles)
			roles.POST("/seed", controllers.SeedDefaultRoles)
		}

		// Logs routes (with RBAC)
		logs := admin.Group("/logs")
		logs.Use(middleware.RBACMiddleware(config.DB, "logs", "read"))
		{
			logs.GET("", controllers.GetSystemLogs)
			logs.GET("/user/:userId", controllers.GetUserLogs)
			logs.GET("/module/:module", controllers.GetModuleLogs)
		}

		// System config routes (with RBAC)
		systemConfig := admin.Group("/config")
		systemConfig.Use(middleware.RBACMiddleware(config.DB, "system", "config"))
		{
			controllers.RegisterGenericCRUD[models.SystemConfig](systemConfig, "")
		}

		// Support tickets routes (with RBAC)
		support := admin.Group("/support-tickets")
		support.Use(middleware.RBACMiddleware(config.DB, "support", "read"))
		{
			controllers.RegisterGenericCRUDScoped[models.SupportTicket](support, "", true)
		}

		// Analytics / Reports routes (with RBAC)
		reports := protected.Group("/reports")
		reports.Use(middleware.RBACMiddleware(config.DB, "reports", "read"))
		{
			reports.GET("/sales-vs-recovery", controllers.GetSalesVsRecovery)
			reports.GET("/billing", controllers.GetBillingReport)
			reports.GET("/outstanding", controllers.GetOutstandingReport)
			// Comprehensive reports
			reports.GET("/recovery", controllers.GetRecoveryReports)
			reports.GET("/recovery/summary", controllers.GetRecoveryReports)
			reports.GET("/recovery/export", controllers.ExportReport)
			reports.GET("/outstanding-reports", controllers.GetOutstandingReports)
			reports.GET("/outstanding-reports/export", controllers.ExportReport)
			reports.GET("/cashflow", controllers.GetCashFlowReports)
			reports.GET("/cashflow/export", controllers.ExportReport)
			reports.GET("/sales", controllers.GetSalesReports)
			reports.GET("/sales/export", controllers.ExportReport)
			reports.GET("/subscribers", controllers.GetSubscriberReports)
			reports.GET("/subscribers/export", controllers.ExportReport)
			reports.GET("/billing-reports", controllers.GetBillingReports)
			reports.GET("/billing-reports/export", controllers.ExportReport)
		}

		// Subscribers routes (includes inquiries and corporate) - MOVED TO PROTECTED GROUP
		// Note: This section has been moved to the protected group with proper authentication

		// Dealers routes
		dealers := api.Group("/dealers")
		dealers.Use(func(c *gin.Context) {
			// Get company ID from header first, then query parameter
			companyIDHeader := c.GetHeader("x-company-id")
			companyIDQuery := c.Query("companyId")

			companyIDStr := companyIDHeader
			if companyIDStr == "" {
				companyIDStr = companyIDQuery
			}

			if companyIDStr != "" {
				// Parse and set company ID
				if companyID, err := uuid.Parse(companyIDStr); err == nil {
					c.Set("companyID", companyID)
				}
			}

			// Set db in context for generic CRUD
			c.Set("db", config.DB)
			c.Next()
		})
		{
			dealers.POST("", controllers.CreateDealer)
			// Register only GET, PUT for generic CRUD, DELETE uses custom logic
			crud := controllers.GenericCRUD[models.Dealer]{IsScoped: true}
			dealers.GET("", crud.FindAll)
			dealers.GET("/:id", crud.FindOne)
			dealers.PUT("/:id", crud.Update)
			dealers.DELETE("/:id", controllers.DeleteDealer)
			controllers.RegisterGenericCRUD[models.DealerFranchise](dealers, "/franchises")
			controllers.RegisterGenericCRUD[models.DealerCollection](dealers, "/collections")
			dealers.POST("/sub-dealer", controllers.CreateSubDealer)
			controllers.RegisterGenericCRUD[models.Dealer](dealers, "/dashboard")
			controllers.RegisterGenericCRUD[models.DealerFranchise](dealers, "/franchise-dashboard")
		}

		// Public Billing routes
		publicBilling := api.Group("/billing")
		publicBilling.Use(func(c *gin.Context) {
			// Get company ID from header first, then query parameter
			companyIDHeader := c.GetHeader("x-company-id")
			companyIDQuery := c.Query("companyId")

			companyIDStr := companyIDHeader
			if companyIDStr == "" {
				companyIDStr = companyIDQuery
			}

			if companyIDStr != "" {
				// Parse and set company ID
				if companyID, err := uuid.Parse(companyIDStr); err == nil {
					c.Set("companyID", companyID)
				}
			}

			// Set db in context for generic CRUD
			c.Set("db", config.DB)
			c.Next()
		})
		{
			controllers.RegisterGenericCRUD[models.CustomBill](publicBilling, "")
			controllers.RegisterGenericCRUD[models.CustomBill](publicBilling, "/custom-bills")
			// controllers.RegisterGenericCRUD[models.RecoveryTransaction](publicBilling, "/payments")
		}

		// Recovery routes
		recovery := api.Group("/recovery")
		recovery.Use(func(c *gin.Context) {
			companyIDHeader := c.GetHeader("x-company-id")
			companyIDQuery := c.Query("companyId")
			companyIDStr := companyIDHeader
			if companyIDStr == "" {
				companyIDStr = companyIDQuery
			}
			if companyIDStr != "" {
				// Parse and set company ID
				if companyID, err := uuid.Parse(companyIDStr); err == nil {
					c.Set("companyID", companyID)
				}
			}
			// Set db in context for generic CRUD
			c.Set("db", config.DB)
			c.Next()
		})
		{
			recovery.GET("", controllers.GetRecoveryTransactions)
			recovery.POST("", controllers.CreateRecoveryTransaction)
			controllers.RegisterGenericCRUD[models.RecoveryTransaction](recovery, "/transactions")
			controllers.RegisterGenericCRUD[models.DealerCollection](recovery, "/collections")
			controllers.RegisterGenericCRUD[models.RecoveryTransaction](recovery, "/collections-today")
		}

		// Sales routes
		sales := api.Group("/sales")
		sales.Use(func(c *gin.Context) {
			// Get company ID from header first, then query parameter
			companyIDHeader := c.GetHeader("x-company-id")
			companyIDQuery := c.Query("companyId")

			companyIDStr := companyIDHeader
			if companyIDStr == "" {
				companyIDStr = companyIDQuery
			}

			if companyIDStr != "" {
				// Parse and set company ID
				if companyID, err := uuid.Parse(companyIDStr); err == nil {
					c.Set("companyID", companyID)
				}
			}

			// Set db in context for generic CRUD
			c.Set("db", config.DB)
			c.Next()
		})
		{
			controllers.RegisterGenericCRUD[models.InstallmentPlan](sales, "/installment-plans")
		}

		// Corporate clients routes
		corporate := api.Group("/corporate")
		corporate.Use(func(c *gin.Context) {
			// Get company ID from header first, then query parameter
			companyIDHeader := c.GetHeader("x-company-id")
			companyIDQuery := c.Query("companyId")

			companyIDStr := companyIDHeader
			if companyIDStr == "" {
				companyIDStr = companyIDQuery
			}

			if companyIDStr != "" {
				// Parse and set company ID
				if companyID, err := uuid.Parse(companyIDStr); err == nil {
					c.Set("companyID", companyID)
				}
			}

			// Set db in context for generic CRUD
			c.Set("db", config.DB)
			c.Next()
		})
		{
			controllers.RegisterGenericCRUD[models.Customer](corporate, "/clients")
		}

		// Bill Creator routes
		billCreator := api.Group("/bill-creator")
		billCreator.Use(func(c *gin.Context) {
			// Get company ID from header first, then query parameter
			companyIDHeader := c.GetHeader("x-company-id")
			companyIDQuery := c.Query("companyId")

			companyIDStr := companyIDHeader
			if companyIDStr == "" {
				companyIDStr = companyIDQuery
			}

			if companyIDStr != "" {
				// Parse and set company ID
				if companyID, err := uuid.Parse(companyIDStr); err == nil {
					c.Set("companyID", companyID)
				}
			}

			// Set db in context for generic CRUD
			c.Set("db", config.DB)
			c.Next()
		})
		{
			controllers.RegisterGenericCRUD[models.Invoice](billCreator, "")
			controllers.RegisterGenericCRUD[models.Invoice](billCreator, "/bills")
		}

		// Payments routes
		payments := api.Group("/payments")
		payments.Use(func(c *gin.Context) {
			// Get company ID from header first, then query parameter
			companyIDHeader := c.GetHeader("x-company-id")
			companyIDQuery := c.Query("companyId")

			companyIDStr := companyIDHeader
			if companyIDStr == "" {
				companyIDStr = companyIDQuery
			}

			if companyIDStr != "" {
				// Parse and set company ID
				if companyID, err := uuid.Parse(companyIDStr); err == nil {
					c.Set("companyID", companyID)
				}
			}

			// Set db in context for generic CRUD
			c.Set("db", config.DB)
			c.Next()
		})
		{
			controllers.RegisterGenericCRUD[models.RecoveryTransaction](payments, "")
			controllers.RegisterGenericCRUD[models.DealerCollection](payments, "/collections")
			controllers.RegisterGenericCRUD[models.RecoveryTransaction](payments, "/recovery")
		}

		// Products routes
		products := api.Group("/products")
		products.Use(func(c *gin.Context) {
			// Get company ID from header first, then query parameter
			companyIDHeader := c.GetHeader("x-company-id")
			companyIDQuery := c.Query("companyId")

			companyIDStr := companyIDHeader
			if companyIDStr == "" {
				companyIDStr = companyIDQuery
			}

			if companyIDStr != "" {
				// Parse and set company ID
				if companyID, err := uuid.Parse(companyIDStr); err == nil {
					c.Set("companyID", companyID)
				}
			}

			// Set db in context for generic CRUD
			c.Set("db", config.DB)
			c.Next()
		})
		{
			controllers.RegisterGenericCRUD[models.Product](products, "")
		}

		// Plans routes
		plans := api.Group("/plans")
		plans.Use(func(c *gin.Context) {
			// Get company ID from header first, then query parameter
			companyIDHeader := c.GetHeader("x-company-id")
			companyIDQuery := c.Query("companyId")

			companyIDStr := companyIDHeader
			if companyIDStr == "" {
				companyIDStr = companyIDQuery
			}

			if companyIDStr != "" {
				// Parse and set company ID
				if companyID, err := uuid.Parse(companyIDStr); err == nil {
					c.Set("companyID", companyID)
				}
			}

			// Set db in context for generic CRUD
			c.Set("db", config.DB)
			c.Next()
		})
		{
			controllers.RegisterGenericCRUD[models.PricingPlan](plans, "")
			controllers.RegisterGenericCRUD[models.InstallmentPlan](plans, "/installment-plans")
			controllers.RegisterGenericCRUD[models.PricingPlan](plans, "/pricing-plans")
		}

		// Inventory routes
		inventory := api.Group("/inventory")
		inventory.Use(func(c *gin.Context) {
			// Get company ID from header first, then query parameter
			companyIDHeader := c.GetHeader("x-company-id")
			companyIDQuery := c.Query("companyId")

			companyIDStr := companyIDHeader
			if companyIDStr == "" {
				companyIDStr = companyIDQuery
			}

			if companyIDStr != "" {
				// Parse and set company ID
				if companyID, err := uuid.Parse(companyIDStr); err == nil {
					c.Set("companyID", companyID)
				}
			}

			// Set db in context for generic CRUD
			c.Set("db", config.DB)
			c.Next()
		})
		{
			controllers.RegisterGenericCRUD[models.InventoryItem](inventory, "/stock")
			controllers.RegisterGenericCRUD[models.InventoryItem](inventory, "/items")
			controllers.RegisterGenericCRUD[models.Product](inventory, "/products")
			controllers.RegisterGenericCRUD[models.PricingPlan](inventory, "/plans")
			controllers.RegisterGenericCRUD[models.Brand](inventory, "/brands")
			controllers.RegisterGenericCRUD[models.UnitType](inventory, "/unit-types")
			controllers.RegisterGenericCRUD[models.ProductType](inventory, "/product-types")
			controllers.RegisterGenericCRUD[models.InventoryStatus](inventory, "/statuses")
			controllers.RegisterGenericCRUD[models.Vendor](inventory, "/vendors")
			inventory.GET("/vendor-invoices", controllers.GetVendorInvoices)
			inventory.GET("/vendor-invoices/:id", controllers.GetVendorInvoiceByID)
			inventory.POST("/vendor-invoices", controllers.CreateVendorInvoice)
			inventory.PUT("/vendor-invoices/:id", controllers.UpdateVendorInvoice)
			inventory.DELETE("/vendor-invoices/:id", controllers.DeleteVendorInvoice)
			inventory.GET("/purchases", controllers.GetPurchases)
			inventory.GET("/purchases/:id", controllers.GetPurchaseByID)
			inventory.POST("/purchases", controllers.CreatePurchase)
			inventory.PUT("/purchases/:id", controllers.UpdatePurchase)
			inventory.DELETE("/purchases/:id", controllers.DeletePurchase)
			inventory.GET("/purchased-products", controllers.GetPurchasedProducts)
		}

		// POS routes
		pos := api.Group("/pos")
		pos.Use(func(c *gin.Context) {
			// Get company ID from header first, then query parameter
			companyIDHeader := c.GetHeader("x-company-id")
			companyIDQuery := c.Query("companyId")

			companyIDStr := companyIDHeader
			if companyIDStr == "" {
				companyIDStr = companyIDQuery
			}

			if companyIDStr != "" {
				// Parse and set company ID
				if companyID, err := uuid.Parse(companyIDStr); err == nil {
					c.Set("companyID", companyID)
				}
			}

			// Set db in context for generic CRUD
			c.Set("db", config.DB)
			c.Next()
		})
		{
			controllers.RegisterGenericCRUD[models.InventoryItem](pos, "")
			// Dedicated POS sales routes: persist nested line items, preload
			// them on read, and decrement product stock on sale.
			pos.POST("/sales", controllers.CreatePOSSale)
			pos.GET("/sales", controllers.GetPOSSales)
			pos.GET("/sales/:id", controllers.GetPOSSale)
		}

		// Support routes
		customerSupport := api.Group("/support")
		customerSupport.Use(func(c *gin.Context) {
			// Get company ID from header first, then query parameter
			companyIDHeader := c.GetHeader("x-company-id")
			companyIDQuery := c.Query("companyId")
			companyIDStr := companyIDHeader
			if companyIDStr == "" {
				companyIDStr = companyIDQuery
			}

			var companyID uuid.UUID
			if companyIDStr != "" {
				// Parse and set company ID
				if parsedID, err := uuid.Parse(companyIDStr); err == nil {
					companyID = parsedID
				}
			}

			// Always set companyID in context (even if empty)
			c.Set("companyID", companyID)
			// Set db in context for generic CRUD
			c.Set("db", config.DB)
			c.Next()
		})
		{
			controllers.RegisterGenericCRUD[models.Complaint](customerSupport, "/complaints")
			controllers.RegisterGenericCRUD[models.AlertTemplate](customerSupport, "/alerts")
		}

		// HR routes
		hr := api.Group("/hr")
		hr.Use(middleware.AuthMiddleware())
		hr.Use(middleware.CompanyMiddleware(config.DB))
		hr.Use(middleware.AuditMiddleware())
		hr.Use(func(c *gin.Context) {
			// Get company ID from header first, then query parameter
			companyIDHeader := c.GetHeader("x-company-id")
			companyIDQuery := c.Query("companyId")
			companyIDStr := companyIDHeader
			if companyIDStr == "" {
				companyIDStr = companyIDQuery
			}

			var companyID uuid.UUID
			if companyIDStr != "" {
				if parsedID, err := uuid.Parse(companyIDStr); err == nil {
					companyID = parsedID
				}
			}

			c.Set("companyID", companyID)
			c.Set("db", config.DB)
			c.Next()
		})
		{
			// Staff routes with custom user creation
			hr.POST("/staff", controllers.CreateSubUser)
			hr.GET("/staff", controllers.GetStaff)
			hr.PUT("/staff/:id", controllers.UpdateSubUser)
			hr.DELETE("/staff/:id", controllers.DeleteSubUser)

			controllers.RegisterGenericCRUD[models.Attendance](hr, "/attendance")
			controllers.RegisterGenericCRUD[models.AdvanceLoan](hr, "/advance-loans")
			controllers.RegisterGenericCRUD[models.AdvanceLoan](hr, "/advances")
			controllers.RegisterGenericCRUD[models.AlertTemplate](hr, "/alerts")
		}

		subscribers := protected.Group("/subscribers")
		{
			subscribers.GET("", controllers.GetSubscribers)
			subscribers.POST("", controllers.CreateSubscriber)
			subscribers.PUT("/:id", controllers.UpdateSubscriber)
			subscribers.DELETE("/:id", controllers.DeleteSubscriber)

			subscriberImportExport := controllers.SubscriberImportExport{}
			subscribers.GET("/export", subscriberImportExport.ExportSubscribers)
			subscribers.GET("/template", subscriberImportExport.DownloadTemplate)
			subscribers.POST("/import", subscriberImportExport.ImportSubscribers)

			controllers.RegisterGenericCRUD[models.Inquiry](subscribers, "/inquiries")
			controllers.RegisterGenericCRUD[models.CorporateCustomer](subscribers, "/corporate")
		}

	}
}
