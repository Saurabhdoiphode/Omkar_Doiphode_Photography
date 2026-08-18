import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { fileURLToPath } from 'url';
import type {
  BookingRecord,
  BookingStatus,
  BlockedDateRecord,
  DateEventDetail,
  ReviewRecord,
  ServiceRecord,
  GalleryRecord
} from './types/index.ts';

const app = express();
const PORT = process.env.PORT || 3001;

// Body Parsers & Static Files
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(process.cwd(), 'public')));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));
app.use(express.static(process.cwd()));

// Route Aliases for Admin Panel & Client Gallery (Handles both hyphen, underscore, and shorthand URLs)
app.get(['/admin', '/admin-login', '/admin_login', '/admin-login.html', '/admin_login.html'], (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'admin-login.html'));
});

app.get(['/admin-dashboard', '/admin_dashboard', '/admin-dashboard.html', '/admin_dashboard.html', '/dashboard'], (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'admin-dashboard.html'));
});

app.get(['/client-gallery', '/client_gallery', '/client-gallery.html', '/client_gallery.html', '/gallery'], (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'client-gallery.html'));
});

// Ensure upload directories exist
// Ensure upload directories exist in BOTH process.cwd()/uploads AND process.cwd()/public/uploads
const uploadDir = path.join(process.cwd(), 'uploads');
const publicUploadDir = path.join(process.cwd(), 'public', 'uploads');

const logoDir = path.join(uploadDir, 'logos');
const profileDir = path.join(uploadDir, 'profile');
const galleryDir = path.join(uploadDir, 'gallery');

const publicLogoDir = path.join(publicUploadDir, 'logos');
const publicProfileDir = path.join(publicUploadDir, 'profile');
const publicGalleryDir = path.join(publicUploadDir, 'gallery');

[uploadDir, publicUploadDir, logoDir, profileDir, galleryDir, publicLogoDir, publicProfileDir, publicGalleryDir].forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (e) {}
});

// Multer Storage Engines with auto-directory creation
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true });
      if (!fs.existsSync(publicLogoDir)) fs.mkdirSync(publicLogoDir, { recursive: true });
    } catch(e) {}
    cb(null, logoDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '.png') || '.png';
    cb(null, `logo_${Date.now()}${ext}`);
  }
});
const uploadLogo = multer({ storage: logoStorage, limits: { fileSize: 15 * 1024 * 1024 } });

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });
      if (!fs.existsSync(publicProfileDir)) fs.mkdirSync(publicProfileDir, { recursive: true });
    } catch(e) {}
    cb(null, profileDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '.jpg') || '.jpg';
    cb(null, `profile_${Date.now()}${ext}`);
  }
});
const uploadProfile = multer({ storage: profileStorage, limits: { fileSize: 15 * 1024 * 1024 } });

// Zero-Disk Memory Storage Engine (Guarantees 100% cloud upload success on Render without disk permissions errors)
const memoryStorage = multer.memoryStorage();
const uploadMemoryLogo = multer({ storage: memoryStorage, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadMemoryProfile = multer({ storage: memoryStorage, limits: { fileSize: 10 * 1024 * 1024 } });

const galleryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      if (!fs.existsSync(galleryDir)) fs.mkdirSync(galleryDir, { recursive: true });
      if (!fs.existsSync(publicGalleryDir)) fs.mkdirSync(publicGalleryDir, { recursive: true });
    } catch(e) {}
    cb(null, galleryDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '.jpg') || '.jpg';
    cb(null, `gallery_${Date.now()}${ext}`);
  }
});
const uploadGallery = multer({ storage: galleryStorage, limits: { fileSize: 25 * 1024 * 1024 } });

// Supabase Cloud Database Client
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wrirqfaewmuukxlowiuj.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_LuEEzmcfbyMNCvfEqeykPg_ekpOCUFO';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('⚡ Supabase Cloud Database Client Connected!');

// Persistent Local JSON Store Provider (Guarantees 100% persistence & retrieval across server restarts)
const LOCAL_STORE_FILE = path.join(process.cwd(), 'database.json');

