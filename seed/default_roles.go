package seed

import (
	"awesomeProject/config"
	"awesomeProject/models"
	"errors"
	"fmt"
	"log"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DefaultRolesAndPermissions creates default roles with their permissions
func DefaultRolesAndPermissions() {
	// Define default roles and their permissions
	defaultRoles := []struct {
		Name        string
		Description string
		Permissions []string
	}{
		{
			Name:        "admin",
			Description: "Full system access with all permissions",
			Permissions: []string{
				// Dashboard
				"dashboard_view",

				// Users Management
				"users_view", "users_add", "users_edit", "users_delete", "users_change_status",

				// Companies Management
				"companies_view", "companies_add", "companies_edit", "companies_delete",

				// Network Management
				"network_view", "network_areas_add", "network_areas_edit", "network_areas_delete",
				"network_olts_add", "network_olts_edit", "network_olts_delete",
				"network_splitters_add", "network_splitters_edit", "network_splitters_delete",
				"network_pops_add", "network_pops_edit", "network_pops_delete",

				// Billing Management
				"billing_view", "billing_packages_add", "billing_packages_edit", "billing_packages_delete",
				"billing_invoices_add", "billing_invoices_edit", "billing_invoices_delete",
				"billing_payments_process",

				// Subscribers Management
				"subscribers_view", "subscribers_add", "subscribers_edit", "subscribers_delete",

				// Dealers Management
				"dealers_view", "dealers_add", "dealers_edit", "dealers_delete",
				"dealers_franchises_add", "dealers_franchises_edit", "dealers_franchises_delete",

				// HR Management
				"hr_view", "hr_staff_add", "hr_staff_edit", "hr_staff_delete",
				"hr_recovery_officers_add", "hr_recovery_officers_edit", "hr_recovery_officers_delete",

				// Reports
				"reports_view", "reports_sales_view", "reports_stock_movement_view", "reports_outstanding_payments_view",
				"reports_collections_view",

				// System Administration
				"system_view", "system_config", "system_logs", "system_backup",

				// Profile & Account
				"profile_manage", "password_change", "notifications_manage",
			},
		},
		{
			Name:        "manager",
			Description: "Company management with access to most features except system configuration",
			Permissions: []string{
				// Dashboard
				"dashboard_view",

				// Users Management (limited)
				"users_view", "users_change_status",

				// Companies Management
				"companies_view", "companies_edit",

				// Network Management
				"network_view", "network_areas_add", "network_areas_edit",
				"network_olts_add", "network_olts_edit",
				"network_splitters_add", "network_splitters_edit",
				"network_pops_add", "network_pops_edit",

				// Billing Management
				"billing_view", "billing_packages_add", "billing_packages_edit",
				"billing_invoices_add", "billing_invoices_edit", "billing_payments_process",

				// Subscribers Management
				"subscribers_view", "subscribers_add", "subscribers_edit", "subscribers_delete",

				// Dealers Management
				"dealers_view", "dealers_add", "dealers_edit",
				"dealers_franchises_add", "dealers_franchises_edit",

				// HR Management
				"hr_view", "hr_staff_add", "hr_staff_edit",
				"hr_recovery_officers_add", "hr_recovery_officers_edit",

				// Reports
				"reports_view", "reports_sales_view", "reports_outstanding_payments_view",
				"reports_collections_view",

				// Profile & Account
				"profile_manage", "password_change",
			},
		},
		{
			Name:        "recovery_officer",
			Description: "Recovery and collection focused role for field operations",
			Permissions: []string{
				// Dashboard
				"dashboard_view",

				// Network Management (view only)
				"network_view",

				// Billing Management (view only)
				"billing_view", "billing_payments_process",

				// Subscribers Management (view only)
				"subscribers_view",

				// Dealers Management (view only)
				"dealers_view",

				// HR Management (view only)
				"hr_view",

				// Reports
				"reports_view", "reports_collections_view",

				// Profile & Account
				"profile_manage", "password_change",
			},
		},
		{
			Name:        "dealer",
			Description: "Dealer and franchise management role",
			Permissions: []string{
				// Dashboard
				"dashboard_view",

				// Network Management (view only)
				"network_view",

				// Billing Management (view only)
				"billing_view",

				// Subscribers Management (limited)
				"subscribers_view", "subscribers_add", "subscribers_edit",

				// Dealers Management (self and sub-dealers)
				"dealers_view", "dealers_franchises_add", "dealers_franchises_edit",

				// Reports
				"reports_view", "reports_sales_view",

				// Profile & Account
				"profile_manage", "password_change",
			},
		},
	}

	// Create default roles if they don't exist
	for _, roleData := range defaultRoles {
		var existingRole models.Role
		result := config.DB.Where("name = ? AND company_id IS NULL", roleData.Name).First(&existingRole)
		if result.Error != nil {
			// If role doesn't exist, create it
			if errors.Is(result.Error, gorm.ErrRecordNotFound) {
				role := models.Role{
					TenantModel: models.TenantModel{
						BaseModel: models.BaseModel{
							ID: uuid.New(),
						},
						CompanyID: uuid.UUID{}, // System-wide role (zero value)
					},
					Name:        roleData.Name,
					Description: roleData.Description,
					Permissions: strings.Join(roleData.Permissions, ","),
				}

				if err := config.DB.Create(&role).Error; err != nil {
					log.Printf("Error creating default role %s: %v", roleData.Name, err)
				} else {
					log.Printf("Created default role: %s", roleData.Name)
				}
			} else {
				log.Printf("Error checking existing role %s: %v", roleData.Name, result.Error)
			}
			continue
		}

		// Update existing role to ensure it has all permissions
		existingRole.Permissions = strings.Join(roleData.Permissions, ",")
		if err := config.DB.Save(&existingRole).Error; err != nil {
			log.Printf("Error updating default role %s: %v", roleData.Name, err)
		} else {
			log.Printf("Updated default role: %s", roleData.Name)
		}
	}

	fmt.Println("Default roles and permissions have been configured")
}

// GetDefaultRoles returns the default roles configuration
func GetDefaultRoles() []struct {
	Name        string
	Description string
	Permissions []string
} {
	return []struct {
		Name        string
		Description string
		Permissions []string
	}{
		{
			Name:        "admin",
			Description: "Full system access with all permissions",
			Permissions: []string{
				// Dashboard
				"dashboard_view",

				// Users Management
				"users_view", "users_add", "users_edit", "users_delete", "users_change_status",

				// Companies Management
				"companies_view", "companies_add", "companies_edit", "companies_delete",

				// Network Management
				"network_view", "network_areas_add", "network_areas_edit", "network_areas_delete",
				"network_olts_add", "network_olts_edit", "network_olts_delete",
				"network_splitters_add", "network_splitters_edit", "network_splitters_delete",
				"network_pops_add", "network_pops_edit", "network_pops_delete",

				// Billing Management
				"billing_view", "billing_packages_add", "billing_packages_edit", "billing_packages_delete",
				"billing_invoices_add", "billing_invoices_edit", "billing_invoices_delete",
				"billing_payments_process",

				// Subscribers Management
				"subscribers_view", "subscribers_add", "subscribers_edit", "subscribers_delete",

				// Dealers Management
				"dealers_view", "dealers_add", "dealers_edit", "dealers_delete",
				"dealers_franchises_add", "dealers_franchises_edit", "dealers_franchises_delete",

				// HR Management
				"hr_view", "hr_staff_add", "hr_staff_edit", "hr_staff_delete",
				"hr_recovery_officers_add", "hr_recovery_officers_edit", "hr_recovery_officers_delete",

				// Reports
				"reports_view", "reports_sales_view", "reports_stock_movement_view", "reports_outstanding_payments_view",
				"reports_collections_view",

				// System Administration
				"system_view", "system_config", "system_logs", "system_backup",

				// Profile & Account
				"profile_manage", "password_change", "notifications_manage",
			},
		},
		{
			Name:        "manager",
			Description: "Company management with access to most features except system configuration",
			Permissions: []string{
				// Dashboard
				"dashboard_view",

				// Users Management (limited)
				"users_view", "users_change_status",

				// Companies Management
				"companies_view", "companies_edit",

				// Network Management
				"network_view", "network_areas_add", "network_areas_edit",
				"network_olts_add", "network_olts_edit",
				"network_splitters_add", "network_splitters_edit",
				"network_pops_add", "network_pops_edit",

				// Billing Management
				"billing_view", "billing_packages_add", "billing_packages_edit",
				"billing_invoices_add", "billing_invoices_edit", "billing_payments_process",

				// Subscribers Management
				"subscribers_view", "subscribers_add", "subscribers_edit", "subscribers_delete",

				// Dealers Management
				"dealers_view", "dealers_add", "dealers_edit",
				"dealers_franchises_add", "dealers_franchises_edit",

				// HR Management
				"hr_view", "hr_staff_add", "hr_staff_edit",
				"hr_recovery_officers_add", "hr_recovery_officers_edit",

				// Reports
				"reports_view", "reports_sales_view", "reports_outstanding_payments_view",
				"reports_collections_view",

				// Profile & Account
				"profile_manage", "password_change",
			},
		},
		{
			Name:        "recovery_officer",
			Description: "Recovery and collection focused role for field operations",
			Permissions: []string{
				// Dashboard
				"dashboard_view",

				// Network Management (view only)
				"network_view",

				// Billing Management (view only)
				"billing_view", "billing_payments_process",

				// Subscribers Management (view only)
				"subscribers_view",

				// Dealers Management (view only)
				"dealers_view",

				// HR Management (view only)
				"hr_view",

				// Reports
				"reports_view", "reports_collections_view",

				// Profile & Account
				"profile_manage", "password_change",
			},
		},
		{
			Name:        "dealer",
			Description: "Dealer and franchise management role",
			Permissions: []string{
				// Dashboard
				"dashboard_view",

				// Network Management (view only)
				"network_view",

				// Billing Management (view only)
				"billing_view",

				// Subscribers Management (limited)
				"subscribers_view", "subscribers_add", "subscribers_edit",

				// Dealers Management (self and sub-dealers)
				"dealers_view", "dealers_franchises_add", "dealers_franchises_edit",

				// Reports
				"reports_view", "reports_sales_view",

				// Profile & Account
				"profile_manage", "password_change",
			},
		},
	}
}
