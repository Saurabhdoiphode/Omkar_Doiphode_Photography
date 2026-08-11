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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(process.cwd(), 'public')));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(express.static(process.cwd()));

// Ensure upload directories exist
const uploadDir = path.join(process.cwd(), 'uploads');
const logoDir = path.join(uploadDir, 'logos');
const profileDir = path.join(uploadDir, 'profile');
const galleryDir = path.join(uploadDir, 'gallery');

[uploadDir, logoDir, profileDir, galleryDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer Storage Engines
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, logoDir),
  filename: (req, file, cb) => cb(null, `logo_${Date.now()}${path.extname(file.originalname)}`)
});
const uploadLogo = multer({ storage: logoStorage });

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profileDir),
  filename: (req, file, cb) => cb(null, `profile_${Date.now()}${path.extname(file.originalname)}`)
});
const uploadProfile = multer({ storage: profileStorage });

const galleryStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, galleryDir),
  filename: (req, file, cb) => cb(null, `gallery_${Date.now()}${path.extname(file.originalname)}`)
});
const uploadGallery = multer({ storage: galleryStorage });

// Supabase Cloud Database Client
const SUPABASE_URL = 'https://wrirqfaewmuukxlowiuj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_LuEEzmcfbyMNCvfEqeykPg_ekpOCUFO';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('⚡ Supabase Cloud Database Client Connected!');

