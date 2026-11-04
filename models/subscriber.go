package models

import (
	"math"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Package billing specifics
type Package struct {
	TenantModel
	PackageNumber int     `gorm:"not null;default:0" json:"packageNumber"`
	Name          string  `gorm:"type:varchar(100);not null" json:"name"`
	Speed         string  `gorm:"type:varchar(50)" json:"speed"`
	Price         float64 `gorm:"type:decimal(10,2);default:0" json:"price"`
	DataLimit     string  `gorm:"type:varchar(50)" json:"dataLimit"`
	CompanyName   string  `gorm:"type:varchar(255)" json:"companyName"`
	SalePrice     float64 `gorm:"type:decimal(10,2);default:0" json:"salePrice"`
	PurchasePrice float64 `gorm:"type:decimal(10,2);default:0" json:"purchasePrice"`
	PackageType   string  `gorm:"type:varchar(50);default:'Internet'" json:"packageType"`

	// previous holds the row as it was before an update so AfterUpdate can
	// compare it with the saved values. It is unexported so GORM and JSON skip it.
	previous *Package
}

// BeforeCreate hook to auto-increment PackageNumber per company
func (p *Package) BeforeCreate(tx *gorm.DB) error {
	var maxNumber int
	tx.Session(&gorm.Session{NewDB: true}).
		Model(&Package{}).
		Where("company_id = ?", p.CompanyID).
		Select("COALESCE(MAX(package_number), 0)").
		Scan(&maxNumber)
	p.PackageNumber = maxNumber + 1
	return nil
}

// BeforeUpdate keeps a copy of the stored package so AfterUpdate can tell what
// changed and which subscribers still carry the old name or fee.
func (p *Package) BeforeUpdate(tx *gorm.DB) error {
	var stored Package
	if err := tx.Session(&gorm.Session{NewDB: true}).
		First(&stored, "id = ?", p.ID).Error; err != nil {
		// Nothing to compare against, so there is nothing to propagate either.
		return nil
	}
	p.previous = &stored
	return nil
}

// AfterUpdate propagates catalog changes to the subscribers using the package.
//
// Connections keep their own copy of the package name and monthly fee, and Bill
// Creator reads that copy. Editing a package price therefore only changed the
// catalog and left every existing subscriber on the old fee, so they kept being
// billed (and shown) at the old amount. Saving a package now re-prices its
// subscribers and moves an open balance by the fee difference.
func (p *Package) AfterUpdate(tx *gorm.DB) error {
	if p.previous == nil {
		return nil
	}
	return syncConnectionsToPackage(tx, *p.previous, *p)
}

// effectivePackagePrice is the amount a subscriber is charged: the sale price
// when one is set, otherwise the list price.
func effectivePackagePrice(pkg Package) float64 {
	if pkg.SalePrice > 0 {
		return pkg.SalePrice
	}
	return pkg.Price
}

// discountedPackageAmount mirrors the subscriber form's discount rules so a
// propagated fee matches what the form would have saved for that discount.
func discountedPackageAmount(price float64, discount string) float64 {
	switch strings.ToLower(strings.TrimSpace(discount)) {
	case "quarter":
		return math.Round(price * 0.75)
	case "half":
		return math.Round(price * 0.50)
	case "full_free":
		return 0
	default:
		return price
	}
}

// isCustomDiscount reports whether the subscriber has a manually entered fee.
// Those must never be overwritten by a catalog price.
func isCustomDiscount(discount string) bool {
	return strings.EqualFold(strings.TrimSpace(discount), "custom")
}

// packageSides maps a package type to the connection fee columns it can price.
func packageSides(packageType string) (internet bool, cable bool) {
	t := strings.ToLower(strings.TrimSpace(packageType))
	switch {
	case strings.Contains(t, "both"):
		return true, true
	case strings.Contains(t, "internet"):
		return true, false
	case strings.Contains(t, "cable"), strings.Contains(t, "tv"):
		return false, true
	default:
		// Empty or unknown types may be linked from either side.
		return true, true
	}
}

func roundPackageMoney(value float64) float64 {
	return math.Round(value*100) / 100
}

// connectionMonthlyFee mirrors Bill Creator's rule so a balance is only moved
// by the fee that connection is actually charged.
func connectionMonthlyFee(connectionType string, amount, sameAmount float64) float64 {
	switch strings.ToLower(strings.TrimSpace(connectionType)) {
	case "internet":
		return sameAmount
	case "tv_cable":
		return amount
	default:
		return amount + sameAmount
	}
}

func packageBalanceStatus(remaining float64) string {
	switch {
	case remaining > 0:
		return "pending"
	case remaining < 0:
		return "advance"
	default:
		return ""
	}
}

// connectionCatalogFee is the monthly fee a connection would have for a package
// at the given catalog price, applying the connection's discounts to the sides
// that are linked to that package. A side priced by another package, and a
// custom price, keep the amount already stored on the connection.
func connectionCatalogFee(price float64, conn Connection, internet, cable bool) float64 {
	amount, sameAmount := conn.Amount, conn.SameAmount
	if internet && !isCustomDiscount(conn.SameDiscount) {
		sameAmount = roundPackageMoney(discountedPackageAmount(price, conn.SameDiscount))
	}
	if cable && !isCustomDiscount(conn.Discount) {
		amount = roundPackageMoney(discountedPackageAmount(price, conn.Discount))
	}
	return roundPackageMoney(connectionMonthlyFee(conn.ConnectionType, amount, sameAmount))
}

// reconciledPackageBalance decides whether a price change should move an
// outstanding balance.
//
// remaining_amount is a running balance: it can hold this month's fee plus
// older dues, a partial payment, or an advance, and those cannot be told apart
// from the number alone. Re-pricing the whole balance would rewrite older dues,
// so a balance is only moved when it is exactly one month at a fee we
// recognise: the fee stored on the connection, or the previous catalog fee
// (the connection may already have been re-priced by an earlier save while the
// balance was left behind). Anything else is left untouched, so Bill Creator
// can keep adding each new month on top of what is already owed.
func reconciledPackageBalance(remaining, storedFee, previousCatalogFee, newFee float64) (float64, bool) {
	remaining = roundPackageMoney(remaining)
	storedFee = roundPackageMoney(storedFee)
	previousCatalogFee = roundPackageMoney(previousCatalogFee)
	newFee = roundPackageMoney(newFee)

	if remaining <= 0 || remaining == newFee {
		return 0, false
	}
	if remaining != storedFee && remaining != previousCatalogFee {
		return 0, false
	}
	return newFee, true
}

// syncConnectionsToPackage re-prices every connection that references the
// package and renames the reference when the package itself was renamed.
//
// The monthly fee is the subscriber's bill, so a balance that is exactly one
// month at the old fee is moved to the new fee. This keeps the Package and
// Remaining sections equal for a subscriber who simply has not paid this month.
// Balances made up of older dues, partial payments, advances or zero are left
// untouched, so a package save never rewrites money from earlier months.
// Custom-priced connections are skipped.
func syncConnectionsToPackage(tx *gorm.DB, previous, current Package) error {
	// A package without a previous name cannot be matched to connections safely.
	if previous.Name == "" {
		return nil
	}

	price := roundPackageMoney(effectivePackagePrice(current))
	oldPrice := roundPackageMoney(effectivePackagePrice(previous))
	nameChanged := previous.Name != current.Name

	oldInternet, oldCable := packageSides(previous.PackageType)
	newInternet, newCable := packageSides(current.PackageType)
	// Include the previous sides so a package type change still updates the
	// connections that were linked under the old type.
	internet := oldInternet || newInternet
	cable := oldCable || newCable

	query := tx.Session(&gorm.Session{NewDB: true}).
		Model(&Connection{}).
		Where("company_id = ?", current.CompanyID)
	switch {
	case internet && cable:
		query = query.Where("package_internet = ? OR package_cable = ?", previous.Name, previous.Name)
	case internet:
		query = query.Where("package_internet = ?", previous.Name)
	case cable:
		query = query.Where("package_cable = ?", previous.Name)
	default:
		return nil
	}

	var connections []Connection
	if err := query.Find(&connections).Error; err != nil {
		return err
	}

	for i := range connections {
		conn := connections[i]
		updates := map[string]interface{}{}
		newAmount := conn.Amount
		newSameAmount := conn.SameAmount
		priceInternet := internet && conn.PackageInternet == previous.Name
		priceCable := cable && conn.PackageCable == previous.Name

		if priceInternet {
			if nameChanged {
				updates["package_internet"] = current.Name
			}
			// The package is the source of truth: also re-price connections that
			// are still on an older fee even when this particular save did not
			// change the price. That makes saving a package a safe repair step.
			if !isCustomDiscount(conn.SameDiscount) {
				newSameAmount = roundPackageMoney(discountedPackageAmount(price, conn.SameDiscount))
				if roundPackageMoney(conn.SameAmount) != newSameAmount {
					updates["same_amount"] = newSameAmount
				}
			}
		}

		if priceCable {
			if nameChanged {
				updates["package_cable"] = current.Name
			}
			if !isCustomDiscount(conn.Discount) {
				newAmount = roundPackageMoney(discountedPackageAmount(price, conn.Discount))
				if roundPackageMoney(conn.Amount) != newAmount {
					updates["amount"] = newAmount
				}
			}
		}

		oldFee := roundPackageMoney(connectionMonthlyFee(conn.ConnectionType, conn.Amount, conn.SameAmount))
		newFee := roundPackageMoney(connectionMonthlyFee(conn.ConnectionType, newAmount, newSameAmount))
		// The connection may already have been re-priced by an earlier save while
		// the balance stayed at the old catalog fee, so recognise that fee as a
		// one-month balance as well. Otherwise a subscriber stuck at 1800/1100
		// would never be repaired by simply saving the package again.
		previousCatalogFee := connectionCatalogFee(oldPrice, conn, priceInternet, priceCable)

		if newRemaining, changed := reconciledPackageBalance(conn.RemainingAmount, oldFee, previousCatalogFee, newFee); changed {
			updates["remaining_amount"] = newRemaining
			updates["payment_status"] = packageBalanceStatus(newRemaining)
		}

		if len(updates) == 0 {
			continue
		}

		if err := tx.Session(&gorm.Session{NewDB: true}).
			Model(&Connection{}).
			Where("id = ? AND company_id = ?", conn.ID, current.CompanyID).
			Updates(updates).Error; err != nil {
			return err
		}
	}

	return nil
}

// Subscriber is the main entity linked geographically and technically
type Subscriber struct {
	TenantModel
	// company_id is part of the composite unique key so subscriber identities
	// only need to be unique within a company, not across companies.
	CompanyID           uuid.UUID `gorm:"type:uuid;index;not null;uniqueIndex:idx_subscribers_company_identity,priority:1" json:"companyId"`
	SubscriberIdentity  string    `gorm:"type:varchar(100);uniqueIndex:idx_subscribers_company_identity,priority:2" json:"subscriber_identity"`
	Name                string    `gorm:"type:varchar(255);not null" json:"name"`
	Cnic                string    `gorm:"type:varchar(20);not null" json:"cnic"`
	Phone               string    `gorm:"type:varchar(20);not null" json:"phone"`
	InstallationAddress string    `gorm:"type:text;not null" json:"installationAddress"`

	PackageID   uuid.UUID `gorm:"type:uuid;not null;index" json:"packageId"`
	PackageName string    `gorm:"type:varchar(100)" json:"packageName"`

	// Billing
	BillingCycle string  `gorm:"type:varchar(20);not null" json:"billingCycle"`
	Status       string  `gorm:"type:varchar(20);not null;default:'active'" json:"status"`
	Balance      float64 `gorm:"type:decimal(10,2);default:0" json:"balance"`

	// Network mapping
	AreaID   uuid.UUID `gorm:"type:uuid;not null;index" json:"areaId"`
	AreaName string    `gorm:"type:varchar(255)" json:"areaName"`

	// Enforcing specific port per splitter via composite unique index
	SplitterID   uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_splitter_port" json:"splitterId"`
	SplitterPort int       `gorm:"not null;uniqueIndex:idx_splitter_port" json:"splitterPort"`

	ConnectionDate string `gorm:"type:varchar(50)" json:"connectionDate"`

	// External ties
	DealerID    *uuid.UUID `gorm:"type:uuid" json:"dealerId"`
	CollectorID *uuid.UUID `gorm:"type:uuid" json:"collectorId"`

	// Relationships
	Package  Package  `gorm:"foreignKey:PackageID" json:"package"`
	Area     Area     `gorm:"foreignKey:AreaID" json:"area"`
	Splitter Splitter `gorm:"foreignKey:SplitterID" json:"splitter"`
}

// Inquiry handling pre-sales
type Inquiry struct {
	TenantModel
	Name               string     `gorm:"type:varchar(255);not null" json:"name"`
	InternetID         string     `gorm:"type:varchar(100)" json:"internetId"`
	Cell               string     `gorm:"type:varchar(20)" json:"cell"`
	Mobile             string     `gorm:"type:varchar(20)" json:"mobile"`
	Address            string     `gorm:"type:text;not null" json:"address"`
	InstallationAmount float64    `gorm:"type:decimal(10,2);default:0" json:"installationAmount"`
	OtherAmount        float64    `gorm:"type:decimal(10,2);default:0" json:"otherAmount"`
	InstallationDate   string     `gorm:"type:varchar(50)" json:"installationDate"`
	RechargeDate       string     `gorm:"type:varchar(50)" json:"rechargeDate"`
	SubLocality        string     `gorm:"type:varchar(100)" json:"subLocality"`
	ConnectionType     string     `gorm:"type:varchar(50)" json:"connectionType"`
	BoxNumber          string     `gorm:"type:varchar(50)" json:"boxNumber"`
	PackageCable       string     `gorm:"type:varchar(100)" json:"packageCable"`
	Discount           float64    `gorm:"type:decimal(10,2);default:0" json:"discount"`
	Amount             float64    `gorm:"type:decimal(10,2);default:0" json:"amount"`
	Comments           string     `gorm:"type:text" json:"comments"`
	Status             string     `gorm:"type:varchar(20);default:'new'" json:"status"`
	AssignedToID       *uuid.UUID `gorm:"type:uuid" json:"assignedToId"`
	Notes              string     `gorm:"type:text" json:"notes"`
}

// CorporateCustomer specialized billing
type CorporateCustomer struct {
	TenantModel
	CustomerID        string `gorm:"type:varchar(100)" json:"customerId"`
	CompanyName       string `gorm:"type:varchar(255);not null" json:"companyName"`
	ContactPerson     string `gorm:"type:varchar(255);not null" json:"contactPerson"`
	ContactPhone      string `gorm:"type:varchar(20);not null" json:"contactPhone"`
	NegotiatedPricing string `gorm:"type:text" json:"negotiatedPricing"`
	ContractStartDate string `gorm:"type:varchar(50);not null" json:"contractStartDate"`
	ContractEndDate   string `gorm:"type:varchar(50);not null" json:"contractEndDate"`
	TotalConnections  int    `gorm:"not null" json:"totalConnections"`
}
