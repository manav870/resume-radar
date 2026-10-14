// ============================================
// Resume Radar — Express Application Server
//
// High-volume, AI-powered resume screening
// and HR recruitment analytics platform.
// ============================================

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const feedbackRoutes = require('./routes/feedback');

const app = express();
const PORT = process.env.PORT || 8080;

// ── Global Middleware ──
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ── Serve Frontend Static Assets ──
const frontendPublicPath = path.join(__dirname, '..', 'frontend', 'public');
app.use(express.static(frontendPublicPath));

// ── System Health & Diagnostic Endpoints ──
app.get(['/health', '/api/health'], (req, res) => {
    res.json({
        status: 'ok',
        service: 'Resume Radar Backend',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/status', (req, res) => {
    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
    const hasGoogleCreds = Boolean(
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        require('fs').existsSync(path.join(__dirname, 'service-account.json'))
    );

    res.json({
        status: 'online',
        service: 'Resume Radar',
        version: '1.0.0',
        config: {
            geminiConfigured: hasGeminiKey,
            googleDriveConfigured: hasGoogleCreds,
            port: PORT,
            nodeEnv: process.env.NODE_ENV || 'development'
        },
        timestamp: new Date().toISOString()
    });
});

// ── Mount Application Routes ──
// Support both /api/* and legacy /process-batch endpoints
app.use('/api', feedbackRoutes);
app.use('/process-batch', feedbackRoutes);

// ── Catch-all SPA routing ──
app.get('*', (req, res, next) => {
    // If request has file extension, attempt to serve it
    if (req.path.includes('.')) {
        const filePath = path.join(frontendPublicPath, req.path);
        return res.sendFile(filePath, (err) => {
            if (err) {
                res.status(404).send('Asset not found');
            }
        });
    }

    // Default to index.html for SPA page navigation
    res.sendFile(path.join(frontendPublicPath, 'index.html'));
});

// ── Global Error Handler ──
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// ── Start Express Server ──
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Resume Radar server running on http://localhost:${PORT}`);
    console.log(`📡 Health Check:  http://localhost:${PORT}/health`);
    console.log(`⚙️  System Status: http://localhost:${PORT}/api/status`);
    console.log(`====================================================`);
});
