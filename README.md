# QuickBite — Food Delivery App

## Features
- 🍕 Browse 8 restaurants with real food images
- 🛒 Add to cart, update quantities
- 💳 Checkout with COD / UPI / Card
- 📦 Real-time order tracking
- 👨‍🍳 Admin panel — manage orders, restaurants, menu
- ⭐ Customer reviews and ratings
- 📱 Fully responsive mobile design

## Setup

### 1. Database
```bash
mysql -u root -p
source database/schema.sql
exit
```

### 2. Configure .env
Edit `backend/.env` — set DB_PASSWORD to your MySQL password

### 3. Install & Run
```bash
cd backend
npm install
node fix-password.js
npm start
```

### 4. Open Browser
```
http://localhost:3000
```

## Login Accounts (password: admin123)
| Role     | Email                  |
|----------|------------------------|
| Admin    | admin@quickbite.com    |
| Customer | john@email.com         |
| Customer | sarah@email.com        |
