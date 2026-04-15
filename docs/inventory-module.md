# Inventory Management Module

## Backend
- Migrations: `014_inventory_items.sql`, `015_inventory_valuation.sql`
- API routes under `/api/v1/inventory`
- Auth scopes:
  - read: `inventory:read`
  - write: `inventory:write`
- Movement posting:
  - Receipt: Dr 1400 / Cr 1600
  - Issue: Dr 5000 / Cr 1400
  - Adjustment: signed quantity, requires `reason_code`, writes immutable `transaction_log`

## Endpoints
- `POST /inventory/items`
- `GET /inventory/items`
- `GET /inventory/items/:id`
- `PATCH /inventory/items/:id`
- `POST /inventory/receipts`
- `POST /inventory/issues`
- `POST /inventory/adjustments`
- `GET /inventory/valuation?as_of=YYYY-MM-DD`
- `GET /inventory/movements?item_id=&from=&to=`

## Frontend
- Sidebar includes Inventory navigation (`/inventory`)
- Inventory page: item CRUD-lite, receipt/issue/adjustment forms, valuation tab, movement history tab
