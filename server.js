const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const BOXES = path.join(__dirname, 'boxes.json');
const PHONES = path.join(__dirname, 'allowedPhones.json');
const CLICKS = path.join(__dirname, 'clicks.json');

const ADMIN_PASS = process.env.ADMIN_PASS || 'changeme';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function load(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ---------- Public UI ----------
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'multi.html'));
});

// Data for game
app.get('/api/boxes', (_req, res) => {
  try { res.json(load(BOXES)); }
  catch (e) { res.status(500).json({ error: 'Failed to load boxes' }); }
});

// Resolve phone from last-4 digits
app.post('/api/resolve-phone', (req, res) => {
  const last4 = String((req.body && req.body.last4) || '').trim();
  if (last4.length !== 4) return res.json({ success:false, message:'Enter 4 digits' });

  const phones = load(PHONES);
  const matches = phones.filter(p => p.endsWith(last4));
  if (matches.length === 0) return res.json({ success:false, message:'Phone not found' });
  if (matches.length > 1) return res.json({ success:false, message:'Multiple phones match. Ask admin.' });

  const phone = matches[0];
  const clicks = load(CLICKS);
  if (clicks.some(c => c.phone === phone)) return res.json({ success:false, message:'Already played' });

  return res.json({ success:true, phone });
});

// Click a box
app.get('/click', (req, res) => {
  const { id, phone } = req.query;
  if (!id || !phone) return res.json({ success:false, message:'Missing id or phone' });

  const boxes = load(BOXES);
  const phones = load(PHONES);
  const clicks = load(CLICKS);

  if (!phones.includes(phone)) return res.json({ success:false, message:'Phone not allowed' });
  if (clicks.some(c => c.phone === phone)) return res.json({ success:false, message:'You already opened a box' });

  const box = boxes.find(b => b.id === id);
  if (!box) return res.json({ success:false, message:'Box not found' });
  if (box.used) return res.json({ success:false, message:'This box has already been used' });

  box.used = true;
  box.phone = phone;
  box.time = new Date().toISOString();
  clicks.push({ phone, boxId:id, number:box.number, time:box.time });

  save(BOXES, boxes);
  save(CLICKS, clicks);

  res.json({ success:true, number:box.number });
});

// ---------- Admin ----------
function adminAuth(req, res, next) {
  const key = req.headers['x-admin-pass'] || req.query.key;
  if (key === ADMIN_PASS) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/api/admin/summary', adminAuth, (_req, res) => {
  try {
    const boxes = load(BOXES);
    const clicks = load(CLICKS);
    const allowed = load(PHONES);
    res.json({ boxes, clicks, allowed });
  } catch (e) {
    res.status(500).json({ error: 'Failed to load admin data' });
  }
});

app.post('/api/admin/reset', adminAuth, (_req, res) => {
  const boxes = load(BOXES);
  boxes.forEach(b => { b.used = false; delete b.phone; delete b.time; });
  save(BOXES, boxes);
  save(CLICKS, []);
  res.json({ ok: true });
});

app.post('/api/admin/shuffle', adminAuth, (_req, res) => {
  let boxes = load(BOXES);
  const nums = [1,2,3,4,5,6,7,8,9];
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  boxes = boxes.map((b, i) => ({ id: b.id, number: nums[i], used:false }));
  save(BOXES, boxes);
  save(CLICKS, []);
  res.json({ ok: true });
});

app.post('/api/admin/allow', adminAuth, (req, res) => {
  const { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'phone required' });
  const list = load(PHONES);
  if (!list.includes(phone)) list.push(phone);
  save(PHONES, list);
  res.json({ ok: true });
});

app.delete('/api/admin/allow', adminAuth, (req, res) => {
  const phone = req.query.phone;
  if (!phone) return res.status(400).json({ error: 'phone required' });
  let list = load(PHONES);
  list = list.filter(x => x !== phone);
  save(PHONES, list);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
