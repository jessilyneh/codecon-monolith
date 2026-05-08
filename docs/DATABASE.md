# Database Schema Documentation

## Overview

The Codecon Monolith uses a MySQL database with 7 core tables managing users, products, orders, payments, card authorizations, and fraud detection.

## Tables

### 1. users
Stores user account information and authentication credentials.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(36) | PRIMARY KEY | Unique user identifier (UUID) |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email address |
| password | VARCHAR(255) | NOT NULL | Hashed password (bcryptjs) |
| name | VARCHAR(255) | NOT NULL | User's full name |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Account creation timestamp |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: email

**Sample Data**:
```sql
INSERT INTO users VALUES (
  'user-001',
  'demo@example.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36P4/qKu',
  'Demo User',
  NOW(),
  NOW()
);
```

---

### 2. products
Stores product catalog information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(36) | PRIMARY KEY | Unique product identifier (UUID) |
| name | VARCHAR(255) | NOT NULL | Product name |
| description | TEXT | - | Product description |
| category | VARCHAR(100) | - | Product category |
| price | DECIMAL(10, 2) | NOT NULL | Product price in BRL |
| stock | INT | DEFAULT 0 | Available stock quantity |
| image_url | VARCHAR(500) | - | URL to product image |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Product creation timestamp |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: category, price

**Sample Data**:
```sql
INSERT INTO products VALUES (
  'prod-001',
  'Laptop',
  'High-performance laptop for professionals',
  'Electronics',
  1200.00,
  15,
  'https://via.placeholder.com/300x300?text=Laptop',
  NOW(),
  NOW()
);
```

---

### 3. orders
Stores customer orders and their status.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(36) | PRIMARY KEY | Unique order identifier (UUID) |
| user_id | VARCHAR(36) | FOREIGN KEY | Reference to users table |
| total_amount | DECIMAL(10, 2) | NOT NULL | Total order amount |
| status | VARCHAR(50) | DEFAULT 'pending' | Order status: pending, processing, completed, failed |
| payment_method | VARCHAR(50) | - | Payment method: pix, boleto, credit_card |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Order creation timestamp |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: user_id, status

**Foreign Keys**: user_id → users.id

---

### 4. order_items
Stores individual items in each order (line items).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(36) | PRIMARY KEY | Unique order item identifier (UUID) |
| order_id | VARCHAR(36) | FOREIGN KEY | Reference to orders table |
| product_id | VARCHAR(36) | FOREIGN KEY | Reference to products table |
| quantity | INT | NOT NULL | Quantity ordered |
| unit_price | DECIMAL(10, 2) | NOT NULL | Price per unit at time of order |
| subtotal | DECIMAL(10, 2) | NOT NULL | quantity × unit_price |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Item creation timestamp |

**Indexes**: order_id, product_id

**Foreign Keys**: 
- order_id → orders.id
- product_id → products.id

---

### 5. payments
Stores payment transaction details and status.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(36) | PRIMARY KEY | Unique payment identifier (UUID) |
| order_id | VARCHAR(36) | FOREIGN KEY | Reference to orders table |
| payment_method | VARCHAR(50) | NOT NULL | pix, boleto, or credit_card |
| amount | DECIMAL(10, 2) | NOT NULL | Payment amount |
| status | VARCHAR(50) | DEFAULT 'pending' | pending, approved, declined, failed |
| pix_key | VARCHAR(255) | - | PIX key for PIX payments |
| pix_qr_code | LONGTEXT | - | QR code data for PIX payments |
| boleto_code | VARCHAR(100) | - | Boleto registration number |
| boleto_barcode | VARCHAR(255) | - | Boleto barcode |
| boleto_due_date | DATE | - | Boleto payment due date |
| card_last_4 | VARCHAR(4) | - | Last 4 digits of credit card |
| card_auth_id | VARCHAR(36) | - | Reference to card authorization |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Payment creation timestamp |
| updated_at | TIMESTAMP | ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |

**Indexes**: order_id, status, payment_method

**Foreign Keys**: order_id → orders.id

---

