# OCLA Botanical — API Documentation

**Base URL:** `https://api.oclabotanicals.com` (production) / `http://localhost:5000` (local)

All responses follow a consistent envelope:

```json
{ "success": true, "data": { } }
{ "success": false, "message": "Reason for failure" }
```

---

## Authentication

Protected admin routes require a Bearer token in every request header:

```
Authorization: Bearer <token>
```

Tokens are issued by `POST /api/admin/login` and expire after **7 days** by default.

---

## Table of Contents

1. [Products](#1-products)
2. [Reviews](#2-reviews)
3. [Orders](#3-orders)
4. [Couriers](#4-couriers)
5. [Order Tracking](#5-order-tracking)
6. [Korapay Payments](#6-korapay-payments)
7. [Admin — Auth](#7-admin--auth)
8. [Admin — Product CRUD](#8-admin--product-crud)
9. [Admin — Media Upload](#9-admin--media-upload)
10. [Admin — Orders](#10-admin--orders)
11. [Admin — Currencies](#11-admin--currencies)
12. [Email Notifications](#12-email-notifications)
13. [Error Reference](#13-error-reference)

---

## 1. Products

### `GET /api/products`

Returns all products. Supports optional query filters.

**Query Parameters**

| Param      | Type     | Description                                             |
| ---------- | -------- | ------------------------------------------------------- |
| `category` | `string` | Filter by category name (e.g. `Carrier Oils`)           |
| `badge`    | `string` | Filter by badge: `Best Seller`, `New`, `Popular`        |
| `search`   | `string` | Case-insensitive search across `name` and `description` |

**Example Requests**

```
GET /api/products
GET /api/products?category=Carrier+Oils
GET /api/products?badge=Best+Seller
GET /api/products?search=shea
```

**Response `200`**

```json
{
  "success": true,
  "data": [
    {
      "_id": "fp1",
      "name": "OCLA Glow Body Butter",
      "category": "Finished Products",
      "badge": "Best Seller",
      "units": [
        { "label": "250ml", "price": 45, "weight": 0.3 },
        { "label": "500ml", "price": 80, "weight": 0.6 }
      ],
      "image": "https://ik.imagekit.io/c9rqojioo/fp1.jpg",
      "images": [],
      "video": null,
      "description": "...",
      "inci": "...",
      "grade": "Cosmetic Grade",
      "shelfLife": "12 months unopened",
      "storage": "...",
      "safety": "...",
      "usageInstructions": "...",
      "features": ["Deeply moisturising", "Non-greasy formula"],
      "ratingAverage": 4.8,
      "ratingCount": 24,
      "createdAt": "2026-05-10T00:00:00.000Z",
      "updatedAt": "2026-05-10T00:00:00.000Z"
    }
  ]
}
```

---

### `GET /api/products/categories`

Returns the distinct list of category names derived from all products in the database.

**Response `200`**

```json
{
  "success": true,
  "data": [
    "Finished Products",
    "Carrier Oils",
    "Essential Oils",
    "Butters",
    "Cacao"
  ]
}
```

---

### `GET /api/products/:id`

Returns a single product by its ID (e.g. `fp1`, `co2`).

**Response `200`** — same shape as a single item in the list above.

**Response `404`**

```json
{ "success": false, "message": "Product not found" }
```

---

## 2. Reviews

### `GET /api/products/:id/reviews`

Returns all reviews for a product, sorted newest first.

**Response `200`**

```json
{
  "success": true,
  "data": [
    {
      "_id": "664a1f...",
      "productId": "fp1",
      "name": "Amara O.",
      "rating": 5,
      "body": "Absolutely love this body butter!",
      "createdAt": "2026-05-09T14:22:00.000Z"
    }
  ]
}
```

---

### `POST /api/products/:id/reviews`

Submits a new review for a product. Also recomputes `ratingAverage` and `ratingCount` on the product.

**Request Body**

```json
{
  "name": "Amara O.",
  "rating": 5,
  "body": "Absolutely love this body butter!"
}
```

| Field    | Required | Rules            |
| -------- | -------- | ---------------- |
| `name`   | Yes      | Non-empty string |
| `rating` | Yes      | Integer, 1–5     |
| `body`   | Yes      | Non-empty string |

**Response `201`**

```json
{
  "success": true,
  "data": {
    "_id": "664a1f...",
    "productId": "fp1",
    "name": "Amara O.",
    "rating": 5,
    "body": "Absolutely love this body butter!",
    "createdAt": "2026-05-10T10:00:00.000Z"
  }
}
```

**Response `404`** — product not found  
**Response `400`** — missing/invalid fields

---

## 3. Orders

### `POST /api/orders`

Creates a new order. This is the checkout submission endpoint.

**What the backend does:**

1. Validates all fields
2. Looks up each product and confirms the unit label exists
3. Computes `lineTotal` per item, `subtotal`, `deliveryPrice`, and `grandTotal`
4. Generates a unique order number (`OCL-XXXXX`)
5. Computes `estimatedDelivery` (skips weekends)
6. Saves the order with status `processing`
7. Creates the first tracking event: _Order Placed_
8. Sends confirmation email to customer and alert email to admin
9. If `paymentMethod: "card"` — initializes a Korapay transaction and returns `checkoutUrl`

**NOTE:** Product prices are in **USD** (Base Currency).

**Request Body**

```json
{
  "contact": {
    "firstName": "Fatima",
    "lastName": "Bello",
    "email": "fatima@example.com",
    "phone": "08012345678"
  },
  "shippingAddress": {
    "address": "24 Kano Road",
    "address2": "Suite 3",
    "city": "Abuja",
    "state": "FCT",
    "postal": "900001",
    "country": "Nigeria"
  },
  "courierId": "rate_abc123",
  "paymentMethod": "card",
  "items": [
    {
      "productId": "fp1",
      "unitLabel": "250ml",
      "quantity": 2
    }
  ]
}
```

| Field                      | Required | Values                            |
| -------------------------- | -------- | --------------------------------- |
| `contact.firstName`        | Yes      | string                            |
| `contact.lastName`         | Yes      | string                            |
| `contact.email`            | Yes      | valid email                       |
| `contact.phone`            | Yes      | string                            |
| `shippingAddress.address`  | Yes      | string                            |
| `shippingAddress.city`     | Yes      | string                            |
| `shippingAddress.state`    | Yes      | string                            |
| `shippingAddress.country`  | Yes      | string                            |
| `shippingAddress.address2` | No       | string                            |
| `shippingAddress.postal`   | No       | string                            |
| `courierId`                | Yes      | ID from `/api/couriers/calculate` |
| `paymentMethod`            | Yes      | `bank` \| `korapay` \| `dodo`     |
| `items`                    | Yes      | non-empty array                   |
| `items[].productId`        | Yes      | must exist in DB                  |
| `items[].unitLabel`        | Yes      | must exist on that product        |
| `items[].quantity`         | Yes      | integer ≥ 1                       |

**Response `201` — Bank Payment**

```json
{
  "success": true,
  "data": {
    "orderNumber": "OCL-10001",
    "grandTotal": 92.5,
    "estimatedDelivery": "2026-05-19",
    "paymentMethod": "bank",
    "bankDetails": {
      "bank": "Zenith Bank",
      "accountName": "OCLA Botanical Ltd",
      "accountNo": "1234567890"
    }
  }
}
```

**Response `201` — Card Payment (Korapay)**

```json
{
  "success": true,
  "data": {
    "orderNumber": "OCL-10001",
    "grandTotal": 92.5,
    "estimatedDelivery": "2026-05-14",
    "paymentMethod": "korapay",
    "korapay": {
      "checkoutUrl": "https://checkout.korapay.com/abc123",
      "reference": "OCL-10001"
    }
  }
}
```

> Redirect the user to `korapay.checkoutUrl` to complete payment.

---

### `GET /api/orders/:orderNumber`

Fetch a full order document by its order number (e.g. `OCL-10001`).

**Response `200`** — full order object including `items`, `trackingEvents`, `shippingAddress`, etc.

**Response `404`** — order not found

---

### `GET /api/orders/:id/tracking`

Returns only the `trackingEvents` array for an order, looked up by MongoDB `_id`.

**Response `200`**

```json
{
  "success": true,
  "data": [
    {
      "status": "processing",
      "label": "Order Placed",
      "description": "Your order has been received and is being reviewed.",
      "timestamp": "2026-05-10T10:32:00.000Z"
    }
  ]
}
```

---

### `PATCH /api/orders/:id/status` 🔒

Admin endpoint — advances an order to a new status and appends a tracking event. Triggers shipping/delivery emails automatically.

**Request Body**

```json
{
  "status": "shipped",
  "carrier": "DHL Express",
  "label": "Shipped",
  "description": "Your order has been handed to DHL Express."
}
```

| Field         | Required | Values                                                                     |
| ------------- | -------- | -------------------------------------------------------------------------- |
| `status`      | Yes      | `processing` \| `packed` \| `shipped` \| `out_for_delivery` \| `delivered` |
| `carrier`     | No       | string — carrier name (e.g. `"DHL Express"`)                               |
| `label`       | No       | Overrides default label for the tracking event                             |
| `description` | No       | Overrides default description                                              |

**Email side-effects**

| Status      | Email sent to customer         |
| ----------- | ------------------------------ |
| `shipped`   | "Your order has shipped" email |
| `delivered` | "Order delivered" email        |

**Response `200`** — full updated order object

---

## 4. Couriers

### `GET /api/couriers`

Returns a list of all supported carrier services from **Terminal Africa**.

**Response `200`**

```json
{
  "success": true,
  "data": [
    {
      "id": "terminal_carrier_id",
      "name": "DHL Express",
      "logo": "https://...",
      "is_active": true
    }
  ]
}
```

---

### `POST /api/couriers/calculate`

Calculates real-time shipping quotes from **Terminal Africa** based on the weight of items and the delivery address.

**Request Body**

```json
{
  "items": [{ "productId": "fp1", "unitLabel": "250ml", "quantity": 2 }],
  "shippingAddress": {
    "address": "24 Kano Road",
    "city": "Abuja",
    "state": "FCT",
    "country": "Nigeria",
    "postal": "900001"
  }
}
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "totalWeight": 0.5,
    "rates": [
      {
        "_id": "rate_abc123",
        "name": "DHL Express",
        "description": "Express Shipping",
        "price": 12500,
        "estimatedDays": 3,
        "estimatedLabel": "Within 3 days",
        "carrier_logo": "https://..."
      }
    ]
  }
}
```

---

## 5. Order Tracking

### `GET /api/track/:orderNumber`

Public endpoint. Looks up an order by number and returns a complete, render-ready tracking timeline. If the order has been booked on **Terminal Africa**, it automatically merges live carrier updates into the timeline.

**Example:** `GET /api/track/OCL-10001`

**Response `400`** — if format is not `OCL-\d+`

**Response `200`**

```json
{
  "success": true,
  "data": {
    "orderNumber": "OCL-10001",
    "estimatedDelivery": "Monday, 19 May 2026",
    "carrier": "DHL Express",
    "origin": "Lagos",
    "destination": "24 Kano Road, Abuja, FCT",
    "status": "shipped",
    "events": [
      {
        "status": "processing",
        "label": "Order Placed",
        "description": "Your order has been received and is being reviewed.",
        "timestamp": "2026-05-10T10:32:00.000Z",
        "done": true,
        "active": false
      },
      {
        "status": "packed",
        "label": "Order Packed",
        "description": "Your order has been packed and is ready for dispatch.",
        "timestamp": "2026-05-11T09:00:00.000Z",
        "done": true,
        "active": false
      },
      {
        "status": "shipped",
        "label": "Shipped",
        "description": "Your order has been handed to the carrier.",
        "timestamp": "2026-05-12T08:15:00.000Z",
        "done": false,
        "active": true
      },
      {
        "status": "out_for_delivery",
        "label": "Out for Delivery",
        "description": "Your order is out for delivery.",
        "timestamp": null,
        "done": false,
        "active": false
      },
      {
        "status": "delivered",
        "label": "Delivered",
        "description": "Your order has been delivered successfully.",
        "timestamp": null,
        "done": false,
        "active": false
      }
    ]
  }
}
```

**Timeline rules:**

- `done: true` — status came before the current one
- `active: true` — this is the current status
- `done: false, active: false` — not yet reached
- `timestamp: null` — event has not occurred yet

---

## 6. Korapay Payments

### `POST /api/korapay/webhook`

Receives payment events from Korapay. **This endpoint is called by Korapay only** — do not call it from the frontend.

- Validates the `x-korapay-signature` header (HMAC-SHA256 of the request body using `KORAPAY_SECRET_KEY`)
- On `charge.success`, double-verifies with Korapay API, then sets `order.paymentStatus = "paid"`
- Responds `200` immediately (Korapay requires a fast acknowledgment)

> Register this URL in your Korapay dashboard under **Settings → Webhooks**.

---

### `GET /api/korapay/verify/:reference`

Called by the frontend after Korapay redirects the user back to your site. Verifies the transaction and marks the order as paid if confirmed.

**Example:** `GET /api/korapay/verify/OCL-10001`

**Response `200`**

```json
{
  "success": true,
  "data": {
    "reference": "OCL-10001",
    "amount": 12500,
    "status": "success",
    "orderNumber": "OCL-10001",
    "paidAt": "2026-05-10T10:45:00.000Z"
  }
}
```

**Response `402`** — payment not completed

```json
{
  "success": false,
  "message": "Payment not completed",
  "status": "abandoned"
}
```

---

## 7. Admin — Auth

### `POST /api/admin/login`

Authenticates an admin and returns a JWT token.

**Request Body**

```json
{
  "email": "admin@ocla.com",
  "password": "yourpassword"
}
```

**Response `200`**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "664a1f...",
      "email": "admin@ocla.com",
      "name": "OCLA Admin"
    }
  }
}
```

**Response `401`** — invalid credentials

---

### `GET /api/admin/me` 🔒

Returns the currently authenticated admin's info decoded from the token.

**Response `200`**

```json
{
  "success": true,
  "data": {
    "id": "664a1f...",
    "email": "admin@ocla.com",
    "name": "OCLA Admin"
  }
}
```

---

## 8. Admin — Product CRUD

### `POST /api/admin/products` 🔒

Creates a new product.

**Request Body**

```json
{
  "_id": "fp5",
  "name": "OCLA Whipped Shea Cream",
  "category": "Finished Products",
  "badge": "New",
  "units": [
    { "label": "150ml", "price": 35, "weight": 0.2 },
    { "label": "300ml", "price": 60, "weight": 0.4 }
  ],
  "image": "https://ik.imagekit.io/c9rqojioo/products/fp5-main.jpg",
  "images": ["https://ik.imagekit.io/c9rqojioo/products/fp5-2.jpg"],
  "video": "https://ik.imagekit.io/c9rqojioo/products/fp5-demo.mp4",
  "description": "A lightweight whipped shea cream...",
  "inci": "Butyrospermum Parkii (Shea) Butter, Aqua...",
  "grade": "Cosmetic Grade",
  "shelfLife": "12 months unopened",
  "storage": "Store in a cool, dry place.",
  "safety": "For external use only.",
  "usageInstructions": "Apply to cleansed skin and massage until absorbed.",
  "features": ["Lightweight", "Fast absorbing", "Vegan"]
}
```

| Field               | Required | Notes                                               |
| ------------------- | -------- | --------------------------------------------------- |
| `_id`               | Yes      | Unique string ID, e.g. `"fp5"`                      |
| `name`              | Yes      |                                                     |
| `category`          | Yes      | Free text — drives `/api/products/categories`       |
| `units`             | Yes      | Array of `{ label, price }`, min 1 item             |
| `image`             | Yes      | Primary image URL (upload via media endpoint first) |
| `description`       | Yes      |                                                     |
| `inci`              | Yes      |                                                     |
| `grade`             | Yes      |                                                     |
| `shelfLife`         | Yes      |                                                     |
| `storage`           | Yes      |                                                     |
| `safety`            | Yes      |                                                     |
| `usageInstructions` | Yes      |                                                     |
| `badge`             | No       | `"Best Seller"` \| `"New"` \| `"Popular"`           |
| `images`            | No       | Array of additional image URLs                      |
| `video`             | No       | Video URL                                           |
| `features`          | No       | Array of feature bullet strings                     |

**Response `201`** — full product object  
**Response `409`** — product with that `_id` already exists  
**Response `400`** — missing required fields or invalid units

---

### `PUT /api/admin/products/:id` 🔒

Updates any subset of product fields. Only the fields you send are changed.

**Example Request Body** (partial update)

```json
{
  "badge": "Best Seller",
  "units": [
    { "label": "150ml", "price": 3800 },
    { "label": "300ml", "price": 6500 }
  ]
}
```

**Updatable fields:** `name`, `category`, `units`, `image`, `images`, `video`, `badge`, `description`, `inci`, `grade`, `shelfLife`, `storage`, `safety`, `usageInstructions`, `features`

**Response `200`** — full updated product object  
**Response `404`** — product not found

---

### `DELETE /api/admin/products/:id` 🔒

Permanently deletes a product.

**Response `200`**

```json
{
  "success": true,
  "message": "Product \"OCLA Whipped Shea Cream\" deleted"
}
```

**Response `404`** — product not found

---

## 9. Admin — Media Upload

Upload images and videos to ImageKit before referencing their URLs in product fields.

### `POST /api/admin/media/upload` 🔒

Uploads a single file.

**Request** — `multipart/form-data`

| Field    | Type              | Notes                                              |
| -------- | ----------------- | -------------------------------------------------- |
| `file`   | file              | Image (JPG, PNG, WebP) or video (MP4). Max 100 MB. |
| `folder` | string (optional) | ImageKit folder path, e.g. `products`              |

**Response `200`**

```json
{
  "success": true,
  "data": {
    "url": "https://ik.imagekit.io/c9rqojioo/products/fp5-main.jpg",
    "fileId": "664a1f...",
    "name": "fp5-main.jpg",
    "size": 204800,
    "fileType": "image"
  }
}
```

---

### `POST /api/admin/media/upload/batch` 🔒

Uploads up to 10 files in a single request.

**Request** — `multipart/form-data`

| Field    | Type              | Notes                                |
| -------- | ----------------- | ------------------------------------ |
| `files`  | file[]            | Up to 10 files. Max 100 MB per file. |
| `folder` | string (optional) | ImageKit folder path                 |

**Response `200`**

```json
{
  "success": true,
  "data": [
    {
      "url": "https://ik.imagekit.io/c9rqojioo/products/img1.jpg",
      "fileId": "664a1f...",
      "name": "img1.jpg",
      "size": 102400,
      "fileType": "image"
    },
    {
      "url": "https://ik.imagekit.io/c9rqojioo/products/img2.jpg",
      "fileId": "664a20...",
      "name": "img2.jpg",
      "size": 98304,
      "fileType": "image"
    }
  ]
}
```

> **Workflow:** Upload media → copy the returned `url` → use it as `image`, `images[]`, or `video` when creating/updating a product.

---

## 10. Admin — Orders

### `GET /api/admin/orders` 🔒

Returns a paginated list of all orders, newest first.

**Query Parameters**

| Param    | Type   | Description                                                                        |
| -------- | ------ | ---------------------------------------------------------------------------------- |
| `status` | string | Filter: `processing` \| `packed` \| `shipped` \| `out_for_delivery` \| `delivered` |
| `page`   | number | Page number (default: `1`)                                                         |
| `limit`  | number | Results per page (default: `20`)                                                   |

**Response `200`**

```json
{
  "success": true,
  "data": [
    /* array of order objects */
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 143,
    "pages": 8
  }
}
```

> To update an order's status, use `PATCH /api/orders/:id/status` (see [Orders](#3-orders)).

---

## 11. Admin — Currencies

### `GET /api/admin/currencies` 🔒

Returns all supported currencies in the system.

### `POST /api/admin/currencies/sync` 🔒

Syncs real-time exchange rates for all active currencies from Korapay.

### `PATCH /api/admin/currencies/:code` 🔒

Toggle whether a currency is displayed on the website.

**Request Body**

```json
{
  "isActive": true
}
```

---

## 12. Email Notifications

Emails are sent automatically via **Resend**. No manual triggering is needed.

| Event                | Recipient | Subject                                |
| -------------------- | --------- | -------------------------------------- |
| Order placed         | Customer  | `Order Confirmed — OCL-XXXXX`          |
| Order placed         | Admin     | `New Order — OCL-XXXXX (₦12,500)`      |
| Status → `shipped`   | Customer  | `Your Order Has Shipped — OCL-XXXXX`   |
| Status → `delivered` | Customer  | `Delivered! Your OCLA Order OCL-XXXXX` |

All customer emails include:

- OCLA Botanical branded header
- Order number and item summary
- Grand total with delivery breakdown
- Estimated delivery date
- A tracking link to `{FRONTEND_URL}/track/{orderNumber}`

Bank transfer confirmation emails additionally include Zenith Bank account details.

---

## 13. Error Reference

All error responses follow this shape:

```json
{ "success": false, "message": "Human-readable description" }
```

| Status | Meaning                                                           |
| ------ | ----------------------------------------------------------------- |
| `400`  | Bad request — missing or invalid fields                           |
| `401`  | Unauthorized — missing, invalid, or expired token                 |
| `402`  | Payment required — Korapay payment not confirmed                  |
| `404`  | Resource not found                                                |
| `409`  | Conflict — e.g. duplicate product `_id`                           |
| `429`  | Too many requests — rate limit exceeded (100 req / 15 min per IP) |
| `500`  | Internal server error                                             |

---

## Environment Variables

| Variable                     | Required | Description                                                       |
| ---------------------------- | -------- | ----------------------------------------------------------------- |
| `PORT`                       | No       | Server port (default: `5000`)                                     |
| `MONGO_URI`                  | Yes      | MongoDB connection string                                         |
| `JWT_SECRET`                 | Yes      | Secret for signing admin JWTs                                     |
| `JWT_EXPIRES_IN`             | No       | Token expiry (default: `7d`)                                      |
| `RESEND_API_KEY`             | Yes      | Resend API key for emails                                         |
| `EMAIL_FROM`                 | Yes      | Sender address, e.g. `OCLA Botanical <orders@oclabotanicals.com>` |
| `ADMIN_EMAIL`                | Yes      | Admin email — receives new order alerts                           |
| `KORAPAY_SECRET_KEY`         | Yes      | Korapay secret key for payment and webhook verification           |
| `KORAPAY_PUBLIC_KEY`         | Yes      | Korapay public key                                                |
| `TERMINAL_AFRICA_SECRET_KEY` | Yes      | Terminal Africa secret key for shipping and tracking              |
| `IMAGEKIT_PUBLIC_KEY`        | Yes      | ImageKit public key                                               |
| `IMAGEKIT_PRIVATE_KEY`       | Yes      | ImageKit private key                                              |
| `IMAGEKIT_URL_ENDPOINT`      | Yes      | ImageKit endpoint, e.g. `https://ik.imagekit.io/c9rqojioo`        |
| `FRONTEND_URL`               | Yes      | Frontend base URL for tracking links in emails                    |
| `NODE_ENV`                   | No       | `development` or `production`                                     |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your real values

# 3. Seed the 19 products
npm run seed

# 4. Create the first admin account
npm run create-admin

# 5. Start the server
npm run dev        # development (auto-restart)
npm start          # production
```
