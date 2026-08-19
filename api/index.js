const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serverless MongoDB Connection Caching
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  
  if (!process.env.MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }

  const db = await mongoose.connect(process.env.MONGODB_URI);
  cachedDb = db;
  return db;
}

// Schema and Model for a Report matching the frontend structure
const reportSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  category: { type: String, required: true },
  severity: { type: String, required: true },
  status: { type: String, default: 'reported' }, // 'reported', 'progress', 'fixed'
  reporter: { type: String, default: 'Anonymous' },
  lat: { type: Number },
  lng: { type: Number },
  date: { type: Date, default: Date.now }
});

// Avoid OverwriteModelError in serverless environments
const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);

// Routes
app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to the Road Safety Portal API!' });
});

// Get all reports
app.get('/api/reports', async (req, res) => {
  try {
    await connectToDatabase();
    const reports = await Report.find().sort({ date: -1 });
    
    // Map _id to id for frontend compatibility
    const formattedReports = reports.map(r => ({
      ...r.toObject(),
      id: r._id.toString()
    }));
    
    res.json(formattedReports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Create a new report
app.post('/api/reports', async (req, res) => {
  try {
    await connectToDatabase();
    const newReport = new Report({
      title: req.body.title,
      description: req.body.description,
      location: req.body.location,
      category: req.body.category,
      severity: req.body.severity,
      status: req.body.status || 'reported',
      reporter: req.body.reporter || 'Anonymous',
      lat: req.body.lat,
      lng: req.body.lng,
      date: req.body.date || new Date()
    });
    const savedReport = await newReport.save();
    
    // Send back with id
    res.status(201).json({
      ...savedReport.toObject(),
      id: savedReport._id.toString()
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: 'Failed to create report' });
  }
});

// Export the Express API for Vercel
module.exports = app;
