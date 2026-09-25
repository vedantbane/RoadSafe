const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { createSessionToken, hashPassword, TOKEN_TTL_SECONDS, verifyPassword, verifyToken } = require('./auth');
require('dotenv').config();

const app = express();
const REPORT_STATUSES = ['Pending', 'Under Review', 'In Progress', 'Resolved', 'Rejected'];

app.use(cors());
app.use(express.json());

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  if (!process.env.MONGODB_URI) throw new Error('Please define the MONGODB_URI environment variable');
  cachedDb = await mongoose.connect(process.env.MONGODB_URI);
  return cachedDb;
}

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user', required: true }
}, { timestamps: true });

const reportSchema = new mongoose.Schema({
  title: { type: String, required: true }, description: { type: String, required: true }, location: { type: String, required: true },
  category: { type: String, required: true }, severity: { type: String, required: true },
  status: { type: String, enum: REPORT_STATUSES, default: 'Pending', required: true }, reporter: { type: String, default: 'Anonymous' },
  reporterEmail: { type: String, default: '' }, reporterPhone: { type: String, default: '' },
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, lat: { type: Number }, lng: { type: Number }, date: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);

function getTokenFromRequest(req) {
  const authorization = req.get('authorization');
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7).trim();
  const cookie = req.get('cookie') || '';
  const item = cookie.split(';').map(part => part.trim()).find(part => part.startsWith('roadsafe_session='));
  if (!item) return null;
  try { return decodeURIComponent(item.slice('roadsafe_session='.length)); } catch { return null; }
}

function publicUser(user) {
  return { id: user._id.toString(), name: user.name || '', email: user.email, role: user.role };
}

async function requireAuthenticated(req, res, next) {
  try {
    const payload = verifyToken(getTokenFromRequest(req));
    if (!payload) return res.status(401).json({ error: 'Unauthorized' });
    await connectToDatabase();
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = user;
    return next();
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Authentication is unavailable' });
  }
}

async function requireAdmin(req, res, next) {
  return requireAuthenticated(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    return next();
  });
}

async function attachUserWhenAuthenticated(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) return next();
  try {
    await connectToDatabase();
    const payload = verifyToken(token);
    if (payload) req.user = await User.findById(payload.sub);
  } catch (err) { console.error(err); }
  return next();
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.set('Set-Cookie', `roadsafe_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${TOKEN_TTL_SECONDS}${secure}`);
}
function clearSessionCookie(res) { res.set('Set-Cookie', 'roadsafe_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'); }
function formatReport(report) { const plain = report.toObject ? report.toObject() : report; return { ...plain, id: plain._id.toString() }; }

app.get('/api', (req, res) => res.json({ message: 'Welcome to the Road Safety Portal API!' }));

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'role')) return res.status(400).json({ error: 'Role cannot be set during registration' });
    if (!email || !/^\S+@\S+\.\S+$/.test(String(email)) || typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'A valid email and password of at least 8 characters are required' });
    await connectToDatabase();
    const normalizedEmail = String(email).trim().toLowerCase();
    if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ error: 'An account with this email already exists' });
    const user = await User.create({ name: String(name || '').trim(), email: normalizedEmail, passwordHash: hashPassword(password), role: 'user' });
    setSessionCookie(res, createSessionToken(user._id));
    return res.status(201).json({ user: publicUser(user) });
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Unable to register account' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) return res.status(400).json({ error: 'Email and password are required' });
    await connectToDatabase();
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
    if (!user || !verifyPassword(password, user.passwordHash)) return res.status(401).json({ error: 'Invalid email or password' });
    setSessionCookie(res, createSessionToken(user._id));
    return res.json({ user: publicUser(user) });
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Unable to sign in' }); }
});

app.post('/api/auth/promote-admin', requireAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.json({ user: publicUser(user) });
    user.role = 'admin';
    await user.save();
    return res.json({ user: publicUser(user) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Unable to promote account to admin' });
  }
});

app.post('/api/auth/logout', (req, res) => { clearSessionCookie(res); res.status(204).end(); });
app.get('/api/auth/me', requireAuthenticated, (req, res) => res.json({ user: publicUser(req.user) }));
app.get('/api/reports', async (req, res) => { try { await connectToDatabase(); const reports = await Report.find().sort({ date: -1 }); res.json(reports.map(formatReport)); } catch (err) { console.error(err); res.status(500).json({ error: 'Unable to load reports' }); } });
app.get('/api/reports/mine', requireAuthenticated, async (req, res) => { try { const reports = await Report.find({ reporterId: req.user._id }).sort({ date: -1 }); res.json(reports.map(formatReport)); } catch (err) { console.error(err); res.status(500).json({ error: 'Unable to load your reports' }); } });
app.post('/api/reports', attachUserWhenAuthenticated, async (req, res) => { try { await connectToDatabase(); const body = req.body || {}; const report = new Report({ title: body.title, description: body.description, location: body.location, category: body.category, severity: body.severity, status: 'Pending', reporter: body.reporter || 'Anonymous', reporterEmail: body.reporterEmail || '', reporterPhone: body.reporterPhone || '', reporterId: req.user?._id || null, lat: body.lat, lng: body.lng, date: body.date || new Date() }); await report.save(); return res.status(201).json(formatReport(report)); } catch (err) { console.error(err); return res.status(500).json({ error: 'Unable to submit report' }); } });

app.patch('/api/reports/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  if (!REPORT_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid report status' });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid report id' });
  try {
    const report = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!report) return res.status(404).json({ error: 'Report not found' });
    return res.json(formatReport(report));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Unable to update report status' });
  }
});

module.exports = app;
module.exports.requireAdmin = requireAdmin;
module.exports.REPORT_STATUSES = REPORT_STATUSES;
