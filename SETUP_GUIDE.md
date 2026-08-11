# 🚀 Complete Admin Panel Setup Guide

## Step-by-Step Installation

### Step 1: Open Terminal/Command Prompt
Navigate to your photography project folder:
```bash
cd c:\Users\saura\OneDrive\Desktop\photography
```

### Step 2: Install Node.js (if not already installed)
Download from: https://nodejs.org/ (LTS version recommended)

Verify installation:
```bash
node --version
npm --version
```

### Step 3: Install Dependencies
```bash
npm install
```

This will create a `node_modules` folder and install all required packages.

### Step 4: Start the Server
```bash
npm start
```

You should see:
```
Connected to SQLite database
Photography website running on http://localhost:3000
```

---

## 🌐 Accessing Your Website

### Main Website (Public)
Open browser and go to: **http://localhost:3000**

You'll see:
- Logo section (will show OD monogram by default)
- Navigation menu
- Hero section with "Capturing Moments" text

### Admin Login Page
Go to: **http://localhost:3000/admin-login.html**

### Admin Dashboard (After Login)
After successful login, you'll be redirected to dashboard.

---

## 📋 Admin Credentials

**Default Login:**
- Username: `admin`
- Password: `admin123`

---

## 🖼️ How to Upload Your Logo

### Method 1: Using Admin Dashboard (Easy)
1. Go to http://localhost:3000/admin-login.html
2. Login with credentials above
3. You'll see "Upload New Logo" section
4. Either:
   - Drag & drop image onto the area
   - Click "Select File" button
5. Choose your logo (PNG, JPG, or GIF)
6. Logo appears in "Logo History" section
7. Your website automatically shows new logo!

### Method 2: Upload Folder (Direct)
- Place logo images in: `public/uploads/` folder
- Manually update database (not recommended)

---

## 📱 Features

### ✅ Logo Management
- Upload multiple logos
- View upload history
- Activate/deactivate logos
- Delete old logos

### ✅ Dynamic Display
- Website automatically fetches active logo
- No code changes needed
- Real-time updates

### ✅ Admin Protection
- Login required
- Session management
- Logout functionality

---

## 🎨 Your Logo Appears Here

### On Main Website
```
Header Section:
┌─────────────────────────┐
│      [YOUR LOGO]        │  ← Displays your uploaded logo
│   OMKAR DOIPHODE        │
│      PHOTOGRAPHY        │
│  [Navigation Menu]      │
└─────────────────────────┘
```

### File Location
Uploaded logos are stored in:
```
photography/public/uploads/logo-TIMESTAMP.jpg
```

---

## 🔧 Troubleshooting

### Problem: "npm: command not found"
**Solution:** Node.js not installed properly
1. Reinstall Node.js from nodejs.org
2. Restart computer
3. Try `npm --version` again

### Problem: "Cannot find module 'express'"
**Solution:** Dependencies not installed
```bash
npm install
```

### Problem: "Port 3000 already in use"
**Solution:** Change port in server.js (line 5):
```javascript
const PORT = 3001; // Try 3001, 3002, etc.
```

### Problem: "Localhost refused to connect"
**Solution:** Server not running
1. Check if terminal shows "Photography website running..."
2. Run `npm start` if not running
3. Wait 2-3 seconds after starting

### Problem: Logo not appearing on website
**Solution:** 
1. Check if logo uploaded successfully (see in dashboard)
2. Refresh website (Ctrl+R or Cmd+R)
3. Check if image file format is correct

---

## 📁 File Locations

### Important Files
```
photography/
├── index.html              ← Main website
├── server.js              ← Backend server
├── package.json           ← Dependencies
├── README.md              ← Documentation
│
├── public/
│   ├── admin-login.html   ← Admin login
│   ├── admin-dashboard.html ← Logo upload
│   └── uploads/           ← Your logos saved here
│
└── database.db            ← Logo records (created auto)
```

---

## 💡 Pro Tips

1. **Change Admin Password**
   - Edit `server.js` line ~55
   - Change `admin123` to your password
   - Restart server

2. **Use Better Images**
   - Upload PNG for transparency (background logos)
   - Use high resolution (300x300px minimum)
   - Keep file size under 1MB

3. **Backup Logos**
   - Copy `public/uploads/` folder regularly
   - Keep database.db safe

4. **Multiple Admins** (Future Feature)
   - Can add more users in database
   - Each with different username/password

---

## 🎯 Next Steps

1. ✅ Install Node.js
2. ✅ Run `npm install`
3. ✅ Run `npm start`
4. ✅ Upload your logo
5. 🎨 Customize color scheme (edit CSS in files)
6. 📱 Add more pages/content
7. 🚀 Deploy to live server

---

## 📞 Common Questions

**Q: Can I upload multiple logos?**
A: Yes! Upload as many as you want. Only one is active at a time.

**Q: Will logo change on live website?**
A: Yes, immediately after upload and refresh.

**Q: Can clients login and upload?**
A: No, only admin. But can add this feature later.

**Q: What if I forget admin password?**
A: Edit server.js and restart server.

**Q: Can I run on different port?**
A: Yes, change PORT in server.js

---

## ✨ You're All Set!

Your photography website with admin panel is ready!

**Start server:** `npm start`
**Access website:** http://localhost:3000
**Admin login:** http://localhost:3000/admin-login.html

Happy photographing! 📸✨
