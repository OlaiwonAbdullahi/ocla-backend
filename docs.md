# OCLA Botanical — Backend Requirements

> Extracted from frontend codebase. All fields, models, flows, and constants the backend must implement.

---

## 1. DATA MODELS

### 1.1 Category

`Category will be extracted from the inputs of admin when adding products so we will need an endpoint to get all categories

### 1.2 Product

| Field               | Type                                             | Notes                                  |
| ------------------- | ------------------------------------------------ | -------------------------------------- |
| `id`                | `string`                                         | e.g. `"fp1"`, `"co2"`                  |
| `name`              | `string`                                         | Full product name                      |
| `category`          | `Category`                                       | One of the 5 categories above          |
| `units`             | `ProductUnit[]`                                  | Available sizes/quantities with prices |
| `image`             | `string`                                         | Primary image URL                      |
| `images`            | `string[]` (optional)                            | Gallery image URLs                     |
| `video`             | `string` (optional)                              | Product video URL                      |
| `badge`             | `"Best Seller" \| "New" \| "Popular"` (optional) | Display badge                          |
| `description`       | `string`                                         | Product description                    |
| `inci`              | `string`                                         | INCI ingredient list                   |
| `grade`             | `string`                                         | Grade/certification                    |
| `shelfLife`         | `string`                                         | e.g. `"12 months unopened"`            |
| `storage`           | `string`                                         | Storage instructions                   |
| `safety`            | `string`                                         | Safety warnings                        |
| `usageInstructions` | `string`                                         | How to use (per category)              |
| `features`          | `string[]`                                       | Key feature bullet points              |

#### ProductUnit (nested)

| Field    | Type     | Notes                                   |
| -------- | -------- | --------------------------------------- |
| `label`  | `string` | e.g. `"250ml"`, `"500g"`, `"10ml"`      |
| `price`  | `number` | Price in US Dollars ($) - Base Currency |
| `weight` | `number` | Weight in Kilograms (kg)                |

---

### 1.3 User / Customer

| Field       | Type       | Notes            |
| ----------- | ---------- | ---------------- |
| `id`        | `string`   | UUID             |
| `firstName` | `string`   | Required         |
| `lastName`  | `string`   | Required         |
| `email`     | `string`   | Required, unique |
| `phone`     | `string`   | Required         |
| `createdAt` | `datetime` |                  |
| `updatedAt` | `datetime` |                  |

---

### 1.4 Address

| Field      | Type                | Notes                         |
| ---------- | ------------------- | ----------------------------- |
| `id`       | `string`            | UUID                          |
| `userId`   | `string`            | FK → User                     |
| `address`  | `string`            | Address Line 1, required      |
| `address2` | `string` (optional) | Address Line 2                |
| `city`     | `string`            | Required                      |
| `state`    | `string`            | Required                      |
| `postal`   | `string` (optional) | Postal code                   |
| `country`  | `string`            | Required, default `"Nigeria"` |

#### Supported Countries (dropdown options)

```
Nigeria, Ghana, Kenya, South Africa,
United Kingdom, United States, Canada, UAE, Saudi Arabia, Other
```

---

### 1.5 Order

| Field               | Type                              | Notes                                  |
| ------------------- | --------------------------------- | -------------------------------------- |
| `id`                | `string`                          | UUID                                   |
| `orderNumber`       | `string`                          | Format: `OCL-XXXXX` (e.g. `OCL-10042`) |
| `userId`            | `string` (optional)               | FK → User (null for guest)             |
| `items`             | `OrderItem[]`                     | Ordered products                       |
| `status`            | `OrderStatus`                     | See enum below                         |
| `courierId`         | `string`                          | ID from Terminal Africa                |
| `deliveryPrice`     | `number`                          | $                                      |
| `subtotal`          | `number`                          | $ (items only)                         |
| `grandTotal`        | `number`                          | $ (subtotal + deliveryPrice)           |
| `paymentMethod`     | `"bank" \| "korapay" \| "dodo"`   |                                        |
| `paymentStatus`     | `"pending" \| "paid" \| "failed"` |                                        |
| `shippingAddress`   | `Address`                         | Embedded or FK                         |
| `contactFirstName`  | `string`                          |                                        |
| `contactLastName`   | `string`                          |                                        |
| `contactEmail`      | `string`                          |                                        |
| `contactPhone`      | `string`                          |                                        |
| `estimatedDelivery` | `date`                            | Computed from delivery method          |
| `carrier`           | `string` (optional)               | e.g. `"DHL Express"`                   |
| `createdAt`         | `datetime`                        |                                        |
| `updatedAt`         | `datetime`                        |                                        |

#### OrderStatus Enum

```
processing → packed → shipped → out_for_delivery → delivered
```

---

### 1.6 OrderItem (nested in Order)

| Field         | Type     | Notes                      |
| ------------- | -------- | -------------------------- |
| `id`          | `string` | UUID                       |
| `orderId`     | `string` | FK → Order                 |
| `productId`   | `string` | FK → Product               |
| `productName` | `string` | Snapshot at time of order  |
| `unitLabel`   | `string` | e.g. `"500ml"`             |
| `unitPrice`   | `number` | $ (snapshot at order time) |
| `quantity`    | `number` | min: 1                     |
| `lineTotal`   | `number` | unitPrice × quantity ($)   |

---

### 1.7 TrackingEvent

| Field         | Type          | Notes                              |
| ------------- | ------------- | ---------------------------------- |
| `id`          | `string`      | UUID                               |
| `orderId`     | `string`      | FK → Order                         |
| `status`      | `OrderStatus` |                                    |
| `label`       | `string`      | e.g. `"Order Placed"`, `"Shipped"` |
| `description` | `string`      | Event detail text                  |
| `timestamp`   | `datetime`    | When this event occurred           |

---

### 1.8 Review

| Field       | Type                | Notes                                    |
| ----------- | ------------------- | ---------------------------------------- |
| `id`        | `string`            | UUID                                     |
| `productId` | `string`            | FK → Product                             |
| `userId`    | `string` (optional) | FK → User (nullable for guests)          |
| `name`      | `string`            | Reviewer display name, e.g. `"Amara O."` |
| `rating`    | `integer`           | 1–5                                      |
| `body`      | `string`            | Review text                              |
| `createdAt` | `datetime`          |                                          |

---

## 2. API ENDPOINTS

### Products

| Method | Endpoint                          | Description                                |
| ------ | --------------------------------- | ------------------------------------------ |
| `GET`  | `/api/products`                   | List all products (supports filter/search) |
| `GET`  | `/api/products/:id`               | Single product detail                      |
| `GET`  | `/api/products?category=finished` | Filter by category                         |
| `GET`  | `/api/products?search=shea`       | Search by name/description                 |
| `GET`  | `/api/products?badge=Best+Seller` | Filter by badge                            |

**Query Params for `/api/products`:**

| Param      | Type       | Notes                     |
| ---------- | ---------- | ------------------------- |
| `category` | `Category` | Filter by category        |
| `search`   | `string`   | Search name + description |
| `badge`    | `string`   | Filter by badge value     |

---

### Orders

| Method  | Endpoint                   | Description                              |
| ------- | -------------------------- | ---------------------------------------- |
| `POST`  | `/api/orders`              | Create a new order (checkout submission) |
| `GET`   | `/api/orders/:orderNumber` | Get order by order number (for tracking) |
| `GET`   | `/api/orders/:id/tracking` | Get tracking events for an order         |
| `PATCH` | `/api/orders/:id/status`   | Update order status (admin)              |

**POST `/api/orders` — Request Body:**

```json
{
  "contact": {
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "phone": "string"
  },
  "shippingAddress": {
    "address": "string",
    "address2": "string | null",
    "city": "string",
    "state": "string",
    "postal": "string | null",
    "country": "string"
  },
  "deliveryMethod": "ID from /api/couriers/calculate",
  "paymentMethod": "bank | korapay | dodo",
  "items": [
    {
      "productId": "string",
      "unitLabel": "string",
      "quantity": "number"
    }
  ]
}
```

**POST `/api/orders` — Response:**

```json
{
  "orderNumber": "OCL-XXXXX",
  "grandTotal": 92.5,
  "estimatedDelivery": "2026-05-14",
  "paymentMethod": "korapay",
  "korapay": {
    "checkoutUrl": "https://...",
    "reference": "OCL-XXXXX"
  }
}
```

---

### Reviews

| Method | Endpoint                    | Description                |
| ------ | --------------------------- | -------------------------- |
| `GET`  | `/api/products/:id/reviews` | List reviews for a product |
| `POST` | `/api/products/:id/reviews` | Submit a new review        |

**POST `/api/products/:id/reviews` — Request Body:**

```json
{
  "name": "string",
  "rating": 5,
  "body": "string"
}
```

---

### Tracking

| Method | Endpoint                  | Description                                          |
| ------ | ------------------------- | ---------------------------------------------------- |
| `GET`  | `/api/track/:orderNumber` | Look up order by number and return tracking timeline |

**Response:**

```json
{
  "orderNumber": "OCL-10042",
  "estimatedDelivery": "May 14, 2026",
  "carrier": "DHL Express",
  "origin": "Lagos",
  "destination": "24 Kano Road, Abuja",
  "events": [
    {
      "status": "processing",
      "label": "Order Placed",
      "description": "Your order has been received and is being reviewed.",
      "timestamp": "2026-05-09T10:32:00Z",
      "done": true,
      "active": false
    }
  ]
}
```

---

## 3. CHECKOUT FLOW (Step-by-Step)

```
[Step 1] INFORMATION
  Client sends: firstName, lastName, email, phone
  Validation: all required

