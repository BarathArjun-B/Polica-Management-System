require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const QRCode = require('qrcode');
const crypto = require('crypto');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true
}));

// --- SCHEMAS ---
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: Number, required: true, default: 1 }, // 1=Constable, 2=Inspector, 3=Commissioner
    roleName: { type: String, required: true, default: 'CONSTABLE' },
    email: { type: String, required: true, unique: true },
    otp: { type: String, default: null }
});

const MessageSchema = new mongoose.Schema({
    sender: { type: String, required: true },
    receiver: { type: String, required: true },
    encryptedContent: { type: String, required: true },
    iv: { type: String, required: true },
    salt: { type: String, required: true },
    signature: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', MessageSchema);
const User = mongoose.model('User', UserSchema);

// --- SEEDING ---
const seedUsers = async () => {
    try {
        const count = await User.countDocuments();
        if (count === 0) {
            console.log('Seeding Database...');
            const pwhash = await bcrypt.hash('password123', 10);
            const vishalHash = await bcrypt.hash('karthikvishal', 10);

            const usersToSeed = [
                // Admin Commissioner
                { username: 'vishal', password: vishalHash, role: 3, roleName: 'COMMISSIONER', email: 'vishal@vanguard.com' },
                // 3 Commissioners
                { username: 'commissioner', password: pwhash, role: 3, roleName: 'COMMISSIONER', email: 'comm@vanguard.com' },
                { username: 'comm_sharma', password: pwhash, role: 3, roleName: 'COMMISSIONER', email: 'sharma@vanguard.com' },
                { username: 'comm_patel', password: pwhash, role: 3, roleName: 'COMMISSIONER', email: 'patel@vanguard.com' },
                // 4 Inspectors
                { username: 'inspector', password: pwhash, role: 2, roleName: 'INSPECTOR', email: 'insp@vanguard.com' },
                { username: 'insp_kumar', password: pwhash, role: 2, roleName: 'INSPECTOR', email: 'kumar@vanguard.com' },
                { username: 'insp_singh', password: pwhash, role: 2, roleName: 'INSPECTOR', email: 'singh@vanguard.com' },
                { username: 'insp_verma', password: pwhash, role: 2, roleName: 'INSPECTOR', email: 'verma@vanguard.com' },
                // Default Constable
                { username: 'constable', password: pwhash, role: 1, roleName: 'CONSTABLE', email: 'constable@vanguard.com' },
                // New Requested User
                { username: 'karthik', password: await bcrypt.hash('abcd', 10), role: 1, roleName: 'CONSTABLE', email: 'karthik@vanguard.com' },
                // Custom Commissioner
                { username: 'barath', password: await bcrypt.hash('barath', 10), role: 3, roleName: 'COMMISSIONER', email: 'baratharjunb@gmail.com' }
            ];

            await User.insertMany(usersToSeed);
            console.log('Database Seeded!');
        }
    } catch (err) {
        console.error('Seeding Error:', err);
    }
};

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/police_command')
    .then(() => {
        console.log('MongoDB Connected');
        seedUsers();
    })
    .catch(err => console.error('MongoDB Connection Error:', err));


// --- CRYPTO CONFIG ---
const JWT_SECRET = crypto.randomBytes(64).toString('hex');
const ENCRYPTION_KEY = crypto.randomBytes(32);
const IV = crypto.randomBytes(16);
const SIGNING_SECRET = crypto.randomBytes(64).toString('hex');

// --- MESSAGING CRYPTO ---
// Derive a key from the master secret + a random salt per message
const deriveKey = (salt) => {
    return crypto.pbkdf2Sync(JWT_SECRET, salt, 10000, 32, 'sha512');
};

const encryptMessage = (text) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const iv = crypto.randomBytes(16);
    const key = deriveKey(salt);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Sign the encrypted content + IV + Salt to ensure integrity
    const signaturePayload = `${encrypted}.${iv.toString('hex')}.${salt}`;
    const signature = crypto.createHmac('sha256', SIGNING_SECRET).update(signaturePayload).digest('hex');

    return {
        encrypted,
        iv: iv.toString('hex'),
        salt,
        signature
    };
};

const decryptMessage = (encrypted, ivHex, salt, signature) => {
    // 1. Verify Signature
    const signaturePayload = `${encrypted}.${ivHex}.${salt}`;
    const expectedSignature = crypto.createHmac('sha256', SIGNING_SECRET).update(signaturePayload).digest('hex');

    if (signature !== expectedSignature) {
        throw new Error('Message integrity compromised: Invalid Signature');
    }

    // 2. Decrypt
    const key = deriveKey(salt);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(ivHex, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};

// Confidential Case File
const secretIntel = "CASE FILE #2024-CR-7891: EVIDENCE LOCATION SECTOR-7, LOCKER-42";
let encryptedVault = null;

const encryptIntel = () => {
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
    let encrypted = cipher.update(secretIntel, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    encryptedVault = encrypted; // This is what is "stored"
};
encryptIntel();

const { sendOTP } = require('./utils/emailService');

// --- HELPERS ---
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const getRoleName = (role) => {
    if (role === 3) return 'COMMISSIONER';
    if (role === 2) return 'INSPECTOR';
    return 'CONSTABLE';
}

// --- MIDDLEWARE ---
const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Access Denied' });

    try {
        const verified = jwt.verify(token, JWT_SECRET);
        req.user = verified;
        next();
    } catch (err) {
        res.status(400).json({ error: 'Invalid Token' });
    }
};

const requireRole = (roleLevel) => {
    return (req, res, next) => {
        if (req.user.role < roleLevel) {
            return res.status(403).json({ error: 'Insufficient Clearance Level' });
        }
        next();
    };
};

// --- ROUTES ---

// RESET DB
app.post('/api/reset-db', async (req, res) => {
    try {
        await User.deleteMany({});
        await Message.deleteMany({});
        // Re-seed with default users? Maybe not, allow fresh start
        console.log('[DB] Database reset complete');
        res.json({ message: 'System database reset successful. All records purged.' });
    } catch (err) {
        res.status(500).json({ error: 'Reset failed' });
    }
});

// REGISTER
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email, role } = req.body;
        if (!username || !password || !email) return res.status(400).json({ error: 'All fields required' });

        const hashedPassword = await bcrypt.hash(password, 10);

        let roleName = 'Constable';
        let roleLevel = 1;

        // Basic auto-assignment logic for demo
        if (username.toLowerCase().includes('comm')) { roleLevel = 3; roleName = 'Commissioner'; }
        else if (username.toLowerCase().includes('insp')) { roleLevel = 2; roleName = 'Inspector'; }

        // Allow manual override for testing specific roles
        if (role) roleLevel = role;

        await User.create({
            username,
            password: hashedPassword,
            email,
            role: roleLevel,
            roleName
        });

        res.status(201).json({ message: 'Officer profile created successfully' });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: 'Username or Email already exists' });
    }
});