### 6. card_authorizations
Stores credit card authorization requests and responses.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(36) | PRIMARY KEY | Unique authorization identifier (UUID) |
| card_last_4 | VARCHAR(4) | NOT NULL | Last 4 digits of card |
| card_holder | VARCHAR(255) | NOT NULL | Cardholder name |
| amount | DECIMAL(10, 2) | NOT NULL | Authorization amount |
| status | VARCHAR(50) | NOT NULL | approved, declined, pending |
| auth_code | VARCHAR(50) | - | Authorization code if approved |
| reason | VARCHAR(255) | - | Decline reason if declined |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Authorization timestamp |

**Indexes**: status, card_holder

---

### 7. fraud_logs
Stores fraud analysis results for transactions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | VARCHAR(36) | PRIMARY KEY | Unique fraud check identifier (UUID) |
| user_id | VARCHAR(36) | FOREIGN KEY | Reference to users table |
| payment_id | VARCHAR(36) | FOREIGN KEY | Reference to payments table |
| fraud_score | DECIMAL(5, 2) | NOT NULL | Fraud score 0-100 |
| risk_level | VARCHAR(50) | NOT NULL | low, medium, high, critical |
| flagged | BOOLEAN | DEFAULT FALSE | Whether transaction is flagged |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Analysis timestamp |

**Indexes**: user_id, risk_level, flagged

**Foreign Keys**:
- user_id → users.id
- payment_id → payments.id

---

## Common Queries

### Get user's orders with items
```sql
SELECT 
  o.id, 
  o.total_amount, 
  o.status,
  GROUP_CONCAT(p.name) as products
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.user_id = 'user-001'
GROUP BY o.id
ORDER BY o.created_at DESC;
```

### Get payment statistics
```sql
SELECT 
  payment_method,
  COUNT(*) as total,
  SUM(amount) as revenue,
  AVG(amount) as average
FROM payments
WHERE status = 'approved'
GROUP BY payment_method;
```

### Get fraud statistics
```sql
SELECT 
  risk_level,
  COUNT(*) as count,
  ROUND(AVG(fraud_score), 2) as avg_score
FROM fraud_logs
GROUP BY risk_level;
```

### Get low stock products
```sql
SELECT id, name, stock
FROM products
WHERE stock < 10
ORDER BY stock ASC;
```

### Get user's recent transactions
```sql
SELECT 
  p.id,
  p.payment_method,
  p.amount,
  p.status,
  p.created_at
FROM payments p
JOIN orders o ON p.order_id = o.id
WHERE o.user_id = 'user-001'
ORDER BY p.created_at DESC
LIMIT 10;
```

---

## Relationships

```
users (1) ──→ (∞) orders
users (1) ──→ (∞) fraud_logs

orders (1) ──→ (∞) order_items
orders (1) ──�� (∞) payments

products (1) ──→ (∞) order_items

payments (1) ← (1) card_authorizations
payments (∞) ← (1) fraud_logs
```

---

## Database Setup

### Create Database
```sql
CREATE DATABASE codecon_db;
USE codecon_db;
```

### Import Schema
```bash
mysql -u root -p codecon_db < backend/database/schema.sql
```

### Verify Tables
```sql
SHOW TABLES;
```

Expected output:
```
+---------------------+
| Tables_in_codecon_db|
+---------------------+
| card_authorizations |
| fraud_logs          |
| order_items         |
| orders              |
| payments            |
| products            |
| users               |
+---------------------+
```

---

## Performance Considerations

1. **Indexes**: All foreign keys and commonly searched fields are indexed for fast queries
2. **Connection Pooling**: Backend uses MySQL2 connection pool for efficiency
3. **Data Types**: Chosen for balance between storage and query performance
4. **Normalization**: Schema follows 3NF for data integrity

---

## Backup and Recovery

### Backup Database
```bash
mysqldump -u root -p codecon_db > backup.sql
```

### Restore Database
```bash
mysql -u root -p codecon_db < backup.sql
```

---

## Security Considerations

- Passwords stored with bcryptjs hashing
- Sensitive payment data (full card numbers) never stored
- All queries use prepared statements (parameterized queries)
- Foreign key constraints ensure referential integrity
- Timestamps for audit trail
