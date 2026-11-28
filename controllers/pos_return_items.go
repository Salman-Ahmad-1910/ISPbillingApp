package controllers

import (
	"errors"
	"strconv"
	"strings"
	"time"

	"awesomeProject/config"
	"awesomeProject/models"
	"awesomeProject/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Partial (item) returns of a POS sale.
//
//	POST /pos/sales/:id/return-items   { items: [{ saleItemId, quantity }] }
//	GET  /pos/sales/:id/returns        return history of a sale
//
// The existing POST /pos/sales/:id/return (whole sale) is unchanged.
//
// Only the selected pieces go back to stock (same restore logic as a full
// return). The sale keeps the rest: line quantities are reduced (a line whose
// every piece came back is removed), the totals are reduced by the returned
// amount and a SaleReturn record keeps what was returned. The sale stays
// "completed" while items remain and becomes "returned" when the last item
// comes back. Promise sales are not changed here: they keep the full return.

type returnItemRequest struct {
	SaleItemID string `json:"saleItemId"`
	Quantity   int    `json:"quantity"`
}

type returnItemsRequest struct {
	Items []returnItemRequest `json:"items"`
}

// errReturnInput is a validation problem reported to the user as HTTP 400.
type errReturnInput struct{ msg string }

func (e *errReturnInput) Error() string { return e.msg }

func posCompanyID(c *gin.Context) (uuid.UUID, bool) {
	v, ok := c.Get("companyID")
	if !ok {
		return uuid.Nil, false
	}
	id, ok := v.(uuid.UUID)
	return id, ok
}

// ReturnPOSSaleItems - POST /pos/sales/:id/return-items
func ReturnPOSSaleItems(c *gin.Context) {
	companyID, ok := posCompanyID(c)
	if !ok {
		utils.ErrorResponse(c, 400, "Company ID is required", nil)
		return
	}
	saleID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid sale id", nil)
		return
	}
	var req returnItemsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, 400, "Invalid return request", err.Error())
		return
	}
	if len(req.Items) == 0 {
		utils.ErrorResponse(c, 400, "Select at least one item to return", nil)
		return
	}

	// Who is returning (the POS routes may run without a logged-in user).
	var returnedByID *uuid.UUID
	returnedByName := ""
	if v, ok := c.Get("userID"); ok {
		if uid, ok := v.(uuid.UUID); ok {
			returnedByID = &uid
			var u models.User
			if config.DB.Select("name").First(&u, "id = ?", uid).Error == nil {
				returnedByName = u.Name
			}
		}
	}

	var saleReturn models.SaleReturn
	var updated models.Sale

	err = config.DB.Transaction(func(tx *gorm.DB) error {
		// Lock the sale so two returns of the same sale cannot run at once.
		var sale models.Sale
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Scopes(models.TenantScope(companyID)).
			Where("id = ?", saleID).First(&sale).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return &errReturnInput{"Sale not found"}
			}
			return err
		}
		var items []models.SaleItem
		if err := tx.Where("sale_id = ?", sale.ID).Order("created_at asc").Find(&items).Error; err != nil {
			return err
		}

		switch {
		case sale.Status == "returned":
			return &errReturnInput{"This sale has already been returned."}
		case sale.Status == "hold":
			return &errReturnInput{"A hold bill cannot be returned. Delete the hold bill instead."}
		case sale.Status == "replaced":
			return &errReturnInput{"A replaced sale cannot be returned."}
		case sale.IsInstallment:
			return &errReturnInput{"Installment sales must be managed through their installment plan."}
		case sale.PromisePayment || sale.SaleType == models.SaleTypeFiberJointing:
			return &errReturnInput{"This entry has no products to return."}
		}
		var promiseCount int64
		if err := tx.Model(&models.POSPromise{}).
			Where("company_id = ? AND sale_id = ?", companyID, sale.ID).
			Count(&promiseCount).Error; err != nil {
			return err
		}
		if promiseCount > 0 {
			return &errReturnInput{"Sales on promise can only be returned in full."}
		}

		byID := make(map[uuid.UUID]*models.SaleItem, len(items))
		itemsSubtotal := 0.0
		for i := range items {
			byID[items[i].ID] = &items[i]
			itemsSubtotal += items[i].Price * float64(items[i].Quantity)
		}

		// Validate and merge the requested lines.
		wanted := map[uuid.UUID]int{}
		order := []uuid.UUID{}
		for _, r := range req.Items {
			id, err := uuid.Parse(strings.TrimSpace(r.SaleItemID))
			if err != nil {
				return &errReturnInput{"Invalid item in the return"}
			}
			item, found := byID[id]
			if !found {
				return &errReturnInput{"An item does not belong to this sale"}
			}
			if r.Quantity < 1 {
				return &errReturnInput{"Return quantity must be at least 1 for " + item.ProductName}
			}
			if _, seen := wanted[id]; !seen {
				order = append(order, id)
			}
			wanted[id] += r.Quantity
			if wanted[id] > item.Quantity {
				return &errReturnInput{"Cannot return more " + item.ProductName + " than were sold"}
			}
		}

		// Restore stock and build the return record.
		returnSale := models.Sale{}
		subtotal, taxTotal := 0.0, 0.0
		saleReturn = models.SaleReturn{
			SaleID:         sale.ID,
			ReturnDate:     time.Now().Format(time.RFC3339),
			ReturnedByID:   returnedByID,
			ReturnedByName: returnedByName,
		}
		saleReturn.CompanyID = companyID

		for _, id := range order {
			item := byID[id]
			qty := wanted[id]
			sns := parsePOSsoldSNs(item.SerialNumber, item.Quantity)
			if len(sns) > 0 && qty != item.Quantity {
				// A line carrying serial numbers is returned whole, so we
				// always know exactly which units came back.
				return &errReturnInput{item.ProductName + " has serial numbers and must be returned whole (all " +
					strconv.Itoa(item.Quantity) + " pieces of that line)"}
			}
			restore := models.SaleItem{ProductID: item.ProductID, Quantity: qty}
			if len(sns) > 0 {
				restore.SerialNumber = item.SerialNumber
			}
			returnSale.Items = append(returnSale.Items, restore)

			amount := roundPOSMoney(item.Price * float64(qty))
			tax := roundPOSMoney(amount * item.TaxPercent / 100)
			subtotal += amount
			taxTotal += tax
			saleReturn.Items = append(saleReturn.Items, models.SaleReturnItem{
				TenantModel:  models.TenantModel{CompanyID: companyID},
				SaleItemID:   item.ID,
				ProductID:    item.ProductID,
				ProductName:  item.ProductName,
				Quantity:     qty,
				Price:        item.Price,
				TaxPercent:   item.TaxPercent,
				TaxAmount:    tax,
				Amount:       amount,
				SerialNumber: restore.SerialNumber,
				Model:        item.Model,
			})
		}
		if err := revertSaleStock(tx, companyID, returnSale); err != nil {
			return err
		}

		// The sale discount is shared out by value, so returning half the
		// goods takes back half the discount.
		discountShare := 0.0
		if sale.Discount > 0 && itemsSubtotal > 0 {
			discountShare = roundPOSMoney(sale.Discount * subtotal / itemsSubtotal)
			if discountShare > sale.Discount {
				discountShare = sale.Discount
			}
		}
		saleReturn.Subtotal = roundPOSMoney(subtotal)
		saleReturn.TaxAmount = roundPOSMoney(taxTotal)
		saleReturn.Discount = discountShare
		saleReturn.TotalAmount = roundPOSMoney(subtotal + taxTotal - discountShare)

		// Reduce / remove the returned lines.
		remainingLines := 0
		for i := range items {
			item := &items[i]
			qty := wanted[item.ID]
			if qty == 0 {
				remainingLines++
				continue
			}
			if qty == item.Quantity {
				if err := tx.Delete(&models.SaleItem{}, "id = ?", item.ID).Error; err != nil {
					return err
				}
				continue
			}
			remainingLines++
			left := item.Quantity - qty
			ratio := float64(left) / float64(item.Quantity)
			if err := tx.Model(&models.SaleItem{}).Where("id = ?", item.ID).Updates(map[string]interface{}{
				"quantity": left,
				"sale_tax": roundPOSMoney(item.SaleTax * ratio),
				"wth_tax":  roundPOSMoney(item.WthTax * ratio),
			}).Error; err != nil {
				return err
			}
		}

		newTotal := roundPOSMoney(sale.TotalAmount - saleReturn.TotalAmount)
		if newTotal < 0 {
			newTotal = 0
		}
		newTax := roundPOSMoney(sale.TaxAmount - saleReturn.TaxAmount)
		if newTax < 0 {
			newTax = 0
		}
		saleUpdates := map[string]interface{}{
			"total_amount":    newTotal,
			"tax_amount":      newTax,
			"discount":        roundPOSMoney(sale.Discount - discountShare),
			"returned_amount": roundPOSMoney(sale.ReturnedAmount + saleReturn.TotalAmount),
		}
		if remainingLines == 0 {
			saleUpdates["status"] = "returned"
		}
		if err := tx.Model(&models.Sale{}).Where("id = ?", sale.ID).Updates(saleUpdates).Error; err != nil {
			return err
		}
		if err := tx.Create(&saleReturn).Error; err != nil {
			return err
		}
		return tx.Scopes(models.TenantScope(companyID)).Preload("Items").First(&updated, "id = ?", sale.ID).Error
	})

	var inputErr *errReturnInput
	if errors.As(err, &inputErr) {
		utils.ErrorResponse(c, 400, inputErr.msg, inputErr.msg)
		return
	}
	if err != nil {
		utils.ErrorResponse(c, 500, "Failed to return the items", err.Error())
		return
	}
	utils.SuccessResponse(c, "Items returned, stock restored", gin.H{"sale": updated, "return": saleReturn})
}

// GetPOSSaleReturns - GET /pos/sales/:id/returns
func GetPOSSaleReturns(c *gin.Context) {
	companyID, ok := posCompanyID(c)
	if !ok {
		utils.ErrorResponse(c, 400, "Company ID is required", nil)
		return
	}
	saleID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		utils.ErrorResponse(c, 400, "Invalid sale id", nil)
		return
	}
	returns := []models.SaleReturn{}
	if err := config.DB.Scopes(models.TenantScope(companyID)).
		Where("sale_id = ?", saleID).Preload("Items").
		Order("created_at desc").Find(&returns).Error; err != nil {
		utils.ErrorResponse(c, 500, "Failed to load returns", err.Error())
		return
	}
	utils.SuccessResponse(c, "Returns", returns)
}