// LOGIN (STEP 1) -> Password Check -> Generate OTP
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ error: 'User not found' });

        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ error: 'Invalid password' });

        const otp = generateOTP();
        user.otp = otp;
        await user.save();

        // Sending OTP via Email
        const emailSent = await sendOTP(user.email, otp, user.username);

        if (emailSent) {
            console.log(`[OTP] Sent to ${user.email} for ${username}`);
            res.json({ message: 'Credentials verified. OTP sent to secure email.', step: 'otp', username });
        } else {
            // Fallback for demo if email fails (e.g. invalid credentials in .env)
            console.log(`[OTP] EMAIL FAILED. Fallback Console: ${otp}`);
            res.json({ message: 'Credentials verified. check system console for OTP (Email Failed).', step: 'otp', username });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// VERIFY OTP (STEP 2) -> JWT Token
app.post('/api/verify-otp', async (req, res) => {
    try {
        const { username, otp } = req.body;
        const user = await User.findOne({ username });

        if (!user || user.otp !== otp) {
            return res.status(400).json({ error: 'Invalid Code' });
        }

        // Clear OTP after use
        user.otp = null;
        await user.save();

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role, roleName: user.roleName },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.cookie('token', token, { httpOnly: true, sameSite: 'lax' });

        res.json({
            message: 'Login Successful',
            user: { username: user.username, role: user.role, roleName: user.roleName }
        });
    } catch (err) {
        res.status(500).json({ error: 'Verification failed' });
    }
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out' });
});



// 3. Personnel Management (Commissioner Only)
app.get('/api/users', verifyToken, requireRole(3), async (req, res) => {
    try {
        const users = await User.find({}, 'username role roleName');
        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: 'Fetch Failed' });
    }
});

