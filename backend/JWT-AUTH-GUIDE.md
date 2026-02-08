# 🔐 JWT Authentication Implementation

> **Status**: ✅ Completed  
> **Date**: February 8, 2026

---

## 📋 Overview

ระบบ Smart Farm ใช้ **JWT (JSON Web Token)** Authentication เพื่อความปลอดภัยและเป็นมาตรฐาน

### ✨ Features

- ✅ JWT Token-based authentication
- ✅ Password hashing with bcrypt
- ✅ Role-Based Access Control (RBAC)
- ✅ Token auto-refresh
- ✅ Secure API endpoints

---

## 🚀 Quick Start

### 1. ติดตั้ง Dependencies

```bash
cd backend
npm install
```

Dependencies ที่เพิ่มใหม่:
- `jsonwebtoken` - สำหรับสร้างและ verify JWT tokens
- `bcrypt` - สำหรับ hash passwords
- `@types/jsonwebtoken` - TypeScript types
- `@types/bcrypt` - TypeScript types

### 2. ตั้งค่า Environment Variables

แก้ไขไฟล์ `.env` ใน backend:

```env
# JWT Authentication
JWT_SECRET=smart-farm-secret-key-change-in-production
JWT_EXPIRES_IN=24h
```

⚠️ **สำคัญ**: เปลี่ยน `JWT_SECRET` ในสภาพแวดล้อม Production!

### 3. Run Database Migration และ Seed

```bash
npm run db:migrate
npm run db:seed
```

### 4. เริ่ม Backend Server

```bash
npm run dev
```

### 5. เริ่ม Frontend

```bash
cd ../frontend
npm run dev
```

---

## 👥 Demo Users

Seed script จะสร้าง demo users อัตโนมัติ:

| Username | Password | Role | Permissions |
|----------|----------|------|-------------|
| `demo` | `demo123` | USER | View dashboard, View sensor data |
| `manager` | `demo123` | MANAGER | + Manage stations, Manage sensors |
| `admin` | `demo123` | SUPER_USER | + Configure thresholds, Manage users |

---

## 🔧 Technical Implementation

### Backend

#### 1. Auth Utilities (`src/utils/auth.ts`)

```typescript
// Generate JWT token
generateToken(payload: JwtPayload): string

// Verify JWT token
verifyToken(token: string): JwtPayload | null

// Hash password
hashPassword(password: string): Promise<string>

// Compare password
comparePassword(password: string, hashedPassword: string): Promise<boolean>
```

#### 2. Auth Routes (`src/routes/auth.ts`)

```
POST /api/auth/login
  - รับ username และ password
  - ตรวจสอบจาก database
  - คืน { user, token }

POST /api/auth/logout
  - ลบ token (client-side)

GET /api/auth/me
  - ดึงข้อมูล user จาก token
```

#### 3. JWT Middleware (`src/middleware/auth.ts`)

```typescript
// Require authentication
authenticateToken(req, res, next)

// Require specific role
requireRole(...roles: UserRole[])

// Optional authentication
optionalAuth(req, res, next)
```

#### 4. Protected Routes Example

```typescript
import { authenticateToken, requireRole } from '../middleware/auth.js';

// Protected route - requires login
router.get('/stations', authenticateToken, getStations);

// Role-specific route - requires SUPER_USER
router.post('/users', 
  authenticateToken, 
  requireRole('SUPER_USER'), 
  createUser
);
```

### Frontend

#### 1. API Configuration (`src/lib/apiConfig.ts`)

```typescript
// Automatic token management
apiConfig.setToken(token)    // Save token
apiConfig.getToken()          // Get token
apiConfig.removeToken()       // Remove token
apiConfig.getHeaders()        // Get headers with token
```

#### 2. API Functions (`src/lib/apiReal.ts`)

```typescript
// Login
const response = await login(username, password);
// Returns: { success, data: { user, token } }

// Auto-attach token to all requests
const stations = await getStations();
```

#### 3. AuthContext (`src/contexts/AuthContext.tsx`)

```typescript
const { user, login, logout, hasPermission } = useAuth();

// Login
await login(username, password);

// Check permission
if (hasPermission('manage_station')) {
  // Show management UI
}

// Logout
logout();
```

---

## 🔒 Security Features

### 1. Password Security
- ✅ Passwords hashed with **bcrypt** (10 salt rounds)
- ✅ ไม่เก็บ plain text passwords
- ✅ Hash ใหม่ทุกครั้งที่เปลี่ยน password

### 2. Token Security
- ✅ JWT signed with secret key
- ✅ Token expiration (default: 24 hours)
- ✅ Token verification ทุก request
- ✅ Invalid/expired tokens ถูกปฏิเสธ

### 3. API Security
- ✅ Protected endpoints require valid token
- ✅ Role-based access control
- ✅ Error messages ไม่เปิดเผยข้อมูลที่อ่อนไหว

---

## 📡 API Flow

### Login Flow

```
1. User sends username + password
   ↓
2. Backend verifies credentials
   ↓
3. Backend generates JWT token
   ↓
4. Frontend receives { user, token }
   ↓
5. Frontend stores token in localStorage
   ↓
6. Frontend attaches token to all API requests
```

### Protected API Request Flow

```
1. Frontend calls API with token in header
   Authorization: Bearer <token>
   ↓
2. Backend middleware verifies token
   ↓
3. If valid → attach user to request → continue
   ↓
4. If invalid → return 401/403 error
```

---

## 🧪 Testing

### Test Login API

```bash
# Login as demo user
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"demo123"}'

# Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Test Protected Endpoint

```bash
# Get stations (requires token)
curl http://localhost:3001/api/stations \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test Invalid Token

```bash
# Try with invalid token
curl http://localhost:3001/api/stations \
  -H "Authorization: Bearer invalid_token"

# Response:
{
  "success": false,
  "error": "Invalid or expired token"
}
```

---

## 🐛 Troubleshooting

### 1. "Invalid or expired token"

**สาเหตุ:**
- Token หมดอายุ (> 24 hours)
- Token ไม่ถูกต้อง
- JWT_SECRET ไม่ตรงกัน

**แก้ไข:**
- Login ใหม่เพื่อได้ token ใหม่
- ตรวจสอบ JWT_SECRET ใน .env

### 2. "Invalid username or password"

**สาเหตุ:**
- Username หรือ Password ผิด
- User ไม่มีใน database

**แก้ไข:**
- ตรวจสอบ credentials
- Run `npm run db:seed` เพื่อสร้าง demo users

### 3. CORS Error

**สาเหตุ:**
- Frontend และ Backend อยู่คนละ origin
- CORS_ORIGIN ไม่ตรง

**แก้ไข:**
- ตั้งค่า `CORS_ORIGIN=http://localhost:5173` ใน backend .env

---

## 📝 Next Steps

### สำหรับ Production

- [ ] เปลี่ยน JWT_SECRET เป็น random string ที่ปลอดภัย
- [ ] ใช้ HTTPS สำหรับ API
- [ ] Implement token refresh mechanism
- [ ] Add token blacklist สำหรับ logout
- [ ] Add rate limiting
- [ ] Add 2FA (optional)

### Features เพิ่มเติม

- [ ] Password reset ผ่าน email
- [ ] Remember me checkbox
- [ ] Session timeout warning
- [ ] Login history tracking

---

## 📚 References

- [JWT Official](https://jwt.io/)
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js)
- [Project Documentation](../docs/)

---

**Created by**: Smart Farm Development Team  
**Last Updated**: February 8, 2026  
**Version**: 1.0.0
