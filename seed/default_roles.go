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
				"network_boxes_view",

				// Billing Management
				"billing_view", "billing_packages_add", "billing_packages_edit", "billing_packages_delete",
				"billing_invoices_add", "billing_invoices_edit", "billing_invoices_delete",
				"billing_payments_process",

				// Subscribers Management
				"subscribers_view", "subscribers_add", "subscribers_edit", "subscribers_delete",
				"subscribers_packages_view", "subscribers_inquiries_view", "subscribers_location_view",

				// Dealers Management
				"dealers_view", "dealers_add", "dealers_edit", "dealers_delete",
				"dealers_franchises_add", "dealers_franchises_edit", "dealers_franchises_delete",

				// Recovery Officers
				"hr_recovery_officers_allocate",

				// Transactions
				"transactions_user_collections_view", "transactions_dealers_collections_view",
				"transactions_allocated_view", "transactions_reprint", "transactions_bills_create",
				"transactions_types_view", "transactions_new_collection", "transactions_bad_debt_view",

				// Complaints
				"complaints_users_view", "complaints_allocated_view", "complaints_subjects_view",
				"complaints_types_view", "complaints_report_view",

				// Messages
				"messages_new_view", "messages_other_view", "messages_draft_view",
				"messages_sent_view", "messages_expired_view", "messages_whatsapp_view",

				// Accounts
				"accounts_heads_view", "accounts_entry_view", "accounts_one_day_view", "accounts_reports_view",

				// Inventory
				"inventory_products_view", "inventory_purchase_view", "inventory_status_view",
				"inventory_product_types_view", "inventory_vendors_view", "inventory_brands_view",
				"inventory_unit_types_view",

				// Point of Sale
				"pos_sales_view",

				// HR Management
				"hr_view", "hr_staff_add", "hr_staff_edit", "hr_staff_delete",
				"hr_recovery_officers_add", "hr_recovery_officers_edit", "hr_recovery_officers_delete",
				"hr_salary_view", "hr_advances_view", "hr_attendance_day_view", "hr_attendance_user_view",

				// Logs
				"logs_connections_view", "logs_deleted_collection_view", "logs_deleted_users_view",

				// Reports
				"reports_view", "reports_sales_view", "reports_stock_movement_view", "reports_outstanding_payments_view",
				"reports_collections_view", "reports_users_defaulter", "reports_allocated_defaulters",
				"reports_new_users", "reports_monthly_collection_month_wise", "reports_month_wise_collection",
				"reports_unpaid_collection", "reports_allocated_collections", "reports_promise_date",
				"reports_user_collections", "reports_expiry_defaulters", "reports_month_defaulters",
				"reports_collection_not_generated", "reports_creator_summary", "reports_package_wise",
				"reports_deactivated_users", "reports_dealer_invoices", "reports_new_dealers",
				"reports_dealers_collection", "reports_dealers_defaulter", "reports_abstract_stock",
				"reports_abstract_sales",

				// System Administration
				"system_view", "system_config", "system_logs", "system_backup",
				"system_user_rights", "system_change_password",

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
				"network_boxes_view",

				// Billing Management
				"billing_view", "billing_packages_add", "billing_packages_edit",
				"billing_invoices_add", "billing_invoices_edit", "billing_payments_process",

				// Subscribers Management
				"subscribers_view", "subscribers_add", "subscribers_edit", "subscribers_delete",
				"subscribers_packages_view", "subscribers_inquiries_view",

				// Dealers Management
				"dealers_view", "dealers_add", "dealers_edit",
				"dealers_franchises_add", "dealers_franchises_edit",

				// Recovery Officers
				"hr_recovery_officers_allocate",

				// Transactions
				"transactions_user_collections_view", "transactions_dealers_collections_view",
				"transactions_allocated_view", "transactions_bills_create",
				"transactions_types_view", "transactions_bad_debt_view",

				// Complaints
				"complaints_users_view", "complaints_allocated_view", "complaints_subjects_view",
				"complaints_report_view",

				// Messages
				"messages_new_view", "messages_other_view", "messages_draft_view",
				"messages_sent_view", "messages_expired_view", "messages_whatsapp_view",

				// Accounts
				"accounts_heads_view", "accounts_entry_view", "accounts_one_day_view",

				// Inventory
				"inventory_products_view", "inventory_purchase_view", "inventory_status_view",
				"inventory_product_types_view", "inventory_vendors_view", "inventory_brands_view",
				"inventory_unit_types_view",

				// Point of Sale
				"pos_sales_view",

				// HR Management
				"hr_view", "hr_staff_add", "hr_staff_edit",
				"hr_recovery_officers_add", "hr_recovery_officers_edit",
				"hr_salary_view", "hr_advances_view", "hr_attendance_day_view", "hr_attendance_user_view",

				// Reports
				"reports_view", "reports_sales_view", "reports_outstanding_payments_view",
				"reports_collections_view", "reports_users_defaulter", "reports_allocated_defaulters",
				"reports_new_users", "reports_monthly_collection_month_wise", "reports_month_wise_collection",
				"reports_unpaid_collection", "reports_allocated_collections", "reports_promise_date",
				"reports_user_collections", "reports_expiry_defaulters", "reports_month_defaulters",
				"reports_creator_summary", "reports_package_wise", "reports_deactivated_users",
				"reports_dealers_collection", "reports_dealers_defaulter",

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

				// Transactions
				"transactions_user_collections_view", "transactions_dealers_collections_view",
				"transactions_allocated_view",

				// Reports
				"reports_view", "reports_collections_view", "reports_user_collections",

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

				// Transactions
				"transactions_user_collections_view",

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
				"network_boxes_view",

				// Billing Management
				"billing_view", "billing_packages_add", "billing_packages_edit", "billing_packages_delete",
				"billing_invoices_add", "billing_invoices_edit", "billing_invoices_delete",
				"billing_payments_process",

				// Subscribers Management
				"subscribers_view", "subscribers_add", "subscribers_edit", "subscribers_delete",
				"subscribers_packages_view", "subscribers_inquiries_view", "subscribers_location_view",

				// Dealers Management
				"dealers_view", "dealers_add", "dealers_edit", "dealers_delete",
				"dealers_franchises_add", "dealers_franchises_edit", "dealers_franchises_delete",

				// Recovery Officers
				"hr_recovery_officers_allocate",

				// Transactions
				"transactions_user_collections_view", "transactions_dealers_collections_view",
				"transactions_allocated_view", "transactions_reprint", "transactions_bills_create",
				"transactions_types_view", "transactions_new_collection", "transactions_bad_debt_view",

				// Complaints
				"complaints_users_view", "complaints_allocated_view", "complaints_subjects_view",
				"complaints_types_view", "complaints_report_view",

				// Messages
				"messages_new_view", "messages_other_view", "messages_draft_view",
				"messages_sent_view", "messages_expired_view", "messages_whatsapp_view",

				// Accounts
				"accounts_heads_view", "accounts_entry_view", "accounts_one_day_view", "accounts_reports_view",

				// Inventory
				"inventory_products_view", "inventory_purchase_view", "inventory_status_view",
				"inventory_product_types_view", "inventory_vendors_view", "inventory_brands_view",
				"inventory_unit_types_view",

				// Point of Sale
				"pos_sales_view",

				// HR Management
				"hr_view", "hr_staff_add", "hr_staff_edit", "hr_staff_delete",
				"hr_recovery_officers_add", "hr_recovery_officers_edit", "hr_recovery_officers_delete",
				"hr_salary_view", "hr_advances_view", "hr_attendance_day_view", "hr_attendance_user_view",

				// Logs
				"logs_connections_view", "logs_deleted_collection_view", "logs_deleted_users_view",

				// Reports
				"reports_view", "reports_sales_view", "reports_stock_movement_view", "reports_outstanding_payments_view",
				"reports_collections_view", "reports_users_defaulter", "reports_allocated_defaulters",
				"reports_new_users", "reports_monthly_collection_month_wise", "reports_month_wise_collection",
				"reports_unpaid_collection", "reports_allocated_collections", "reports_promise_date",
				"reports_user_collections", "reports_expiry_defaulters", "reports_month_defaulters",
				"reports_collection_not_generated", "reports_creator_summary", "reports_package_wise",
				"reports_deactivated_users", "reports_dealer_invoices", "reports_new_dealers",
				"reports_dealers_collection", "reports_dealers_defaulter", "reports_abstract_stock",
				"reports_abstract_sales",

				// System Administration
				"system_view", "system_config", "system_logs", "system_backup",
				"system_user_rights", "system_change_password",

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
				"network_boxes_view",

				// Billing Management
				"billing_view", "billing_packages_add", "billing_packages_edit",
				"billing_invoices_add", "billing_invoices_edit", "billing_payments_process",

				// Subscribers Management
				"subscribers_view", "subscribers_add", "subscribers_edit", "subscribers_delete",
				"subscribers_packages_view", "subscribers_inquiries_view",

				// Dealers Management
				"dealers_view", "dealers_add", "dealers_edit",
				"dealers_franchises_add", "dealers_franchises_edit",

				// Recovery Officers
				"hr_recovery_officers_allocate",

				// Transactions
				"transactions_user_collections_view", "transactions_dealers_collections_view",
				"transactions_allocated_view", "transactions_bills_create",
				"transactions_types_view", "transactions_bad_debt_view",

				// Complaints
				"complaints_users_view", "complaints_allocated_view", "complaints_subjects_view",
				"complaints_report_view",

				// Messages
				"messages_new_view", "messages_other_view", "messages_draft_view",
				"messages_sent_view", "messages_expired_view", "messages_whatsapp_view",

				// Accounts
				"accounts_heads_view", "accounts_entry_view", "accounts_one_day_view",

				// Inventory
				"inventory_products_view", "inventory_purchase_view", "inventory_status_view",
				"inventory_product_types_view", "inventory_vendors_view", "inventory_brands_view",
				"inventory_unit_types_view",

				// Point of Sale
				"pos_sales_view",

				// HR Management
				"hr_view", "hr_staff_add", "hr_staff_edit",
				"hr_recovery_officers_add", "hr_recovery_officers_edit",
				"hr_salary_view", "hr_advances_view", "hr_attendance_day_view", "hr_attendance_user_view",

				// Reports
				"reports_view", "reports_sales_view", "reports_outstanding_payments_view",
				"reports_collections_view", "reports_users_defaulter", "reports_allocated_defaulters",
				"reports_new_users", "reports_monthly_collection_month_wise", "reports_month_wise_collection",
				"reports_unpaid_collection", "reports_allocated_collections", "reports_promise_date",
				"reports_user_collections", "reports_expiry_defaulters", "reports_month_defaulters",
				"reports_creator_summary", "reports_package_wise", "reports_deactivated_users",
				"reports_dealers_collection", "reports_dealers_defaulter",

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

				// Transactions
				"transactions_user_collections_view", "transactions_dealers_collections_view",
				"transactions_allocated_view",

				// Reports
				"reports_view", "reports_collections_view", "reports_user_collections",

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

				// Transactions
				"transactions_user_collections_view",

				// Reports
				"reports_view", "reports_sales_view",

				// Profile & Account
				"profile_manage", "password_change",
			},
		},
	}
}