// Promote/Demote
app.patch('/api/users/:id/role', verifyToken, requireRole(3), async (req, res) => {
    const { role } = req.body; // New role level
    const targetUserId = req.params.id;

    if (![1, 2].includes(role)) {
        return res.status(400).json({ error: 'Invalid Role Assignment. Can only set Constable(1) or Inspector(2).' });
    }

    try {
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        if (targetUser.role === 3) {
            return res.status(403).json({ error: 'Cannot modify rank of a fellow Commissioner.' });
        }

        targetUser.role = role;
        targetUser.roleName = getRoleName(role);
        await targetUser.save();

        res.json({ message: `Officer ${role === 2 ? 'promoted to' : 'demoted to'} ${targetUser.roleName}` });
    } catch (err) {
        res.status(500).json({ error: 'Update Failed' });
    }
});

// 4. Feature Routes
app.get('/api/me', verifyToken, async (req, res) => {
    const identityString = JSON.stringify({
        id: req.user.username,
        role: req.user.roleName,
        clearance: req.user.role
    });
    const base64Identity = Buffer.from(identityString).toString('base64');

    try {
        const qrCodeUrl = await QRCode.toDataURL(base64Identity);
        res.json({ user: req.user, qrCode: qrCodeUrl });
    } catch (err) {
        res.status(500).json({ error: 'QR Generation Failed' });
    }
});

app.get('/api/vault', verifyToken, requireRole(3), (req, res) => {
    res.json({
        encryptedData: encryptedVault,
        key: ENCRYPTION_KEY.toString('hex'),
        iv: IV.toString('hex')
    });
});

app.get('/api/logistics', verifyToken, requireRole(2), (req, res) => {
    res.json({
        data: [
            { id: 1, item: 'Service Pistol (9mm)', quantity: 120, status: 'In Stock' },
            { id: 2, item: 'Patrol Vehicle', quantity: 25, status: 'Operational' },
            { id: 3, item: 'Body Camera', quantity: 85, status: 'Low' },
            { id: 4, item: 'Bulletproof Vest', quantity: 200, status: 'In Stock' },
            { id: 5, item: 'Radio Handset', quantity: 150, status: 'In Stock' }
        ]
    });
});

app.post('/api/sign', verifyToken, requireRole(3), (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    const hash = crypto.createHash('sha256').update(message).digest('hex');
    const signature = crypto.createHmac('sha256', SIGNING_SECRET).update(hash).digest('hex');
    res.json({ message, hash, signature });
});

app.post('/api/verify', verifyToken, (req, res) => {
    const { message, signature } = req.body;
    const hash = crypto.createHash('sha256').update(message).digest('hex');
    const expectedSignature = crypto.createHmac('sha256', SIGNING_SECRET).update(hash).digest('hex');

    if (signature === expectedSignature) {
        res.json({ valid: true, status: 'Document verified. Signature is authentic.' });
    } else {
        res.json({ valid: false, status: 'Warning: Signature invalid. Document may be tampered.' });
    }
});

// 5. Secure Messaging Routes
app.get('/api/recipients', verifyToken, async (req, res) => {
    try {
        // Return all users except self
        const users = await User.find({ username: { $ne: req.user.username } }, 'username roleName');
        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch recipients' });
    }
});

app.post('/api/messages', verifyToken, async (req, res) => {
    const { receiver, content } = req.body;
    try {
        const destUser = await User.findOne({ username: receiver });
        if (!destUser) return res.status(404).json({ error: 'Recipient not found' });

        const { encrypted, iv, salt, signature } = encryptMessage(content);

        const newMessage = new Message({
            sender: req.user.username,
            receiver: receiver,
            encryptedContent: encrypted,
            iv,
            salt,
            signature
        });

        await newMessage.save();
        res.json({ message: 'Message sent securely' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

app.get('/api/messages', verifyToken, async (req, res) => {
    try {
        // Fetch inbox
        const messages = await Message.find({ receiver: req.user.username }).sort({ timestamp: -1 });
        res.json({ messages });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

app.post('/api/messages/decrypt', verifyToken, async (req, res) => {
    const { messageId } = req.body;
    try {
        const msg = await Message.findById(messageId);
        if (!msg) return res.status(404).json({ error: 'Message not found' });

        if (msg.receiver !== req.user.username && msg.sender !== req.user.username) {
            return res.status(403).json({ error: 'Access Denied' });
        }

        try {
            const decryptedContent = decryptMessage(msg.encryptedContent, msg.iv, msg.salt, msg.signature);
            res.json({ content: decryptedContent, verified: true });
        } catch (decryptErr) {
            res.status(400).json({ error: 'Decryption failed: ' + decryptErr.message, verified: false });
        }
    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Police Command Center running on port ${PORT}`);
});