// SQLite Local Backup Database Initialization
let db: any;
try {
  const sqlite3 = (await import('sqlite3')).default;
  const dbPath = path.join(process.cwd(), 'photography.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('SQLite connection notice:', err.message);
    else console.log('Connected to SQLite local database');
  });
} catch (e) {
  console.log('⚡ Running in Supabase Cloud Mode (SQLite optional fallback bypassed)');
  db = {
    run: (_sql: string, params?: any, cb?: Function) => {
      const callback = typeof params === 'function' ? params : cb;
      if (callback) callback();
    },
    all: (_sql: string, params?: any, cb?: Function) => {
      const callback = typeof params === 'function' ? params : cb;
      if (callback) callback(null, []);
    },
    get: (_sql: string, params?: any, cb?: Function) => {
      const callback = typeof params === 'function' ? params : cb;
      if (callback) callback(null, null);
    },
    serialize: (cb?: Function) => {
      if (cb) cb();
    }
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

// 1. Get Active Logo
app.get('/api/current-logo', async (req: Request, res: Response) => {
  try {
    const { data: logo, error } = await supabase
      .from('logos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!error && logo) {
      return res.json({ success: true, logo_path: logo.logo_path });
    }

    db.get('SELECT logo_path FROM logos ORDER BY id DESC LIMIT 1', [], (err, row: any) => {
      if (row && row.logo_path) {
        return res.json({ success: true, logo_path: row.logo_path });
      }
      return res.json({ success: false, logo_path: null });
    });
  } catch (e) {
    res.json({ success: false, logo_path: null });
  }
});

// 2. Upload Brand Logo
app.post('/api/upload-logo', uploadLogo.single('logo'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No logo file provided' });
  }

  const logoPath = `/uploads/logos/${req.file.filename}`;

  try {
    await supabase.from('logos').insert([{ logo_path: logoPath }]);
    db.run('INSERT INTO logos (logo_path) VALUES (?)', [logoPath]);

    res.json({ success: true, message: 'Logo uploaded successfully!', logo_path: logoPath });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save logo' });
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
app.post('/api/upload-omkar-photo', uploadProfile.single('profile_photo'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No photo provided' });
  }

  const photoPath = `/uploads/profile/${req.file.filename}`;

  try {
    await supabase.from('profile_photo').insert([{ photo_path: photoPath }]);
    db.run('INSERT INTO profile_photo (photo_path) VALUES (?)', [photoPath]);

    res.json({ success: true, message: 'Profile photo updated!', photo_path: photoPath });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save photo' });
  }
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

    const whatsappAlertUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(alertMsg)}`;

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

    db.run('UPDATE bookings SET status = ? WHERE id = ? OR id = ?', [status, id, isNaN(numId) ? -1 : numId]);

    try {
      await supabase.from('bookings').update({ status }).eq('id', id);
    } catch (e) {}

    db.get('SELECT booking_date, client_phone FROM bookings WHERE id = ? OR id = ?', [id, isNaN(numId) ? -1 : numId], (err, row: any) => {
      if (row) {
        if (!bookingDate) bookingDate = row.booking_date;
        if (!clientPhone) clientPhone = row.client_phone;
      }

      setTimeout(async () => {
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
          return res.json({ success: true, message: `Booking status updated to ${status}` });
        }
      }, 30);
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

  try {
    const photosJson = typeof photoUrls === 'string' ? photoUrls : JSON.stringify(photoUrls);
    const createdAt = new Date().toISOString();

    await supabase.from('private_galleries').upsert({
      gallery_code: galleryCode.trim().toUpperCase(),
      client_name: clientName.trim(),
      passcode: passcode.trim(),
      photo_urls: photosJson,
      created_at: createdAt
    }, { onConflict: 'gallery_code' });

    db.run(
      `INSERT INTO private_galleries (gallery_code, client_name, passcode, photo_urls, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(gallery_code) DO UPDATE SET client_name=excluded.client_name, passcode=excluded.passcode, photo_urls=excluded.photo_urls`,
      [galleryCode.trim().toUpperCase(), clientName.trim(), passcode.trim(), photosJson]
    );

    res.json({ success: true, message: `Private Gallery for ${clientName} created successfully!` });
  } catch (e) {
    console.error('Create gallery error:', e);
    res.status(500).json({ error: 'Failed to create gallery' });
  }
});

// 16. Get Galleries List (Supports both private_galleries and gallery_items)
app.get('/api/galleries', async (req: Request, res: Response) => {
  try {
    const { data: gList, error } = await supabase.from('private_galleries').select('*').order('created_at', { ascending: false });
    if (!error && gList && gList.length > 0) {
      return res.json({ success: true, galleries: gList });
    }
    db.all('SELECT * FROM private_galleries ORDER BY created_at DESC', [], (err: any, rows: any[]) => {
      if (rows && rows.length > 0) {
        return res.json({ success: true, galleries: rows });
      }
      db.all('SELECT * FROM gallery_items ORDER BY id DESC', [], (err2: any, items: any[]) => {
        res.json({ success: true, galleries: items || [] });
      });
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

  const codeUpper = galleryCode.trim().toUpperCase();

  try {
    const { data: gData } = await supabase.from('private_galleries').select('*').eq('gallery_code', codeUpper).single();
    if (gData) {
      if (gData.passcode === passcode.trim()) {
        let photos = [];
        try { photos = JSON.parse(gData.photo_urls); } catch(e) { photos = [gData.photo_urls]; }
        return res.json({ success: true, clientName: gData.client_name, photos });
      } else {
        return res.status(401).json({ error: 'Incorrect Passcode' });
      }
    }

    db.get('SELECT * FROM private_galleries WHERE gallery_code = ?', [codeUpper], (err: any, row: any) => {
      if (!row) return res.status(404).json({ error: 'Gallery not found' });
      if (row.passcode !== passcode.trim()) return res.status(401).json({ error: 'Incorrect Passcode' });

      let photos = [];
      try { photos = JSON.parse(row.photo_urls); } catch(e) { photos = [row.photo_urls]; }
      res.json({ success: true, clientName: row.client_name, photos });
    });
  } catch (e) {
    res.status(500).json({ error: 'Gallery verification failed' });
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

// 18. Submit Client Review
app.post('/api/reviews', async (req: Request, res: Response) => {
  const { clientName, eventType, rating, reviewText } = req.body;
  if (!clientName || !eventType || !rating || !reviewText) {
    return res.status(400).json({ error: 'All fields required' });
  }

  try {
    await supabase.from('reviews').insert([{
      client_name: clientName,
      event_type: eventType,
      rating: parseInt(rating, 10),
      review_text: reviewText,
      is_approved: 1
    }]);

    db.run(
      'INSERT INTO reviews (client_name, event_type, rating, review_text, is_approved) VALUES (?, ?, ?, ?, 1)',
      [clientName, eventType, parseInt(rating, 10), reviewText]
    );

    res.json({ success: true, message: 'Review submitted successfully!' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// 19. Approve / Moderate Review (Supports both /api/reviews/:id/approve and /api/admin/reviews/:id/approve)
const approveReviewHandler = async (req: Request, res: Response) => {
  const id = req.params.id;
  const isApproved = req.body && req.body.isApproved !== undefined ? (req.body.isApproved ? 1 : 0) : 1;

  try {
    await supabase.from('reviews').update({ is_approved: isApproved }).eq('id', id);
    db.run('UPDATE reviews SET is_approved = ? WHERE id = ?', [isApproved, id]);
    res.json({ success: true, message: 'Review status updated!' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update review' });
  }
};

app.post('/api/reviews/:id/approve', approveReviewHandler);
app.post('/api/admin/reviews/:id/approve', approveReviewHandler);

// 20. Delete Review
const deleteReviewHandler = async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    await supabase.from('reviews').delete().eq('id', id);
    db.run('DELETE FROM reviews WHERE id = ?', [id]);
    res.json({ success: true, message: 'Review deleted!' });
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