[Step 2] SHIPPING ADDRESS
  Client sends: address, city, state, country (required)
               address2, postal (optional)
  Validation: address, city, state, country required

[Step 3] DELIVERY METHOD
  Client selects from rates returned by Terminal Africa:
    - POST /api/couriers/calculate (sends cart items + address)
    - Returns dynamic rates based on weight and destination

[Step 4] PAYMENT METHOD
  Client selects one of:
    - bank    → display bank details (Zenith Bank / OCLA Botanical Ltd / 1234567890)
    - korapay → Card Payment (Visa, Mastercard, Verve) via Korapay
    - dodo    → International Payment via Dodo Payments

[Step 5] PLACE ORDER
  POST /api/orders with all collected data
  Backend:
    1. Validate all fields
    2. Compute lineTotal per item (USD)
    3. Verify dynamic shipping rate from Terminal Africa
    4. Compute subtotal and grandTotal (USD)
    5. Generate orderNumber (OCL-XXXXX)
    6. Compute estimatedDelivery date from carrier ETA
    7. Save order (status = "processing")
    8. Create first TrackingEvent { status: "processing", label: "Order Placed" }
    9. Send order confirmation email to customer
    10. Return orderNumber + payment details (Korapay URL if selected)

[Step 6] ORDER CONFIRMATION (frontend)
  Show success screen with orderNumber
  If bank payment: show bank details for manual transfer
  If card: trigger payment gateway redirect/modal
