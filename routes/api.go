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

	// API responses must never be cached so refetches after mutations
	// always return fresh data from the server.
	api.Use(func(c *gin.Context) {
		c.Header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")
		c.Next()
	})

	// Every write / update / delete across all API groups lands in the audit
	// trail (audit_logs) so the single System Log page captures all activity.
	api.Use(middleware.AuditMiddleware())

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
		// Heads and sub-heads are both owned by the Account Heads page, which
		// gates Add / Edit / Delete for each of the two tables. /entries is
		// deliberately left unguarded: it is written by Account Entry (13323)
		// AND by One Day Balance Sheet (13341), so a single page guard here
		// would let one page's grant unlock the other's data.
		accountHeadWrite := middleware.RequirePageCrud(config.DB, middleware.AccountHeadPermission)
		controllers.RegisterGenericCRUDGuarded[models.AccountHead](accounts, "/heads", true, accountHeadWrite)
		controllers.RegisterGenericCRUDGuarded[models.AccountSubHead](accounts, "/sub-heads", true, accountHeadWrite)
		controllers.RegisterGenericCRUD[models.AccountEntry](accounts, "/entries")
	}

	// Public routes
	auth := api.Group("/auth")
	{
		auth.POST("/login", controllers.Login)
		auth.POST("/signup", controllers.Register)
		auth.POST("/forgot-password", controllers.ForgotPassword)
		auth.POST("/reset-password", controllers.ResetPassword)
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
			controllers.RegisterConnectionRoutes(admin)

		// Custom users endpoint to handle password and role properly
		adminUsers := admin.Group("/users")
		adminUsers.Use(middleware.CompanyMiddleware(config.DB))
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

	{
		// Dashboard
		protected.GET("/dashboard", controllers.GetDashboardData)
		protected.GET("/dashboard/collection-chart", controllers.GetCollectionChart)
		protected.GET("/dashboard/subscriber-growth-chart", controllers.GetSubscriberGrowthChart)

		// Collection sub-routes
		collection := protected.Group("/collection")
		{
			collection.GET("/pending-subscribers", controllers.GetPendingSubscribers)
		}

		// Upload routes
		upload := protected.Group("/upload")
		{
			upload.POST("/company-image", controllers.UploadCompanyImage)
			upload.DELETE("/company-image", controllers.DeleteCompanyImage)
			upload.POST("/company-stamp", controllers.UploadCompanyStamp)
			upload.DELETE("/company-stamp", controllers.DeleteCompanyStamp)
		upload.POST("/product-image/:id", controllers.UploadProductImage)
		upload.POST("/driver", controllers.UploadDriverFile)
		upload.POST("/application", controllers.UploadApplicationFile)
	}

	// Static file serving for company images
	api.GET("/uploads/company_images/:companyId", controllers.GetCompanyImage)
	// Static file serving for company stamps
	api.GET("/uploads/company_stamps/:companyId", controllers.GetCompanyStamp)
	// Static file serving for product images
	api.GET("/uploads/product_images/:filename", controllers.GetProductImage)
	// Static file serving for shared files (drivers, application) downloads
	api.GET("/uploads/files/:filename", controllers.DownloadSharedFile)

	// Shared file management routes
	protected.GET("/drivers", controllers.ListDriverFiles)
	protected.GET("/applications", controllers.ListApplications)
	protected.DELETE("/files/:id", controllers.DeleteSharedFile)

		// Network routes (with RBAC)
		network := protected.Group("/network")
		network.Use(middleware.RBACMiddleware(config.DB, "network", "read"))
		{
			network.GET("/areas", controllers.GetAreas)
			network.GET("/areas/:id", controllers.FindArea)
			network.POST("/areas", controllers.CreateArea)
			network.PUT("/areas/:id", controllers.UpdateArea)
			network.DELETE("/areas/:id", controllers.DeleteArea)
			network.POST("/areas/:id/assign-officer", controllers.AssignAreaOfficer)
			network.POST("/areas/:id/unassign-officer", controllers.UnassignAreaOfficer)
			controllers.RegisterGenericCRUDScoped[models.OLT](network, "/olts", true)
			controllers.RegisterGenericCRUDScoped[models.OLT](network, "/olt", true) // Alias
			controllers.RegisterGenericCRUDScoped[models.Splitter](network, "/splitters", true)
			controllers.RegisterGenericCRUDScoped[models.POP](network, "/pops", true)
			controllers.RegisterGenericCRUDScoped[models.POP](network, "/pop", true) // Alias
			controllers.RegisterGenericCRUDScoped[models.DistributionBox](network, "/boxes", true)
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
			billing.POST("/payments", middleware.RBACMiddleware(config.DB, "billing", "add"), controllers.CreatePayment)
billing.PUT("/payments/:id", middleware.RBACMiddleware(config.DB, "billing", "edit"), controllers.UpdatePayment)
		billing.DELETE("/payments/:id", middleware.RBACMiddleware(config.DB, "billing", "delete"), controllers.DeletePayment)
			controllers.RegisterGenericCRUD[models.TransactionType](billing, "/transaction-types")
			billing.POST("/bills/create", middleware.RBACMiddleware(config.DB, "billing", "add"), controllers.CreateBills)
			billing.POST("/bills/delete", middleware.RBACMiddleware(config.DB, "billing", "add"), controllers.DeleteBills)
			billing.GET("/bills", controllers.GetBillRecords)

			billing.GET("/promises", controllers.GetPromises)
			billing.POST("/promises", controllers.CreatePromise)
			billing.PUT("/promises/:id", controllers.UpdatePromise)
			billing.DELETE("/promises/:id", controllers.DeletePromise)
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

// Vendor Invoice specific routes. Same resource as
		// /inventory/vendor-invoices, so they share its permission guards; on
		// the bare crm group they were an unguarded duplicate write path.
		crmVendorInvoiceWrite := middleware.RequirePageCrud(config.DB, middleware.VendorInvoicePermission)
		crm.GET("/vendor-invoices", controllers.GetVendorInvoices)
		crm.GET("/vendor-invoices/:id", controllers.GetVendorInvoiceByID)
		crm.POST("/vendor-invoices", crmVendorInvoiceWrite, controllers.CreateVendorInvoice)
		crm.PUT("/vendor-invoices/:id", crmVendorInvoiceWrite, controllers.UpdateVendorInvoice)
		crm.DELETE("/vendor-invoices/:id", crmVendorInvoiceWrite, controllers.DeleteVendorInvoice)
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
			roles.GET("/users/:userId/permissions", controllers.GetUserPermissions)
			roles.PUT("/users/:userId/permissions", controllers.UpdateUserPermissions)
		}

		// Logs routes (with RBAC)
		logs := admin.Group("/logs")
		logs.Use(middleware.RBACMiddleware(config.DB, "logs", "read"))
		{
			logs.GET("", controllers.GetSystemLogs)
			logs.GET("/user/:userId", controllers.GetUserLogs)
			logs.GET("/module/:module", controllers.GetModuleLogs)
			logs.POST("/:id/restore", controllers.RestoreDeletedLog)
		}

		// System config routes (with RBAC)
		systemConfig := admin.Group("/config")
		systemConfig.Use(middleware.RBACMiddleware(config.DB, "system", "config"))
		{
			controllers.RegisterGenericCRUD[models.SystemConfig](systemConfig, "")
		}

		// Messages routes (SMS / notification management)
		messages := protected.Group("/messages")
		{
			controllers.RegisterGenericCRUDScoped[models.Message](messages, "", true)
			messages.POST("/send", controllers.SendMessages)
			// Message templates are created, edited and deleted only from the New
			// Messages page, which gates all three. The queued messages themselves
			// stay unguarded because Draft / WhatsApp Draft / Other / Expiry all
			// share the same collection and delete endpoints.
			controllers.RegisterGenericCRUDGuarded[models.MessageTemplate](messages, "/templates", true,
				middleware.RequirePageCrud(config.DB, middleware.MessageNewPermission))
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
		dealers.Use(middleware.AuthMiddleware())
		{
			dealers.POST("", controllers.CreateDealer)
			// Register only GET, PUT for generic CRUD, DELETE uses custom logic
			crud := controllers.GenericCRUD[models.Dealer]{IsScoped: true}
			dealers.GET("", crud.FindAll)
			dealers.GET("/:id", crud.FindOne)
			dealers.PUT("/:id", controllers.UpdateDealer)
			dealers.DELETE("/:id", controllers.DeleteDealer)
			controllers.RegisterGenericCRUD[models.DealerFranchise](dealers, "/franchises")
			dcCRUD := controllers.GenericCRUD[models.DealerCollection]{IsScoped: true}
			// Dealer Collections (13321) is the only page that records, edits or
			// deletes a dealer collection, so all three are gated on its own
			// Create / Update / Delete children. The recovery and payments groups
			// register their own /collections below and are left alone.
			dcWrite := middleware.RequirePageCrud(config.DB, middleware.DealerCollectionPage)
			dealers.POST("/collections", dcWrite, controllers.CreateDealerCollection)
			dealers.GET("/collections", dcCRUD.FindAll)
			dealers.GET("/collections/:id", dcCRUD.FindOne)
			dealers.PUT("/collections/:id", dcWrite, dcCRUD.Update)
			dealers.DELETE("/collections/:id", dcWrite, dcCRUD.Delete)
			dealers.POST("/sub-dealer", controllers.CreateSubDealer)

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
			controllers.RegisterProductRoutes(products)
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
			controllers.RegisterProductRoutes(inventory.Group("/products"))
			controllers.RegisterGenericCRUD[models.PricingPlan](inventory, "/plans")
			controllers.RegisterGenericCRUD[models.Brand](inventory, "/brands")
			controllers.RegisterGenericCRUD[models.UnitType](inventory, "/unit-types")
			controllers.RegisterGenericCRUD[models.ProductType](inventory, "/product-types")
			controllers.RegisterGenericCRUD[models.InventoryStatus](inventory, "/statuses")
			controllers.RegisterGenericCRUD[models.Vendor](inventory, "/vendors")
			{
				snPool := controllers.SerialNumberPoolCRUD{GenericCRUD: controllers.GenericCRUD[models.SerialNumberPool]{IsScoped: true}}
				inventory.GET("/serial-number-pool", snPool.FindAll)
				inventory.POST("/serial-number-pool", snPool.Create)
				inventory.GET("/serial-number-pool/next", snPool.GetNextSerialNumber)
				inventory.GET("/serial-number-pool/:id", snPool.FindOne)
				inventory.PUT("/serial-number-pool/:id", snPool.Update)
				inventory.DELETE("/serial-number-pool/:id", snPool.Delete)
			}
			inventory.GET("/vendor-invoices", controllers.GetVendorInvoices)
			inventory.GET("/vendor-invoices/:id", controllers.GetVendorInvoiceByID)
// Same resource as /crm/vendor-invoices, so it shares that route's permission
			// guards (Vendor Invoice 15372).
			vendorInvoiceWrite := middleware.RequirePageCrud(config.DB, middleware.VendorInvoicePermission)
			inventory.POST("/vendor-invoices", vendorInvoiceWrite, controllers.CreateVendorInvoice)
			inventory.PUT("/vendor-invoices/:id", vendorInvoiceWrite, controllers.UpdateVendorInvoice)
			inventory.DELETE("/vendor-invoices/:id", vendorInvoiceWrite, controllers.DeleteVendorInvoice)
			// Purchase (15313) owns Add / Edit / Delete, which the page gates. The
			// status toggle and add-quantity sub-actions are deliberately not
			// guarded: the page does not gate those buttons, so guarding them
			// would 403 a control the user can legitimately see and use.
			purchaseWrite := middleware.RequirePageCrud(config.DB, middleware.PurchasePermission)
			inventory.GET("/purchases", controllers.GetPurchases)
			inventory.GET("/purchases/:id", controllers.GetPurchaseByID)
			inventory.POST("/purchases", purchaseWrite, controllers.CreatePurchase)
			inventory.PUT("/purchases/:id", purchaseWrite, controllers.UpdatePurchase)
			inventory.POST("/purchases/:id/add-quantity", controllers.AddPurchaseQuantity)
			inventory.PATCH("/purchases/:id/status", controllers.UpdatePurchaseStatus)
			inventory.DELETE("/purchases/:id", purchaseWrite, controllers.DeletePurchase)
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
			pos.POST("/installment-sales", controllers.CreateInstallmentSale)
			pos.GET("/sales", controllers.GetPOSSales)
			pos.GET("/sales/:id", controllers.GetPOSSale)
			pos.DELETE("/sales/:id", controllers.DeletePOSSale)
			pos.POST("/sales/:id/return", controllers.ReturnPOSSale)
			pos.POST("/sales/:id/replace", controllers.ReplacePOSSale)
			pos.PATCH("/sales/:id/status", controllers.UpdatePOSSaleStatus)
			pos.GET("/installment/:subscriberId", controllers.GetSubscriberInstallment)
			pos.PUT("/installment/:id/pay", controllers.PayInstallment)
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
			// /complaints is shared by the main complaint list, Subscribers Complain
			// (13342) and Allocated Complains (13343), so it stays unguarded: a
			// single page guard would let one of those grants unlock the others.
			// The two lookup tables below are each owned by exactly one page, which
			// gates all three of Add / Edit / Delete for them.
			controllers.RegisterGenericCRUD[models.Complaint](customerSupport, "/complaints")
			controllers.RegisterGenericCRUDGuarded[models.ComplaintSubject](customerSupport, "/complaint-subjects", true,
				middleware.RequirePageCrud(config.DB, middleware.ComplaintSubjectPermission))
			controllers.RegisterGenericCRUDGuarded[models.ComplaintType](customerSupport, "/complaint-types", true,
				middleware.RequirePageCrud(config.DB, middleware.ComplaintTypePermission))
			controllers.RegisterGenericCRUD[models.AlertTemplate](customerSupport, "/alerts")
		}

		// HR routes
		hr := api.Group("/hr")
		hr.Use(middleware.AuthMiddleware())
		hr.Use(middleware.CompanyMiddleware(config.DB))
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
			// Staff routes with custom user creation. The Staff page gates
			// Add / Edit / Delete, so the three writes are guarded. /departments is
			// left unguarded on purpose: it has no page permission of its own and
			// the staff form creates a department inline, so guarding it would
			// break staff creation for a user who legitimately holds Staff Create.
			staffWrite := middleware.RequirePageCrud(config.DB, middleware.StaffPermission)
			hr.POST("/staff", staffWrite, controllers.CreateSubUser)
			hr.GET("/staff", controllers.GetStaff)
			hr.PUT("/staff/:id", staffWrite, controllers.UpdateSubUser)
			hr.DELETE("/staff/:id", staffWrite, controllers.DeleteSubUser)

			controllers.RegisterGenericCRUD[models.StaffDepartment](hr, "/departments")

			// Attendance (15322) creates and updates a whole day in one Save, so
			// both of its children are covered by the method-derived guard.
			controllers.RegisterGenericCRUDGuarded[models.Attendance](hr, "/attendance", true,
				middleware.RequirePageCrud(config.DB, middleware.StaffAttendancePermission))
			// Salary (15318) is create-only: paying a salary is a financial record,
			// so the page exposes no Edit or Delete and the global fallback still
			// applies to PUT/DELETE.
			controllers.RegisterGenericCRUDGuarded[models.SalaryPayment](hr, "/salary", true,
				middleware.RequirePageCrud(config.DB, middleware.StaffSalaryPermission))
			// Advance and Loans (15317) is one page served by two paths.
			advanceWrite := middleware.RequirePageCrud(config.DB, middleware.AdvanceLoanPermission)
			controllers.RegisterGenericCRUDGuarded[models.AdvanceLoan](hr, "/advance-loans", true, advanceWrite)
			controllers.RegisterGenericCRUDGuarded[models.AdvanceLoan](hr, "/advances", true, advanceWrite)
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
		subscribers.POST("/import/preview", subscriberImportExport.PreviewImportSubscribers)
		subscribers.POST("/import/confirm", subscriberImportExport.ConfirmImportSubscribers)

			controllers.RegisterGenericCRUD[models.Inquiry](subscribers, "/inquiries")
			controllers.RegisterGenericCRUD[models.CorporateCustomer](subscribers, "/corporate")
		}

	}
}