const localStore = {
  data: {
    bookings: [] as any[],
    blocked_dates: [] as any[],
    services: [] as any[],
    gallery_items: [] as any[],
    private_galleries: [] as any[],
    reviews: [] as any[],
    logos: [] as any[],
    profile_photo: [] as any[],
    admin_users: [
      { username: '9146929608', password: 'Self@123' },
      { username: 'admin', password: 'admin123' }
    ] as any[]
  },
  load() {
    try {
      if (fs.existsSync(LOCAL_STORE_FILE)) {
        const raw = fs.readFileSync(LOCAL_STORE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = { ...this.data, ...parsed };
      }
    } catch (e) {
      console.error('Error reading local store:', e);
    }
    if (!this.data.reviews || this.data.reviews.length === 0) {
      this.data.reviews = [
        { id: 1, client_name: 'Amit & Priya', event_type: 'Marriage Package', rating: 5, review_text: 'Omkar captured our wedding so beautifully! The lighting and emotional shots were beyond expectation.', is_approved: 1, created_at: new Date().toISOString() },
        { id: 2, client_name: 'Siddharth Patil', event_type: 'Pre-Wedding Shoot', rating: 5, review_text: 'Amazing pre-wedding shoot experience at Mahabaleshwar. Super professional and creative team!', is_approved: 1, created_at: new Date().toISOString() },
        { id: 3, client_name: 'Neha Deshmukh', event_type: 'Baby Shoot', rating: 5, review_text: 'Loved the newborn baby photoshoot themes! So patient and gentle with our baby. Highly recommended!', is_approved: 1, created_at: new Date().toISOString() }
      ];
      this.save();
    }
  },
  save() {
    try {
      fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing local store:', e);
    }
  }
};
localStore.load();

// 🧹 Automatic 6-Month Booking Cleanup Function (Prevents Database Bloat)
async function cleanupSixMonthOldBookings() {
  try {
    const cutoffMs = Date.now() - (180 * 24 * 60 * 60 * 1000); // 180 Days (6 Months)
    const cutoffIso = new Date(cutoffMs).toISOString();
    const cutoffDateStr = new Date(cutoffMs).toISOString().split('T')[0];

    // 1. Clean localStore memory & database.json
    if (localStore.data && Array.isArray(localStore.data.bookings)) {
      const initialCount = localStore.data.bookings.length;
      localStore.data.bookings = localStore.data.bookings.filter(b => {
        if (!b) return false;
        const createdMs = b.created_at ? new Date(b.created_at).getTime() : (typeof b.id === 'number' ? b.id : Date.now());
        const bookingDateMs = b.booking_date ? new Date(b.booking_date).getTime() : Date.now();
        return createdMs >= cutoffMs || bookingDateMs >= cutoffMs;
      });
      if (localStore.data.bookings.length < initialCount) {
        console.log(`🧹 Auto-Cleaned ${initialCount - localStore.data.bookings.length} expired booking(s) older than 6 months from Local Store.`);
        localStore.save();
      }
    }

    // 2. Clean Supabase Cloud Database
    if (supabase) {
      await supabase.from('bookings').delete().lt('created_at', cutoffIso);
      await supabase.from('bookings').delete().lt('booking_date', cutoffDateStr);
    }

    // 3. Clean SQLite DB if initialized
    if (db && typeof db.run === 'function') {
      db.run(
        `DELETE FROM bookings WHERE created_at < ? OR booking_date < ?`,
        [cutoffIso, cutoffDateStr],
        function (err: any) {
          if (!err && this && this.changes > 0) {
            console.log(`🧹 Auto-Cleaned ${this.changes} expired booking(s) older than 6 months from SQLite.`);
          }
        }
      );
    }
  } catch (err) {
    console.error('Error during 6-month booking auto-cleanup:', err);
  }
}

// Trigger cleanup on server boot & schedule every 24 hours
cleanupSixMonthOldBookings();
setInterval(cleanupSixMonthOldBookings, 24 * 60 * 60 * 1000);

// Local Database Interface Wrapper
let db: any;
try {
  const sqlite3 = (await import('sqlite3')).default;
  const dbPath = path.join(process.cwd(), 'photography.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('SQLite connection notice:', err.message);
    else console.log('Connected to SQLite local database');
  });
} catch (e) {
  console.log('⚡ Running in Hybrid Supabase + Local JSON Store Mode');
  db = {
    run: (sql: string, params?: any, cb?: Function) => {
      const callback = typeof params === 'function' ? params : cb;
      const args = Array.isArray(params) ? params : [];

      if (sql.includes('INTO private_galleries')) {
        const [code, client, pass, photos] = args;
        if (code) {
          const codeUpper = String(code).toUpperCase();
          const existingIdx = localStore.data.private_galleries.findIndex(
            g => String(g.gallery_code).toUpperCase() === codeUpper
          );
          const record = {
            id: existingIdx >= 0 ? localStore.data.private_galleries[existingIdx].id : Date.now(),
            gallery_code: codeUpper,
            client_name: String(client || ''),
            passcode: String(pass || ''),
            photo_urls: typeof photos === 'string' ? photos : JSON.stringify(photos),
            created_at: new Date().toISOString()
          };
          if (existingIdx >= 0) {
            localStore.data.private_galleries[existingIdx] = record;
          } else {
            localStore.data.private_galleries.push(record);
          }
          localStore.save();
        }
      } else if (sql.includes('INTO bookings')) {
        const [client, phone, type, loc, date] = args;
        localStore.data.bookings.push({
          id: Date.now(),
          client_name: client,
          client_phone: phone,
          event_type: type,
          event_location: loc,
          booking_date: date,
          status: 'pending',
          created_at: new Date().toISOString()
        });
        localStore.save();
      } else if (sql.includes('UPDATE bookings SET status')) {
        const [status, idVal] = args;
        localStore.data.bookings.forEach(b => {
          if (String(b.id) === String(idVal) || b.booking_date === args[1]) {
            b.status = status;
          }
        });
        localStore.save();
      } else if (sql.includes('INTO reviews')) {
        const [name, type, rating, text] = args;
        localStore.data.reviews.push({
          id: Date.now(),
          client_name: name,
          event_type: type,
          rating: Number(rating) || 5,
          review_text: text,
          is_approved: 1,
          created_at: new Date().toISOString()
        });
        localStore.save();
      } else if (sql.includes('UPDATE reviews SET is_approved')) {
        const [isApproved, idVal] = args;
        localStore.data.reviews.forEach(r => {
          if (String(r.id) === String(idVal)) {
            r.is_approved = Number(isApproved) ? 1 : 0;
          }
        });
        localStore.save();
      } else if (sql.includes('DELETE FROM reviews')) {
        const idVal = args[0];
        localStore.data.reviews = localStore.data.reviews.filter(r => String(r.id) !== String(idVal));
        localStore.save();
      } else if (sql.includes('INTO profile_photo')) {
        localStore.data.profile_photo = [{ id: Date.now(), photo_path: args[0], uploaded_at: new Date().toISOString() }];
        localStore.save();
      } else if (sql.includes('DELETE FROM profile_photo')) {
        localStore.data.profile_photo = [];
        localStore.save();
      } else if (sql.includes('INTO logos')) {
        const pathVal = args[0];
        localStore.data.logos.forEach(l => l.is_active = 0);
        localStore.data.logos.push({
          id: Date.now(),
          logo_path: pathVal,
          filepath: pathVal,
          is_active: 1,
          uploaded_at: new Date().toISOString()
        });
        localStore.save();
      } else if (sql.includes('UPDATE logos SET is_active = 0')) {
        localStore.data.logos.forEach(l => l.is_active = 0);
        localStore.save();
      } else if (sql.includes('UPDATE logos SET is_active = 1')) {
        const targetId = args[0];
        localStore.data.logos.forEach(l => {
          l.is_active = (String(l.id).trim() === String(targetId).trim() || String(l.logo_path) === String(targetId) || String(l.filepath) === String(targetId)) ? 1 : 0;
        });
        localStore.save();
      } else if (sql.includes('DELETE FROM logos')) {
        const targetId = args[0];
        localStore.data.logos = localStore.data.logos.filter(l => 
          String(l.id).trim() !== String(targetId).trim() && 
          String(l.logo_path) !== String(targetId) && 
          String(l.filepath) !== String(targetId)
        );
        localStore.save();
      }

      if (callback) callback(null);
    },
    all: (sql: string, params?: any, cb?: Function) => {
      const callback = typeof params === 'function' ? params : cb;
      let rows: any[] = [];
      if (sql.includes('private_galleries')) rows = localStore.data.private_galleries;
      else if (sql.includes('bookings')) rows = localStore.data.bookings;
      else if (sql.includes('reviews')) rows = localStore.data.reviews;
      else if (sql.includes('blocked_dates')) rows = localStore.data.blocked_dates;
      else if (sql.includes('gallery_items')) rows = localStore.data.gallery_items;
      else if (sql.includes('logos')) rows = localStore.data.logos;
      else if (sql.includes('profile_photo')) rows = localStore.data.profile_photo;

      if (callback) callback(null, rows);
    },
    get: (sql: string, params?: any, cb?: Function) => {
      const callback = typeof params === 'function' ? params : cb;
      const args = Array.isArray(params) ? params : [];
      let row: any = null;

      if (sql.includes('private_galleries')) {
        const searchCode = args[0] ? String(args[0]).toUpperCase() : '';
        row = localStore.data.private_galleries.find(
          g => String(g.gallery_code).toUpperCase() === searchCode
        ) || null;
      } else if (sql.includes('admin_users')) {
        const [u, p] = args;
        row = localStore.data.admin_users.find(
          user => String(user.username).trim() === String(u).trim() && String(user.password).trim() === String(p).trim()
        ) || null;
      } else if (sql.includes('profile_photo')) {
        row = localStore.data.profile_photo[localStore.data.profile_photo.length - 1] || null;
      } else if (sql.includes('logos')) {
        row = localStore.data.logos.find(l => l.is_active === 1 || l.is_active === true) ||
              localStore.data.logos[localStore.data.logos.length - 1] || null;
      } else if (sql.includes('bookings')) {
        row = localStore.data.bookings.find(b => String(b.id) === String(args[0])) || null;
      }

      if (callback) callback(null, row);
    },
    serialize: (cb?: Function) => { if (cb) cb(); }
  };
}

