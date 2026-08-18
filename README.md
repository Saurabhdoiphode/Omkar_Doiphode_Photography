# 📷 Omkar Doiphode Photography — Full-Stack Web Platform & Studio Booking System

![Omkar Doiphode Photography Banner](public/visiting_card.jpg)

A high-end, full-stack photography studio web application and client booking management system designed for **Omkar Doiphode Photography**. Built with modern JavaScript/TypeScript, Node.js, Express, Supabase Cloud SQL Database, embedded SQLite3, and a mobile-first responsive design system.

---

## 🚀 Live Demo & Portals

- **Client Public Website**: [https://omkar-doiphode-photography.onrender.com](https://omkar-doiphode-photography.onrender.com)
- **Admin Control Portal**: [https://omkar-doiphode-photography.onrender.com/admin-login.html](https://omkar-doiphode-photography.onrender.com/admin-login.html)
- **Client Private Gallery Portal**: [https://omkar-doiphode-photography.onrender.com/client-gallery.html](https://omkar-doiphode-photography.onrender.com/client-gallery.html)

---

## 🔑 Default Admin Credentials

- **Username / Phone**: `9146929608`
- **Password**: `Self@123`
- **Studio WhatsApp / Phone**: `+91 9146929608`

---

## ✨ Key Features & Capabilities

### 🌐 Client-Facing Web App (`index.html`)
- **Hero & CTA Section**: Dynamic photography brand typography, direct WhatsApp booking button, and interactive **🎴 Visiting Card Lightbox Modal** with 1-click HD download.
- **Featured Collections**: 7 Photography Categories (`Marriage Package 💍`, `Pre-Wedding Shoot 👩‍❤️‍👨`, `Baby Shoot 👶`, `Maternity Shoot 🤰`, `Birthday Shoot 🎂`, `Model Photoshoots 📸`, `Corporate Events 🏢`).
- **Interactive Availability Calendar**: Real-time calendar displaying available dates (Green 🟢), pending requests (Yellow ⏳), and blocked/booked dates (Red 🔴). Direct booking form integration.
- **Passcode-Protected Client Galleries (`client-gallery.html`)**: Password-protected photo delivery portal allowing clients to view and download high-resolution shoot photos using secret access passcodes.
- **Client Reviews & Moderation**: Live testimonial showcase with rating stars and admin approval filter.
- **Instant WhatsApp Integration**: Automated pre-filled WhatsApp message generation sent directly to Omkar's phone (+91 9146929608).

### ⚙️ Admin Control Center (`admin-dashboard.html`)
- **Mobile-Native Touch Card Views**: On smartphones, booking requests transform into touch-friendly cards with 1-tap `📞 Call`, `💬 WhatsApp`, `Confirm ✅`, `Cancel 🔴`, and `Delete 🗑️` actions.
- **Chronological Confirmed Shoots Sorting**: Confirmed bookings auto-sort in **Ascending Order by upcoming event date** so Omkar can prepare for upcoming shoots chronologically.
- **🧹 Automatic 6-Month Database Cleanup Engine**: Built-in automated routine (`cleanupSixMonthOldBookings()`) that automatically purges booking records older than 180 days across Supabase Cloud SQL, SQLite, and Local Stores on server startup and daily schedules to prevent database bloat.
- **Admin Calendar Controller**: Interactive monthly calendar grid + quick manual date blocker (`Mark as Blocked` / `Mark as Available`).
- **Business Analytics Suite**: Visual KPI cards and Chart.js graphs tracking package inquiry demand, booking conversion rates, and event density.
- **Private Gallery Creator**: Easy creation of passcode-protected galleries with single photo or entire folder upload support.
- **Review Moderation System**: Approve or delete submitted client reviews before publishing to the public site.
- **Branding & Logo Uploader**: Dynamic studio logo and profile photo management.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | HTML5, Vanilla CSS3, JavaScript (ES6+) | Mobile-first responsive layout, glassmorphism modals, Chart.js analytics |
| **Backend** | Node.js, Express.js, TypeScript | Core server logic in `src/server.ts` with TypeScript execution (`--experimental-strip-types`) |
| **Primary Cloud DB** | Supabase PostgreSQL | Remote SQL Cloud Database storing bookings, calendar statuses, galleries, and reviews |
| **Embedded Local DB**| SQLite3 (`photography.db`) | Local disk database for offline fallback and development |
| **Fail-Safe Store** | `database.json` & `data/bookings.json` | Persistent JSON data store guaranteeing 100% data retrieval |
| **File Storage** | Multer Storage Engine | Local disk upload directory for logo, profile, and gallery images (`public/uploads/`) |
| **Deployment** | Render Cloud Hosting | Auto-deploys live on git push to `main` branch |

---

## 📂 Project Directory Structure

```
photography/
├── index.html                 # Main Client Website & Availability Booking Calendar
├── server.js                  # Node.js Server Entry Point (JavaScript Fallback Wrapper)
├── src/
│   └── server.ts              # TypeScript Core Server with Supabase & Auto-Cleanup Engine
├── public/
│   ├── admin-login.html       # Mobile-Optimized Admin Login Portal
│   ├── admin-dashboard.html   # Admin Control Center & Analytics Dashboard
│   ├── client-gallery.html    # Passcode-Protected Client Photo Delivery Portal
│   ├── visiting_card.jpg      # Digital Visiting Card Image
│   └── uploads/               # Dynamic Upload Directory for Logos & Photos
├── database.json              # Fail-safe Persistent Local Data Store
├── photography.db             # Local SQLite Embedded Database File
├── package.json               # Node Project Dependencies & Build Scripts
├── tsconfig.json              # TypeScript Compiler Configuration
└── README.md                  # Project Documentation
```

---

## 🔧 Local Development & Installation

Follow these steps to run the application locally on your machine:

### 1. Prerequisite
Ensure you have **Node.js (v18+)** installed.

### 2. Clone Repository
```bash
git clone https://github.com/Saurabhdoiphode/Omkar_Doiphode_Photography.git
cd Omkar_Doiphode_Photography
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Start Development Server
```bash
# Run TypeScript Server directly
node --experimental-strip-types src/server.ts

# OR run using npm script
npm run dev
```

### 5. Access Application URLs
- **Main Client Website**: `http://localhost:3001`
- **Admin Login Portal**: `http://localhost:3001/admin-login.html`
- **Client Private Gallery**: `http://localhost:3001/client-gallery.html`

---

## 🧹 Automatic 6-Month Database Cleanup Specification

To prevent database saturation over time, the server incorporates an automated 6-month cleanup engine:

```typescript
// Automatic 6-Month Booking Cleanup Function (Prevents Database Bloat)
async function cleanupSixMonthOldBookings() {
  const cutoffMs = Date.now() - (180 * 24 * 60 * 60 * 1000); // 180 Days (6 Months)
  const cutoffIso = new Date(cutoffMs).toISOString();
  const cutoffDateStr = new Date(cutoffMs).toISOString().split('T')[0];

  // Purges expired bookings from Supabase, SQLite, and database.json
  // Runs automatically on server boot and scheduled every 24 hours
}
```

---

## 🌐 Environment Variables

For production deployment on Render or Vercel, set the following environment variables:

| Variable | Recommended Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3001` | Application port |
| `SUPABASE_URL` | `https://wrirqfaewmuukxlowiuj.supabase.co` | Supabase Cloud API URL |
| `SUPABASE_ANON_KEY` | `sb_publishable_LuEEzmcfbyMNCvfEqeykPg_ekpOCUFO` | Supabase Cloud Anon Key |

---

## 📞 Studio Contact & Support

- **Lead Photographer**: Omkar Doiphode
- **Phone / WhatsApp**: +91 9146929608
- **GitHub Repository**: [https://github.com/Saurabhdoiphode/Omkar_Doiphode_Photography.git](https://github.com/Saurabhdoiphode/Omkar_Doiphode_Photography.git)

---
*Created with ❤️ for Omkar Doiphode Photography*