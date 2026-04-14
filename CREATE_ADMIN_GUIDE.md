# How to Create an Admin User

You need an admin user to manage problems, approve submissions, and create contests. Here are 3 ways to create one:

---

## 🚀 Method 1: Using Script (Easiest)

### Run the Admin Creation Script

```bash
cd backend
node create-admin.js
```

**Follow the prompts:**
```
Username: admin
Email: admin@codecourt.com
Password: admin123
```

**Output:**
```
✅ Admin user created successfully!

📊 Admin Details:
   ID: 507f1f77bcf86cd799439011
   Username: admin
   Email: admin@codecourt.com
   Role: admin
```

**Done!** You now have an admin account! 🎉

---

## 🎯 Method 2: Using API (Register + Upgrade)

### Step 1: Register a Normal User

**Endpoint:** `POST http://localhost:5000/api/auth/register`

**Body:**
```json
{
  "username": "admin",
  "email": "admin@codecourt.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "admin",
    "email": "admin@codecourt.com",
    "role": "contestant"  ← Default role
  }
}
```

### Step 2: Upgrade to Admin Role

**Using MongoDB Shell:**

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/codecourt

# Upgrade user to admin
db.users.updateOne(
  { email: "admin@codecourt.com" },
  { $set: { role: "admin" } }
)

# Verify
db.users.findOne({ email: "admin@codecourt.com" })
```

**Output:**
```javascript
{
  _id: ObjectId("507f1f77bcf86cd799439011"),
  username: 'admin',
  email: 'admin@codecourt.com',
  role: 'admin',  ← Now admin!
  createdAt: ISODate("2024-01-15T10:00:00.000Z")
}
```

---

## 🛠️ Method 3: Direct MongoDB Insert

### Using MongoDB Shell

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27017/codecourt

# Hash password first (bcrypt with cost 10)
# For password "admin123", the hash is:
# $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

# Insert admin user directly
db.users.insertOne({
  username: "admin",
  email: "admin@codecourt.com",
  passwordHash: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
  role: "admin",
  createdAt: new Date(),
  updatedAt: new Date()
})
```

**⚠️ Warning:** This uses a pre-hashed password. For security, use Method 1 or 2 instead.

---

## ✅ Verify Admin User

### Check in MongoDB

```bash
mongosh mongodb://localhost:27017/codecourt
db.users.find({ role: "admin" }).pretty()
```

### Test Login via API

**Endpoint:** `POST http://localhost:5000/api/auth/login`

**Body:**
```json
{
  "email": "admin@codecourt.com",
  "password": "admin123"
}
```

**Expected Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "admin",
    "email": "admin@codecourt.com",
    "role": "admin"  ← Verify this is "admin"
  }
}
```

**Save the `accessToken`** - you'll need it for all admin operations!

---

## 🎯 What Can Admin Users Do?

Admin users have special permissions:

| Action | Endpoint | Admin Only |
|--------|----------|------------|
| **Create problems** | POST /api/problems | ✅ Yes (or problem_setter) |
| **Approve problems** | POST /api/problems/:id/approve | ✅ Yes |
| **Reject problems** | POST /api/problems/:id/reject | ✅ Yes |
| **Upload test cases** | POST /api/problems/:id/upload-tests | ✅ Yes (or author) |
| **Create contests** | POST /api/contests | ✅ Yes (or problem_setter) |
| **Manage users** | Various user endpoints | ✅ Yes |

---

## 🔐 User Roles Explained

Your platform has 3 roles:

### 1. **contestant** (Default)
- Can view published problems
- Can submit solutions
- Can participate in contests
- **Cannot** create or manage problems

### 2. **problem_setter**
- All contestant permissions
- Can create problems
- Can upload test cases
- Can create contests
- **Cannot** approve/reject problems (needs admin)

### 3. **admin** (Highest)
- All problem_setter permissions
- Can approve/reject problems
- Can manage all users
- Full system access

---

## 🔄 Change User Role

### Upgrade User to Admin

```bash
mongosh mongodb://localhost:27017/codecourt

db.users.updateOne(
  { email: "user@example.com" },
  { $set: { role: "admin" } }
)
```

### Upgrade User to Problem Setter

```bash
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { role: "problem_setter" } }
)
```

### Downgrade User to Contestant

```bash
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { role: "contestant" } }
)
```

---

## 🐛 Troubleshooting

### "User already exists"
**Check existing users:**
```bash
mongosh mongodb://localhost:27017/codecourt
db.users.find({}, { username: 1, email: 1, role: 1 }).pretty()
```

**Delete user if needed:**
```bash
db.users.deleteOne({ email: "admin@codecourt.com" })
```

### "Cannot connect to MongoDB"
**Check if MongoDB is running:**
```bash
# Check Docker containers
docker ps

# Or check local MongoDB
mongosh mongodb://localhost:27017
```

**Start MongoDB if needed:**
```bash
# Using Docker Compose
docker-compose up -d mongo

# Or start backend (includes MongoDB)
cd backend
npm run dev
```

### "Invalid password"
**Reset password:**
```bash
mongosh mongodb://localhost:27017/codecourt

# Generate new hash for password "newpassword123"
# Use bcrypt online tool or run: node -e "console.log(require('bcrypt').hashSync('newpassword123', 10))"

db.users.updateOne(
  { email: "admin@codecourt.com" },
  { $set: { passwordHash: "NEW_HASH_HERE" } }
)
```

---

## 📝 Quick Commands Reference

```bash
# Create admin user (recommended)
node create-admin.js

# Check existing users
mongosh mongodb://localhost:27017/codecourt
db.users.find().pretty()

# Upgrade user to admin
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { role: "admin" } }
)

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@codecourt.com","password":"admin123"}'
```

---

## 🎉 Next Steps

After creating your admin user:

1. **Login** to get access token
2. **Add your first problem** using `node add-sample-problem.js`
3. **Upload test cases** to S3
4. **Approve the problem** to make it visible

See **QUICK_START_ADD_PROBLEM.md** for the complete workflow!

---

## 🔒 Security Best Practices

### For Development:
- ✅ Use simple passwords like "admin123"
- ✅ Create multiple test accounts

### For Production:
- ❌ Never use default passwords
- ✅ Use strong passwords (12+ characters, mixed case, numbers, symbols)
- ✅ Enable 2FA (future feature)
- ✅ Rotate admin passwords regularly
- ✅ Limit number of admin accounts
- ✅ Use environment variables for initial admin creation
- ✅ Audit admin actions (future feature)

---

**That's it!** You now have an admin account and can start managing your CodeCourt platform! 🚀