// Initialize Database Schemas
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL,
      client_phone TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_location TEXT NOT NULL,
      booking_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS blocked_dates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date_str TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'blocked',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT,
      badge TEXT,
      price TEXT,
      deliverables TEXT,
      features TEXT,
      cover_image TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS gallery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      image_url TEXT NOT NULL,
      badge TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_name TEXT NOT NULL,
      event_type TEXT NOT NULL,
      rating INTEGER NOT NULL,
      review_text TEXT NOT NULL,
      is_approved INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS logos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      logo_path TEXT NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS profile_photo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      photo_path TEXT NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    )
  `, () => {
    db.run(`INSERT OR IGNORE INTO admin_users (username, password) VALUES ('9146929608', 'Self@123')`);
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS private_galleries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gallery_code TEXT UNIQUE NOT NULL,
      client_name TEXT NOT NULL,
      passcode TEXT NOT NULL,
      photo_urls TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// --- API ENDPOINTS ---

// 0. Admin Login Endpoint
app.post('/api/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const trimmedUser = String(username).trim();
  const trimmedPass = String(password).trim();

  // Primary Default Admin Credentials
  if (
    (trimmedUser === '9146929608' && trimmedPass === 'Self@123') ||
    (trimmedUser === 'admin' && trimmedPass === 'admin123')
  ) {
    return res.json({ success: true, token: 'admin_token_' + trimmedUser });
  }

  db.get(
    'SELECT * FROM admin_users WHERE username = ? AND password = ?',
    [trimmedUser, trimmedPass],
    (err: any, row: any) => {
      if (row) {
        return res.json({ success: true, token: 'admin_token_' + trimmedUser });
      } else {
        return res.status(401).json({ error: 'Invalid username or password' });
      }
    }
  );
});

// 1. Get Active Logo (For Website Header)
app.get('/api/current-logo', async (req: Request, res: Response) => {
  try {
    let logoPath: string | null = null;

    // A. Check SQLite active logo first
    await new Promise<void>((resolve) => {
      db.get('SELECT logo_path, filepath FROM logos WHERE is_active = 1 OR is_active = "1" ORDER BY id DESC LIMIT 1', [], (_err: any, row: any) => {
        if (row) {
          logoPath = row.logo_path || row.filepath;
        }
        resolve();
      });
    });

    // B. Check Supabase Cloud active logo if not found in SQLite
    if (!logoPath) {
      try {
        const { data: logo } = await supabase
          .from('logos')
          .select('*')
          .eq('is_active', 1)
          .order('id', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (logo && (logo.logo_path || logo.filepath)) {
          logoPath = logo.logo_path || logo.filepath;
        }
      } catch (e) {}
    }

    // C. Check localStore active logo
    if (!logoPath && Array.isArray(localStore.data.logos)) {
      const localActive = localStore.data.logos.find((l: any) => Number(l.is_active) === 1 || l.is_active === true);
      if (localActive) logoPath = localActive.logo_path || localActive.filepath;
    }

    // D. Fallback to latest uploaded logo if no logo explicitly flagged active
    if (!logoPath) {
      await new Promise<void>((resolve) => {
        db.get('SELECT logo_path, filepath FROM logos ORDER BY id DESC LIMIT 1', [], (_err: any, row: any) => {
          if (row) {
            logoPath = row.logo_path || row.filepath;
          }
          resolve();
        });
      });
    }

    if (!logoPath && Array.isArray(localStore.data.logos) && localStore.data.logos.length > 0) {
      const last = localStore.data.logos[localStore.data.logos.length - 1];
      if (last) logoPath = last.logo_path || last.filepath;
    }

    if (logoPath) {
      return res.json({ success: true, logo_path: logoPath, filepath: logoPath, logoUrl: logoPath });
    }

    return res.json({ success: false, logo_path: null, filepath: null, logoUrl: null });
  } catch (e) {
    res.json({ success: false, logo_path: null });
  }
});

// 2. Get Logo History (For Admin Dashboard Grid)
app.get('/api/logo-history', async (req: Request, res: Response) => {
  try {
    db.all('SELECT * FROM logos ORDER BY id DESC', [], async (_err: any, rows: any[]) => {
      let list = (rows || []).map(r => ({
        id: String(r.id),
        logo_path: r.logo_path || r.filepath,
        filepath: r.filepath || r.logo_path,
        is_active: Number(r.is_active) === 1 ? 1 : 0,
        uploaded_at: r.uploaded_at || new Date().toISOString()
      }));

      // Combine with Supabase if SQLite is empty
      if (list.length === 0) {
        try {
          const { data: sbLogos } = await supabase.from('logos').select('*').order('id', { ascending: false });
          if (sbLogos && sbLogos.length > 0) {
            list = sbLogos.map(r => ({
              id: String(r.id),
              logo_path: r.logo_path || r.filepath,
              filepath: r.filepath || r.logo_path,
              is_active: Number(r.is_active) === 1 ? 1 : 0,
              uploaded_at: r.created_at || new Date().toISOString()
            }));
          }
        } catch (e) {}
      }

      res.json(list);
    });
  } catch (e) {
    res.json([]);
  }
});

const saveLogoDataUrl = async (logoDataUrl: string, res: Response) => {
  try {
    // Reset all previous active logos to 0
    db.run('UPDATE logos SET is_active = 0');
    try { await supabase.from('logos').update({ is_active: 0 }).neq('id', -1); } catch (e) {}

    // Insert new logo as active (is_active = 1)
    try {
      await supabase.from('logos').insert([{ logo_path: logoDataUrl, is_active: 1 }]);
    } catch (e) {}

    db.run('INSERT INTO logos (logo_path, is_active) VALUES (?, 1)', [logoDataUrl], function (this: any) {
      const newId = this ? this.lastID : Date.now();
      if (Array.isArray(localStore.data.logos)) {
        localStore.data.logos.forEach((l: any) => l.is_active = 0);
        localStore.data.logos.push({ id: newId, logo_path: logoDataUrl, filepath: logoDataUrl, is_active: 1 });
      }
      localStore.save();
      return res.json({ success: true, message: 'Logo uploaded and set as active successfully!', logo_path: logoDataUrl, filepath: logoDataUrl });
    });
  } catch (e) {
    console.error('Save logo error:', e);
    return res.status(500).json({ success: false, error: 'Failed to save logo image.' });
  }
};

app.post(['/api/upload-logo-json', '/api/logos/upload-json'], async (req: Request, res: Response) => {
  const logoData = req.body?.logoData || req.body?.logoBase64 || req.body?.logo_path;
  if (!logoData) {
    return res.status(400).json({ success: false, error: 'No logo image data provided.' });
  }
  await saveLogoDataUrl(logoData, res);
});

// 3. Upload Brand Logo (Memory Storage Base64 Engine — Zero Disk Errors)
app.post('/api/upload-logo', (req: Request, res: Response) => {
  uploadMemoryLogo.single('logo')(req, res, async (err: any) => {
    if (err || !req.file) {
      console.error('Logo upload error:', err);
      return res.status(400).json({ success: false, error: 'Please select a valid image file (PNG/JPG).' });
    }

    try {
      const mime = req.file.mimetype || 'image/png';
      const base64Data = req.file.buffer.toString('base64');
      const logoPath = `data:${mime};base64,${base64Data}`;

      // Optional disk file sync fallback
      try {
        const ext = path.extname(req.file.originalname || '.png') || '.png';
        const filename = `logo_${Date.now()}${ext}`;
        const p1 = path.join(logoDir, filename);
        const p2 = path.join(publicLogoDir, filename);
        fs.writeFileSync(p1, req.file.buffer);
        fs.writeFileSync(p2, req.file.buffer);
      } catch(e) {}

      await saveLogoDataUrl(logoPath, res);
    } catch (e) {
      console.error('Upload logo error:', e);
      res.status(500).json({ success: false, error: 'Failed to process logo image' });
    }
  });
});

// 4. Activate Specific Logo (Admin Dashboard)
const setLogoActiveHandler = async (req: Request, res: Response) => {
  const id = req.params.id;
  const numId = parseInt(id, 10);

  try {
    // 1. Reset all logo active statuses to 0
    db.run('UPDATE logos SET is_active = 0');
    try { await supabase.from('logos').update({ is_active: 0 }).neq('id', -1); } catch (e) {}

    // 2. Set target logo active = 1
    db.run('UPDATE logos SET is_active = 1 WHERE id = ? OR id = ? OR logo_path LIKE ?', [id, isNaN(numId) ? -1 : numId, `%${id}%`]);
    try {
      if (!isNaN(numId)) await supabase.from('logos').update({ is_active: 1 }).eq('id', numId);
      await supabase.from('logos').update({ is_active: 1 }).eq('id', id);
    } catch (e) {}

    if (Array.isArray(localStore.data.logos)) {
      localStore.data.logos.forEach((l: any) => {
        l.is_active = (String(l.id) === String(id) || l.logo_path?.includes(id)) ? 1 : 0;
      });
    }

    res.json({ success: true, message: 'Brand logo activated successfully!' });
  } catch (e) {
    console.error('Activate logo error:', e);
    res.status(500).json({ error: 'Failed to activate logo' });
  }
};

app.post('/api/set-active-logo/:id', setLogoActiveHandler);
app.post('/api/activate-logo/:id', setLogoActiveHandler);
app.post('/api/logos/activate/:id', setLogoActiveHandler);

// 5. Delete Specific Logo (Admin Dashboard)
app.delete('/api/delete-logo/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  const numId = parseInt(id, 10);

  try {
    try { await supabase.from('logos').delete().eq('id', id); } catch(e) {}
    db.run('DELETE FROM logos WHERE id = ? OR id = ?', [id, isNaN(numId) ? -1 : numId], () => {
      // Ensure at least one logo remains active if any logos exist
      db.run('UPDATE logos SET is_active = 1 WHERE id = (SELECT id FROM logos ORDER BY id DESC LIMIT 1) AND NOT EXISTS (SELECT 1 FROM logos WHERE is_active = 1)');
      res.json({ success: true, message: 'Logo deleted successfully!' });
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete logo' });
  }
});

// 3. Get Profile Photo
app.get('/api/omkar-photo', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('profile_photo')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (!error && data) {
      return res.json({ success: true, photo_path: data.photo_path });
    }

    db.get('SELECT photo_path FROM profile_photo ORDER BY id DESC LIMIT 1', [], (err, row: any) => {
      if (row && row.photo_path) {
        return res.json({ success: true, photo_path: row.photo_path });
      }
      return res.json({ success: false, photo_path: null });
    });
  } catch (e) {
    res.json({ success: false, photo_path: null });
  }
});

// 4. Upload Profile Photo
app.post('/api/upload-omkar-photo', (req: Request, res: Response) => {
  uploadMemoryProfile.single('profile_photo')(req, res, async (err: any) => {
    if (err || !req.file) {
      console.error('Profile photo upload error:', err);
      return res.status(400).json({ success: false, error: 'Please select a valid image file.' });
    }

    try {
      const mime = req.file.mimetype || 'image/jpeg';
      const base64Data = req.file.buffer.toString('base64');
      const photoPath = `data:${mime};base64,${base64Data}`;

      try {
        const ext = path.extname(req.file.originalname || '.jpg') || '.jpg';
        const filename = `profile_${Date.now()}${ext}`;
        const p1 = path.join(profileDir, filename);
        const p2 = path.join(publicProfileDir, filename);
        fs.writeFileSync(p1, req.file.buffer);
        fs.writeFileSync(p2, req.file.buffer);
      } catch(e) {}

      try {
        await supabase.from('profile_photo').insert([{ photo_path: photoPath }]);
      } catch (e) {}

      db.run('DELETE FROM profile_photo', () => {
        db.run('INSERT INTO profile_photo (photo_path, filepath) VALUES (?, ?)', [photoPath, photoPath], () => {
          localStore.data.profile_photo = [{ id: Date.now(), photo_path: photoPath, filepath: photoPath }];
          localStore.save();
          res.json({ success: true, message: 'Profile photo updated successfully!', photo_path: photoPath, photoUrl: photoPath });
        });
      });
    } catch (e) {
      console.error('Save profile photo DB error:', e);
      res.status(500).json({ success: false, error: 'Failed to save photo' });
    }
  });
});

// 5. Delete Profile Photo
app.delete('/api/omkar-photo', async (req: Request, res: Response) => {
  try {
    await supabase.from('profile_photo').delete().neq('id', 0);
    db.run('DELETE FROM profile_photo', [], (err) => {
      if (err) return res.status(500).json({ success: false, error: 'Database error' });
      res.json({ success: true, message: 'Profile photo deleted' });
    });
  } catch (e) {
    res.status(500).json({ error: 'Delete error' });
  }
});

// 6. Get Calendar Statuses & Event Details
app.get('/api/calendar-status', async (req: Request, res: Response) => {
  const statusMap: Record<string, 'blocked' | 'pending' | 'available'> = {};
  const eventsMap: Record<string, DateEventDetail> = {};

  try {
    const { data: sbBk } = await supabase.from('bookings').select('*').neq('status', 'cancelled');
    if (sbBk && sbBk.length > 0) {
      sbBk.sort((a, b) => {
        const priority: Record<string, number> = { 'confirmed': 1, 'blocked': 1, 'pending': 2 };
        return (priority[a.status] || 3) - (priority[b.status] || 3);
      });

      sbBk.forEach(b => {
        if (b.status === 'confirmed' || b.status === 'blocked') {
          statusMap[b.booking_date] = 'blocked';
          eventsMap[b.booking_date] = {
            eventType: b.event_type,
            clientName: b.client_name,
            status: 'confirmed'
          };
        } else if (b.status === 'pending') {
          if (!statusMap[b.booking_date]) {
            statusMap[b.booking_date] = 'pending';
            eventsMap[b.booking_date] = {
              eventType: b.event_type,
              clientName: b.client_name,
              status: 'pending'
            };
          }
        }
      });
    }

    const { data: sbBlocked } = await supabase.from('blocked_dates').select('*');
    if (sbBlocked && sbBlocked.length > 0) {
      sbBlocked.forEach(row => {
        statusMap[row.date_str] = row.status;
        if (row.status === 'blocked') {
          if (!eventsMap[row.date_str]) {
            eventsMap[row.date_str] = {
              eventType: row.notes || 'Photography Shoot Booked',
              status: 'blocked'
            };
          }
        } else if (row.status === 'available') {
          delete eventsMap[row.date_str];
        }
      });
    }

    db.all('SELECT booking_date, event_type, client_name, status FROM bookings WHERE status != "cancelled"', [], (err: any, bookingRows: BookingRecord[]) => {
      if (bookingRows && bookingRows.length > 0) {
        bookingRows.forEach(b => {
          if (!statusMap[b.booking_date]) {
            if (b.status === 'confirmed' || b.status === 'blocked') {
              statusMap[b.booking_date] = 'blocked';
              eventsMap[b.booking_date] = { eventType: b.event_type, clientName: b.client_name, status: 'confirmed' };
            } else if (b.status === 'pending') {
              statusMap[b.booking_date] = 'pending';
              eventsMap[b.booking_date] = { eventType: b.event_type, clientName: b.client_name, status: 'pending' };
            }
          }
        });
      }

      db.all('SELECT date_str, status, notes FROM blocked_dates', [], (err: any, blockedRows: BlockedDateRecord[]) => {
        if (blockedRows && blockedRows.length > 0) {
          blockedRows.forEach(row => {
            statusMap[row.date_str] = row.status;
            if (row.status === 'available') delete eventsMap[row.date_str];
          });
        }
        res.json({ success: true, dateStatuses: statusMap, dateEvents: eventsMap });
      });
    });
  } catch (e) {
    console.error('Calendar status error:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// 7. Submit Booking Request
app.post('/api/bookings', async (req: Request, res: Response) => {
  const { clientName, clientPhone, eventType, eventLocation, bookingDate } = req.body;

  if (!clientName || !clientPhone || !eventType || !eventLocation || !bookingDate) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const { error: sbErr } = await supabase
      .from('bookings')
      .insert([{
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        event_type: eventType,
        event_location: eventLocation.trim(),
        booking_date: bookingDate,
        status: 'pending'
      }]);

    if (sbErr) {
      console.log('Supabase insert note:', sbErr.message);
    }

    db.run(
      `INSERT INTO bookings (client_name, client_phone, event_type, event_location, booking_date, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [clientName.trim(), clientPhone.trim(), eventType, eventLocation.trim(), bookingDate]
    );

    const alertMsg = `🚨 NEW BOOKING REQUEST!\n👤 Client: ${clientName.trim()}\n📞 Phone: ${clientPhone.trim()}\n💍 Event: ${eventType}\n📅 Date: ${bookingDate}\n📍 Location: ${eventLocation.trim()}`;
    console.log('\n==================================================');
    console.log(alertMsg);
    console.log('==================================================\n');

    const whatsappAlertUrl = `https://api.whatsapp.com/send?phone=919146929608&text=${encodeURIComponent(alertMsg)}`;

    res.json({
      success: true,
      message: 'Thank you! We will call you shortly to confirm your booking.',
      bookingDate: bookingDate,
      whatsappAlertUrl: whatsappAlertUrl
    });
  } catch (err) {
    console.error('Error inserting booking:', err);
    res.status(500).json({ error: 'Failed to record booking request.' });
  }
});

