const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const feedbackRoutes = require('./routes/feedback');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend', 'public')));

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Mount Routes
app.use('/process-batch', feedbackRoutes);

// Fallback: serve index.html for unmatched routes (SPA-style)
app.get('*', (req, res) => {
    const requestedFile = path.join(__dirname, '..', 'frontend', 'public', req.path);
    res.sendFile(requestedFile, (err) => {
        if (err) {
            res.sendFile(path.join(__dirname, '..', 'frontend', 'public', 'index.html'));
        }
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 GradeFlow server is running on http://localhost:${PORT}`);
});
