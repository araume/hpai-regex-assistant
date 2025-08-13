import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import aiRouter from './routes/ai.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Connect to MongoDB Atlas
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.warn('Warning: MONGO_URI is not set. Logs will not be persisted.');
} else {
  mongoose
    .connect(mongoUri, {
      dbName: process.env.MONGO_DB_NAME || undefined
    })
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch((err) => console.error('MongoDB connection error:', err.message));
}

// API routes
app.use('/api', aiRouter);

// Landing route goes to profile selection
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'profile.html'));
});

// Serve frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});