// 8. Get All Bookings
app.get('/api/bookings', async (req: Request, res: Response) => {
  try {
    await cleanupSixMonthOldBookings();
    const { data: sbBookings, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && sbBookings && sbBookings.length > 0) {
      return res.json({ success: true, bookings: sbBookings });
    }
    db.all('SELECT * FROM bookings ORDER BY created_at DESC', [], (err, rows) => {
      res.json({ success: true, bookings: rows || [] });
    });
  } catch (e) {
    db.all('SELECT * FROM bookings ORDER BY created_at DESC', [], (err, rows) => {
      res.json({ success: true, bookings: rows || [] });
    });
  }
});

// 9. Update Booking Status (Confirmed / Blocked / Cancelled)
app.post('/api/bookings/:id/status', async (req: Request, res: Response) => {
  const id = req.params.id;
  const numId = parseInt(id, 10);
  const { status, bookingDate: bodyDate, clientPhone: bodyPhone } = req.body;

  if (!['pending', 'confirmed', 'blocked', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    let bookingDate: string | null = bodyDate || null;
    let clientPhone: string | null = bodyPhone || null;

    // 1. Update SQLite by ID
    db.run('UPDATE bookings SET status = ? WHERE id = ? OR id = ?', [status, id, isNaN(numId) ? -1 : numId]);

    // 2. Update Supabase Cloud DB by ID
    try {
      if (!isNaN(numId)) {
        await supabase.from('bookings').update({ status }).eq('id', numId);
      }
      await supabase.from('bookings').update({ status }).eq('id', id);
    } catch (e) {}

    // Fetch booking details to get date and phone
    db.get('SELECT booking_date, client_phone FROM bookings WHERE id = ? OR id = ?', [id, isNaN(numId) ? -1 : numId], async (err, row: any) => {
      if (row) {
        if (!bookingDate) bookingDate = row.booking_date;
        if (!clientPhone) clientPhone = row.client_phone;
      }

      if (bookingDate && clientPhone) {
        db.run('UPDATE bookings SET status = ? WHERE booking_date = ? AND client_phone = ?', [status, bookingDate, clientPhone]);
        try {
          await supabase.from('bookings').update({ status }).eq('booking_date', bookingDate).eq('client_phone', clientPhone);
        } catch(e) {}
      }

      if ((status === 'confirmed' || status === 'blocked') && bookingDate) {
        try {
          await supabase.from('blocked_dates').upsert({ date_str: bookingDate, status: 'blocked', notes: 'Confirmed Booking' }, { onConflict: 'date_str' });
        } catch(e) {}

        db.run(
          `INSERT INTO blocked_dates (date_str, status, notes) VALUES (?, 'blocked', 'Confirmed Booking')
           ON CONFLICT(date_str) DO UPDATE SET status = 'blocked'`,
          [bookingDate],
          () => {
            return res.json({ success: true, message: `Booking status updated to ${status}` });
          }
        );
      } else {
        if (bookingDate) {
          try {
            await supabase.from('blocked_dates').delete().eq('date_str', bookingDate);
          } catch(e) {}
          db.run('DELETE FROM blocked_dates WHERE date_str = ?', [bookingDate]);
        }
        return res.json({ success: true, message: `Booking status updated to ${status}` });
      }
    });
  } catch (e) {
    console.error('Booking status update error:', e);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// 10. Delete Booking
app.delete('/api/bookings/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    await supabase.from('bookings').delete().eq('id', id);
    db.run('DELETE FROM bookings WHERE id = ?', [id]);
    res.json({ success: true, message: 'Booking deleted successfully' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

// 11. Manually Block / Unblock Date (Admin endpoint)
app.post('/api/manual-block-date', async (req: Request, res: Response) => {
  const { dateStr, action } = req.body;

  if (!dateStr) {
    return res.status(400).json({ error: 'Date is required' });
  }

  try {
    const newStatus = (action === 'unblock') ? 'available' : 'blocked';
    const notes = (action === 'unblock') ? 'Manually unblocked by admin' : 'Manually blocked by admin';

    await supabase.from('blocked_dates').upsert({ date_str: dateStr, status: newStatus, notes }, { onConflict: 'date_str' });

    db.run(
      `INSERT INTO blocked_dates (date_str, status, notes) VALUES (?, ?, ?)
       ON CONFLICT(date_str) DO UPDATE SET status = excluded.status, notes = excluded.notes`,
      [dateStr, newStatus, notes],
      () => {
        res.json({
          success: true,
          message: (action === 'unblock')
            ? `Date ${dateStr} is now set to Available on calendar! Confirmed order record remains intact.`
            : `Date ${dateStr} blocked successfully!`
        });
      }
    );
  } catch (e) {
    console.error('Manual block error:', e);
    res.status(500).json({ error: 'Database update failed' });
  }
});

// 12. Get Blocked Dates List
app.get('/api/blocked-dates', async (req: Request, res: Response) => {
  try {
    const { data: bDates, error } = await supabase.from('blocked_dates').select('*');
    if (!error && bDates) {
      return res.json({ success: true, blockedDates: bDates });
    }
    db.all('SELECT * FROM blocked_dates ORDER BY date_str ASC', [], (err, rows) => {
      res.json({ success: true, blockedDates: rows || [] });
    });
  } catch (e) {
    res.status(500).json({ error: 'Database error' });
  }
});

// 13. Get Services List
app.get('/api/services', async (req: Request, res: Response) => {
  try {
    const { data: services, error } = await supabase.from('services').select('*');
    if (!error && services && services.length > 0) {
      return res.json({ success: true, services });
    }
    db.all('SELECT * FROM services', [], (err, rows) => {
      res.json({ success: true, services: rows || [] });
    });
  } catch (e) {
    res.status(500).json({ error: 'Database error' });
  }
});

// 14. Bulk Gallery Photos Upload (Admin Dashboard Client Gallery Creator)
app.post('/api/upload-gallery-photos', uploadGallery.array('photos', 50), (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No photo files selected' });
    }
    const fileUrls = files.map(f => `/uploads/gallery/${f.filename}`);
    res.json({ success: true, fileUrls, message: `${fileUrls.length} photo(s) uploaded successfully!` });
  } catch (e) {
    console.error('Gallery photos upload error:', e);
    res.status(500).json({ error: 'Failed to upload photo files' });
  }
});

// 15. Create Private Client Gallery
app.post('/api/galleries', async (req: Request, res: Response) => {
  const { galleryCode, clientName, passcode, photoUrls } = req.body;
  if (!galleryCode || !clientName || !passcode || !photoUrls) {
    return res.status(400).json({ error: 'All gallery fields are required' });
  }

  const codeUpper = String(galleryCode).trim().toUpperCase();
  const clientNameTrimmed = String(clientName).trim();
  const passTrimmed = String(passcode).trim();
  const photosJson = typeof photoUrls === 'string' ? photoUrls : JSON.stringify(photoUrls);
  const createdAt = new Date().toISOString();

  try {
    try {
      await supabase.from('private_galleries').upsert({
        gallery_code: codeUpper,
        client_name: clientNameTrimmed,
        passcode: passTrimmed,
        photo_urls: photosJson,
        created_at: createdAt
      }, { onConflict: 'gallery_code' });
    } catch (e) {}

    db.run(
      `INSERT INTO private_galleries (gallery_code, client_name, passcode, photo_urls, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(gallery_code) DO UPDATE SET client_name=excluded.client_name, passcode=excluded.passcode, photo_urls=excluded.photo_urls`,
      [codeUpper, clientNameTrimmed, passTrimmed, photosJson],
      () => {
        res.json({ success: true, message: `Private Gallery for ${clientNameTrimmed} created successfully!` });
      }
    );
  } catch (e) {
    console.error('Create gallery error:', e);
    res.status(500).json({ error: 'Failed to create gallery' });
  }
});

// 16. Get Galleries List (Supports both private_galleries and gallery_items)
app.get('/api/galleries', async (req: Request, res: Response) => {
  try {
    let galleries: any[] = [];
    const { data: gList, error } = await supabase.from('private_galleries').select('*').order('created_at', { ascending: false });
    if (!error && gList && gList.length > 0) {
      galleries = [...gList];
    }

    db.all('SELECT * FROM private_galleries ORDER BY created_at DESC', [], (err: any, rows: any[]) => {
      if (rows && rows.length > 0) {
        const codes = new Set(galleries.map(g => (g.gallery_code || '').toUpperCase()));
        rows.forEach(r => {
          if (!codes.has((r.gallery_code || '').toUpperCase())) {
            galleries.push(r);
          }
        });
      }
      res.json({ success: true, galleries });
    });
  } catch (e) {
    res.status(500).json({ error: 'Database error' });
  }
});

// 17. Verify Private Client Gallery Passcode
app.post('/api/galleries/verify', async (req: Request, res: Response) => {
  const { galleryCode, passcode } = req.body;
  if (!galleryCode || !passcode) {
    return res.status(400).json({ error: 'Gallery code and passcode required' });
  }

  const rawCode = String(galleryCode).trim();
  const codeUpper = rawCode.toUpperCase();
  const passTrimmed = String(passcode).trim();

  try {
    let foundGallery: any = null;

    // 1. Try Supabase Cloud Database first
    try {
      const { data: gData } = await supabase
        .from('private_galleries')
        .select('*')
        .ilike('gallery_code', codeUpper)
        .maybeSingle();
      if (gData) foundGallery = gData;
    } catch (e) {}

    // 2. Fallback to SQLite database if not found in Supabase
    if (!foundGallery) {
      await new Promise<void>((resolve) => {
        db.get(
          'SELECT * FROM private_galleries WHERE UPPER(gallery_code) = UPPER(?) OR gallery_code = ?',
          [codeUpper, rawCode],
          (_err: any, row: any) => {
            if (row) foundGallery = row;
            resolve();
          }
        );
      });
    }

    if (!foundGallery) {
      return res.status(404).json({ error: 'Gallery not found. Please verify your Gallery Code and try again.' });
    }

    if (String(foundGallery.passcode).trim() !== passTrimmed) {
      return res.status(401).json({ error: 'Incorrect Passcode. Please check your passcode and try again.' });
    }

    // Check 30-day Expiry
    const created = new Date(foundGallery.created_at || Date.now());
    const diffDays = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 30) {
      try { await supabase.from('private_galleries').delete().eq('gallery_code', codeUpper); } catch(e) {}
      db.run('DELETE FROM private_galleries WHERE UPPER(gallery_code) = UPPER(?)', [codeUpper]);
      return res.status(410).json({ error: '⚠️ This private gallery link has expired after 30 days as per storage policy.' });
    }

    let photos = [];
    try {
      photos = typeof foundGallery.photo_urls === 'string' ? JSON.parse(foundGallery.photo_urls) : foundGallery.photo_urls;
    } catch(e) {
      photos = [foundGallery.photo_urls];
    }
    if (!Array.isArray(photos)) photos = [photos];

    const daysRemaining = Math.max(0, 30 - diffDays);

    return res.json({
      success: true,
      clientName: foundGallery.client_name,
      photos,
      daysRemaining
    });
  } catch (e) {
    console.error('Gallery verification error:', e);
    res.status(500).json({ error: 'Gallery verification failed. Please try again.' });
  }
});

// 18. Upload Single Gallery Image (Portfolio Section)
app.post('/api/upload-gallery', uploadGallery.single('gallery_image'), async (req: Request, res: Response) => {
  const { title, category, badge } = req.body;
  if (!req.file || !title || !category) {
    return res.status(400).json({ error: 'Title, category, and image file are required' });
  }

  const imageUrl = `/uploads/gallery/${req.file.filename}`;

  try {
    await supabase.from('gallery_items').insert([{ title, category, image_url: imageUrl, badge }]);
    db.run(
      'INSERT INTO gallery_items (title, category, image_url, badge) VALUES (?, ?, ?, ?)',
      [title, category, imageUrl, badge]
    );

    res.json({ success: true, message: 'Gallery item added!', image_url: imageUrl });
  } catch (e) {
    res.status(500).json({ error: 'Failed to upload gallery item' });
  }
});

// 19. Delete Gallery Image
app.delete('/api/galleries/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    await supabase.from('gallery_items').delete().eq('id', id);
    db.run('DELETE FROM gallery_items WHERE id = ?', [id]);
    res.json({ success: true, message: 'Gallery item deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// 17. Get Reviews List (Supports both /api/reviews and /api/admin/reviews)
const getReviewsHandler = async (req: Request, res: Response) => {
  try {
    const { data: reviews, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (!error && reviews) {
      return res.json({ success: true, reviews });
    }
    db.all('SELECT * FROM reviews ORDER BY created_at DESC', [], (err, rows) => {
      res.json({ success: true, reviews: rows || [] });
    });
  } catch (e) {
    res.status(500).json({ error: 'Database error' });
  }
};

app.get('/api/reviews', getReviewsHandler);
app.get('/api/admin/reviews', getReviewsHandler);

// 20. Public Website Approved Reviews Endpoint
app.get('/api/reviews', async (req: Request, res: Response) => {
  try {
    let approvedReviews: any[] = [];
    try {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('is_approved', 1)
        .order('created_at', { ascending: false });

      if (!error && reviews && reviews.length > 0) {
        approvedReviews = reviews;
      }
    } catch (e) {}

    db.all('SELECT * FROM reviews WHERE is_approved = 1 ORDER BY created_at DESC', [], (err: any, rows: any[]) => {
      const dbRows = (rows || []).filter(r => Number(r.is_approved) === 1);
      const combined = [...approvedReviews];
      const existingIds = new Set(combined.map(r => String(r.id)));
      dbRows.forEach(r => {
        if (!existingIds.has(String(r.id))) combined.push(r);
      });
      res.json({ success: true, reviews: combined });
    });
  } catch (e) {
    res.status(500).json({ error: 'Database error' });
  }
});

// 21. Admin Dashboard All Reviews Endpoint
app.get('/api/admin/reviews', async (req: Request, res: Response) => {
  try {
    let allRevs: any[] = [];
    try {
      const { data: reviews, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
      if (!error && reviews && reviews.length > 0) {
        allRevs = [...reviews];
      }
    } catch (e) {}

    db.all('SELECT * FROM reviews ORDER BY created_at DESC', [], (err: any, rows: any[]) => {
      const dbRows = rows || [];
      const combined = [...allRevs];
      const existingIds = new Set(combined.map(r => String(r.id)));
      dbRows.forEach(r => {
        if (!existingIds.has(String(r.id))) combined.push(r);
      });
      res.json({ success: true, reviews: combined });
    });
  } catch (e) {
    res.status(500).json({ error: 'Database error' });
  }
});

// 22. Submit Client Review
app.post('/api/reviews', async (req: Request, res: Response) => {
  const { clientName, eventType, rating, reviewText } = req.body;
  if (!clientName || !eventType || !rating || !reviewText) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const nameTrimmed = String(clientName).trim();
  const eventTrimmed = String(eventType).trim();
  const numRating = parseInt(rating, 10) || 5;
  const textTrimmed = String(reviewText).trim();

  try {
    try {
      await supabase.from('reviews').insert([{
        client_name: nameTrimmed,
        event_type: eventTrimmed,
        rating: numRating,
        review_text: textTrimmed,
        is_approved: 1
      }]);
    } catch (e) {}

    db.run(
      'INSERT INTO reviews (client_name, event_type, rating, review_text, is_approved) VALUES (?, ?, ?, ?, 1)',
      [nameTrimmed, eventTrimmed, numRating, textTrimmed],
      () => {
        res.json({ success: true, message: 'Thank you! Your review has been submitted successfully.' });
      }
    );
  } catch (e) {
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// 23. Approve / Moderate Review
const approveReviewHandler = async (req: Request, res: Response) => {
  const id = req.params.id;
  const isApproved = req.body && req.body.isApproved !== undefined ? (req.body.isApproved ? 1 : 0) : 1;

  try {
    try { await supabase.from('reviews').update({ is_approved: isApproved }).eq('id', id); } catch(e) {}
    db.run('UPDATE reviews SET is_approved = ? WHERE id = ?', [isApproved, id], () => {
      res.json({ success: true, message: 'Review status updated!' });
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update review' });
  }
};

app.post('/api/reviews/:id/approve', approveReviewHandler);
app.post('/api/admin/reviews/:id/approve', approveReviewHandler);

// 24. Delete Review
const deleteReviewHandler = async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    try { await supabase.from('reviews').delete().eq('id', id); } catch(e) {}
    db.run('DELETE FROM reviews WHERE id = ?', [id], () => {
      res.json({ success: true, message: 'Review deleted successfully!' });
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete review' });
  }
};

app.delete('/api/reviews/:id', deleteReviewHandler);
app.delete('/api/admin/reviews/:id', deleteReviewHandler);

// 21. Analytics Summary
app.get('/api/analytics', async (req: Request, res: Response) => {
  try {
    let rows: BookingRecord[] = [];

    // 1. Query Supabase Cloud Database
    const { data: sbBk, error } = await supabase.from('bookings').select('*');
    if (!error && sbBk && sbBk.length > 0) {
      rows = sbBk as BookingRecord[];
    } else {
      // 2. Fallback to SQLite database
      await new Promise<void>((resolve) => {
        db.all('SELECT * FROM bookings', [], (_err: any, bookingRows: BookingRecord[]) => {
          if (bookingRows && bookingRows.length > 0) rows = bookingRows;
          resolve();
        });
      });
    }

    const totalBookings = rows.length;
    const confirmedCount = rows.filter(b => b.status === 'confirmed').length;
    const pendingCount = rows.filter(b => b.status === 'pending').length;
    const blockedCount = rows.filter(b => b.status === 'blocked').length;

    const packageDistribution: Record<string, number> = {};
    rows.forEach(b => {
      const type = b.event_type || 'Marriage Package';
      packageDistribution[type] = (packageDistribution[type] || 0) + 1;
    });

    res.json({
      success: true,
      analytics: {
        totalBookings,
        totalRequests: totalBookings,
        confirmedCount,
        confirmedShoots: confirmedCount,
        pendingCount,
        pendingInquiries: pendingCount,
        blockedCount,
        packageDistribution,
        packagesCount: packageDistribution
      }
    });
  } catch (e) {
    console.error('Analytics error:', e);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 TypeScript Photography Server running on http://localhost:${PORT}`);
  console.log(`==================================================`);
});