```

---

## 4. ORDER TRACKING FLOW

```
User enters order number (format: OCL-XXXXX)
→ GET /api/track/:orderNumber
→ Backend looks up order
→ Returns full tracking timeline in chronological order

Tracking statuses (in order):
  1. processing     → Order Placed & Reviewed
  2. packed         → Order Packed & Ready for Dispatch
  3. shipped        → Handed to Carrier
  4. out_for_delivery → Out for Delivery
  5. delivered      → Delivered

Frontend renders a step timeline:
  - completed steps = green check
  - active step     = highlighted
  - pending steps   = grey
```

---

## 5. DELIVERY OPTIONS

Shipping rates are dynamic and fetched from **Terminal Africa**. Pricing is based on:

- Total weight of items in the cart
- Destination address (State and City)
- Carrier selected by the user

Call `POST /api/couriers/calculate` to get real-time rates.

---

## 6. PAYMENT OPTIONS

| ID        | Label         | Description                       |
| --------- | ------------- | --------------------------------- |
| `bank`    | Bank Transfer | Manual transfer to Zenith Bank    |
| `korapay` | Card Payment  | Visa, Mastercard, Verve (Korapay) |
| `dodo`    | International | PayPal, Card, Apple Pay (Dodo)    |

**Bank Details:**

```
Bank:           Zenith Bank
Account Name:   OCLA Botanical Ltd
Account Number: 1234567890
```

---

## 7. REVIEW SYSTEM FLOW

```
User opens product page → views existing reviews
User fills review form:
  - name    (text, required)
  - rating  (1–5 stars, required, default: 5)
  - body    (textarea, required)

POST /api/products/:id/reviews
Backend:
  1. Validate fields
  2. Save review
  3. Recompute product rating average
  4. Return saved review

Frontend appends review to list and shows confirmation.
```

---

## 8. PRODUCT CATALOG SUMMARY

| Category          | Count  | ID Prefix   | Price Range ($) |
| ----------------- | ------ | ----------- | --------------- |
| Finished Products | 4      | `fp1`–`fp4` | 22.00–105.00    |
| Carrier Oils      | 4      | `co1`–`co4` | 15.00–140.00    |
| Essential Oils    | 4      | `eo1`–`eo4` | 7.00–35.00      |
| Butters           | 4      | `bt1`–`bt4` | 20.00–115.00    |
| Cacao             | 3      | `ca1`–`ca3` | 20.00–120.00    |
| **Total**         | **19** |             |                 |

**Best Sellers:** `fp1`, `co1`, `eo2`, `bt1`, `ca1`

---

## 9. VALIDATION RULES SUMMARY

| Field                    | Rule                                       |
| ------------------------ | ------------------------------------------ |
| `firstName`, `lastName`  | required, string                           |
| `email`                  | required, valid email format               |
| `phone`                  | required, string                           |
| `address`                | required, string                           |
| `city`                   | required, string                           |
| `state`                  | required, string                           |
| `country`                | required, one of supported country list    |
| `address2`, `postal`     | optional                                   |
| `courierId`              | required, ID from Terminal Africa          |
| `paymentMethod`          | required, one of `bank \| korapay \| dodo` |
| `items`                  | required, non-empty array                  |
| `items[].productId`      | required, must exist in products table     |
| `items[].unitLabel`      | required, must exist in product's units    |
| `items[].quantity`       | required, integer, min: 1                  |
| `review.rating`          | required, integer 1–5                      |
| `review.name`            | required, string                           |
| `review.body`            | required, string                           |
| `orderNumber` (tracking) | required, format `OCL-\d+`                 |

---

## 10. EMAIL NOTIFICATIONS (recommended)

| Trigger         | Recipient | Content                                                        |
| --------------- | --------- | -------------------------------------------------------------- |
| Order placed    | Customer  | Order number, items, total, delivery ETA, payment instructions |
| Order shipped   | Customer  | Carrier name, tracking link                                    |
| Order delivered | Customer  | Delivery confirmation                                          |
| New order       | Admin     | Order details                                                  |

---
