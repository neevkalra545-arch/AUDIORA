const express    = require('express');
const router     = express.Router();
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');

const db = require('../services/localDb');

// ── Sign JWT ──────────────────────────────────────────────────────────────────
function signToken(userId) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        // Fail fast to avoid running in an insecure configuration
        throw new Error('JWT_SECRET env var is required');
    }

    return jwt.sign(
        { id: userId },
        secret,
        { expiresIn: '7d' }
    );
}

// ── Send email ────────────────────────────────────────────────────────────────
async function sendResetEmail(to, name, resetURL) {
    // Only attempt email if credentials are configured
    if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your.gmail@gmail.com') {
        console.log('\n📧 [Email not configured — printing reset link to console instead]');
        console.log(`   To: ${to}`);
        console.log(`   Reset URL: ${resetURL}\n`);
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    await transporter.sendMail({
        from: `"Audiora 🎵" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Audiora – Reset Your Password',
        html: `
            <div style="font-family:'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#0d0d1a;border-radius:16px;overflow:hidden;border:1px solid rgba(139,92,246,0.2);">
                <div style="background:linear-gradient(135deg,#8b5cf6,#06b6d4);padding:28px 32px;text-align:center;">
                    <h1 style="color:#fff;margin:0;font-size:1.6rem;">🎵 Audiora</h1>
                    <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:0.9rem;">Password Reset Request</p>
                </div>
                <div style="padding:32px;">
                    <p style="color:#e2e8f0;font-size:1rem;margin:0 0 12px;">Hi <strong>${name}</strong>,</p>
                    <p style="color:#94a3b8;font-size:0.95rem;line-height:1.6;">Click the button below to reset your password. This link expires in <strong style="color:#f1f5f9;">15 minutes</strong>.</p>
                    <div style="text-align:center;margin:32px 0;">
                        <a href="${resetURL}" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-weight:600;font-size:1rem;display:inline-block;">
                            Reset My Password
                        </a>
                    </div>
                    <p style="color:#475569;font-size:0.82rem;text-align:center;">If you didn't request this, ignore this email.</p>
                    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0;">
                    <p style="color:#334155;font-size:0.78rem;word-break:break-all;">Or copy: <span style="color:#8b5cf6;">${resetURL}</span></p>
                </div>
            </div>
        `
    });
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password)
            return res.status(400).json({ success: false, message: 'All fields are required.' });

        if (name.trim().length < 2)
            return res.status(400).json({ success: false, message: 'Name must be at least 2 characters.' });

        if (!/^\S+@\S+\.\S+$/.test(email))
            return res.status(400).json({ success: false, message: 'Enter a valid email address.' });

        if (password.length < 8)
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });

        // Check duplicate
        const existing = db.findOne({ email: email.toLowerCase() });
        if (existing)
            return res.status(409).json({ success: false, message: 'An account with this email already exists.' });

        // Hash password
        const hashed = await bcrypt.hash(password, 12);

        // Save user
        const user = db.create({
            name:     name.trim(),
            email:    email.toLowerCase(),
            password: hashed,
            resetPasswordToken:   null,
            resetPasswordExpires: null
        });

        const token = signToken(user._id);
        console.log(`✅ New user registered: ${user.email}`);

        res.status(201).json({
            success: true,
            token,
            user: { name: user.name, email: user.email }
        });

    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({ success: false, message: 'Email and password are required.' });

        const user = db.findOne({ email: email.toLowerCase() });
        if (!user)
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });

        const token = signToken(user._id);
        console.log(`✅ User logged in: ${user.email}`);

        res.json({
            success: true,
            token,
            user: { name: user.name, email: user.email }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email)
            return res.status(400).json({ success: false, message: 'Email is required.' });

        const user = db.findOne({ email: email.toLowerCase() });

        // Always return success (don't reveal if email exists)
        if (!user) {
            return res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
        }

        // Generate raw token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

        // Save to user record
        db.save({
            ...user,
            resetPasswordToken:   hashedToken,
            resetPasswordExpires: Date.now() + 15 * 60 * 1000  // 15 minutes
        });

        const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password.html?token=${rawToken}`;

        await sendResetEmail(user.email, user.name, resetURL);

        res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });

    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ success: false, message: 'Failed to send reset email. Check server email config.' });
    }
});

// ── POST /api/auth/reset-password/:token ─────────────────────────────────────
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { password } = req.body;

        if (!password || password.length < 8)
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });

        // Hash the incoming token to compare with stored hash
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        // Find matching token that hasn't expired (use JSON DB helper)
        const users = db.findAll();
        const user = users.find(u =>
            u.resetPasswordToken === hashedToken &&
            u.resetPasswordExpires && u.resetPasswordExpires > Date.now()
        );


        if (!user)
            return res.status(400).json({ success: false, message: 'This reset link is invalid or has expired.' });

        // Hash new password
        const hashed = await bcrypt.hash(password, 12);

        db.save({
            ...user,
            password:             hashed,
            resetPasswordToken:   null,
            resetPasswordExpires: null
        });

        console.log(`✅ Password reset for: ${user.email}`);
        res.json({ success: true, message: 'Password updated successfully. You can now sign in.' });

    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ success: false, message: 'Server error. Please try again.' });
    }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer '))
            return res.status(401).json({ success: false, message: 'No token provided.' });

        const token   = authHeader.split(' ')[1];
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return res.status(500).json({ success: false, message: 'Server misconfigured (JWT_SECRET missing).' });
        }

        const decoded = jwt.verify(token, secret);
        const user    = db.findById(decoded.id);

        if (!user) return res.status(401).json({ success: false, message: 'User not found.' });

        res.json({ success: true, user: { name: user.name, email: user.email } });

    } catch (err) {
        res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
});

module.exports = router;
