# New Implementation Steps

---

## PHASE 1 — PRODUCTS PAGE ADDITIONS

Goal: Extend the existing products system to support product units and prepare it for vendor purchase tracking.

### Tasks:

1. ✅ Add a **Unit Type field** to products.
   * Allowed values:
     * piece
     * meter
   * Implement as a dropdown in product form.

2. ✅ Product Type already exists, so do NOT recreate it.

3. ✅ Update **products database schema** to include:
   * unit_type ENUM('piece','meter')

4. ✅ Update **Products Create/Edit UI**:
   * Add a Unit Type select field.
   * Show options:
     * Per Piece
     * Per Meter

5. ✅ Implement logic:
   * If unit_type = piece → quantities represent item count.
   * If unit_type = meter → quantities represent length in meters.

6. ✅ Update:
   * backend API
   * product validation
   * database migration
   * product listing table to display unit type.

7. ✅ Ensure all existing product CRUD operations support the new field.

---

## PHASE 2 — VENDORS MANAGEMENT PAGE

Goal: Implement a complete vendor management module.

### Create a new route/page:
* `/vendors`

### Features required:

#### Vendor CRUD:
* ✅ Create Vendor
* ✅ List Vendors
* ✅ Edit Vendor
* ✅ Delete Vendor
* ✅ View Vendor Details

#### Vendor database table:
* **vendors**
  * ✅ id (primary key)
  * ✅ name
  * ✅ contact_person
  * ✅ phone
  * ✅ email
  * ✅ address
  * ✅ created_at
  * ✅ updated_at
  * ✅ company_id

#### Backend requirements:
Create REST APIs:
* ✅ GET /api/vendors
* ✅ GET /api/vendors/:id
* ✅ POST /api/vendors
* ✅ PUT /api/vendors/:id
* ✅ DELETE /api/vendors/:id

#### Frontend requirements:
Vendor page UI must include:
1. ✅ Vendors table with columns:
   * ✅ Vendor Name
   * ✅ Contact Person
   * ✅ Phone
   * ✅ Email
   * ✅ Actions (Edit/Delete)

2. ✅ Vendor Form modal/page:
   * ✅ name (required)
   * ✅ contact_person
   * ✅ phone
   * ✅ email
   * ✅ address

3. ✅ Search functionality for vendors.

4. ✅ Proper validation and error handling.

---

## PHASE 3 — VENDOR INVOICES MANAGEMENT

Goal: Track purchases from vendors and add inventory through vendor invoices.

### Create a new page:
* `/vendor-invoices`

### Database tables:
* **vendor_invoices**
  * ✅ id
  * ✅ vendor_id
  * ✅ invoice_number
  * ✅ invoice_date
  * ✅ total_amount
  * ✅ created_at
  * ✅ company_id

* **vendor_invoice_items**
  * ✅ id
  * ✅ invoice_id
  * ✅ product_id
  * ✅ quantity
  * ✅ unit_price
  * ✅ unit_type
  * ✅ subtotal

### Relationships:
* ✅ vendor_invoices.vendor_id → vendors.id
* ✅ vendor_invoice_items.invoice_id → vendor_invoices.id
* ✅ vendor_invoice_items.product_id → products.id

### Backend APIs:
* ✅ GET /api/vendor-invoices
* ✅ GET /api/vendor-invoices/:id
* ✅ POST /api/vendor-invoices
* ✅ PUT /api/vendor-invoices/:id
* ✅ DELETE /api/vendor-invoices/:id
* ✅ GET /api/vendor-invoices?vendor_id=&date_from=&date_to=

### Invoice logic:
1. ✅ When creating an invoice:
   * ✅ Select vendor
   * ✅ Add multiple products
   * ✅ Enter quantity and unit price
   * ✅ Unit type should automatically come from the product.

2. ✅ Calculate:
   * ✅ subtotal = quantity × unit_price
   * ✅ total_amount = sum of all subtotals

### Frontend UI requirements:

#### Vendor Invoices Page:
Table columns:
* ✅ Invoice Number
* ✅ Vendor
* ✅ Invoice Date
* ✅ Total Amount
* ✅ Actions

Filters:
* ✅ Filter by Vendor
* ✅ Filter by Date Range
* ✅ Search by Invoice Number

#### Create/Edit Invoice Form:
Fields:
* ✅ Vendor dropdown
* ✅ Invoice Number
* ✅ Invoice Date
* ✅ Products list table

#### Invoice product row:
* ✅ Product select
* ✅ Unit Type (auto-filled)
* ✅ Quantity
* ✅ Unit Price
* ✅ Subtotal (auto calculated)

* ✅ Allow adding multiple products to the invoice.

---

## ADDITIONAL REQUIREMENTS

1. ✅ Follow consistent API patterns already used in the project.

2. ✅ Implement clean modular structure:
   * ✅ controllers
   * ✅ services
   * ✅ routes
   * ✅ models

3. ✅ Ensure frontend uses reusable components where possible.

4. ✅ Add loading states and proper error handling.

5. ✅ Ensure database migrations are created for new tables and columns.

6. ✅ Update navigation sidebar to include:
   * ✅ Vendors
   * ✅ Vendor Invoices

---

### Progress Tracking:
*Each completed task will be marked with ✅*
