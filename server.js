const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const csv = require('csv-parser');
const qrcode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle process-level errors to prevent crashes in cloud environments
process.on('uncaughtException', (err) => {
    console.error('CRITICAL ERROR: Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL ERROR: Unhandled Rejection at:', promise, 'reason:', reason);
});

// ════════════════ SECURE ADMIN AUTHENTICATION ════════════════
const sessions = new Map(); // token -> { userId, username, name, role }

// Helper to parse cookies manually
function getSessionToken(req) {
    const cookies = req.headers.cookie || '';
    return cookies.split(';').find(c => c.trim().startsWith('session_token='))?.split('=')[1];
}

// Authentication middleware
function requireAuth(req, res, next) {
    const token = getSessionToken(req);
    if (token && sessions.has(token)) {
        req.user = sessions.get(token); // Attach user info to request
        return next();
    }
    // If it's an API request, return 401 instead of redirecting
    if (req.originalUrl.startsWith('/api/')) {
        return res.status(401).json({ error: 'Unauthorized. Please login.' });
    }
    res.redirect('/login.html');
}

// Restrict access to the administration dashboard page
app.get('/admin.html', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Friendly redirect for /admin
app.get('/admin', (req, res) => {
    res.redirect('/admin.html');
});

// Admin login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const users = getUsers();
    
    // Find user by username AND password
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        sessions.set(token, {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role
        });
        res.setHeader('Set-Cookie', `session_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`); // 1 day
        res.json({ success: true, user: { name: user.name, role: user.role } });
    } else {
        res.status(401).json({ error: 'Invalid username or password' });
    }
});

// Admin session logout endpoint
app.post('/api/logout-admin', (req, res) => {
    const token = getSessionToken(req);
    if (token) {
        sessions.delete(token);
    }
    res.setHeader('Set-Cookie', 'session_token=; Path=/; HttpOnly; Max-Age=0');
    res.json({ success: true });
});

// Change password endpoint
app.post('/api/change-password', requireAuth, (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const users = getUsers();
    const userIdx = users.findIndex(u => u.id === req.user.id);
    
    if (userIdx === -1) {
        return res.status(404).json({ error: 'User not found' });
    }

    users[userIdx].password = newPassword;
    saveUsers(users);
    
    // Update active session info
    sessions.set(getSessionToken(req), {
        ...sessions.get(getSessionToken(req)),
        password: newPassword // Note: we don't usually store password in session, but just in case
    });

    res.json({ success: true, message: 'Password updated successfully' });
});

// Public RSVP endpoint (No authentication required)
app.post('/api/rsvp', (req, res) => {
    const { name, souls, message } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const contacts = getContacts();
    const newContact = {
        id: "RSVP-" + Date.now().toString(),
        name: name,
        phone: '', // Guest didn't provide phone in current UI, but we save the name
        souls: souls || 1,
        message: message || '',
        status: 'pending',
        sentAt: null,
        type: 'rsvp'
    };

    contacts.push(newContact);
    saveContacts(contacts);
    res.json({ success: true, contact: newContact });
});

// Apply authentication check to all other API endpoints
app.use('/api', (req, res, next) => {
    if (req.path === '/login') {
        return next();
    }
    requireAuth(req, res, next);
});

// Protect private server files from public static serving
app.use((req, res, next) => {
    const forbiddenPatterns = [
        /\.json$/i,
        /\.git/i,
        /\.env/i,
        /\.js$/i, // Block all scripts by default (server.js, etc.)
        /package/i,
        /wwebjs_auth/i
    ];
    
    // Explicitly allow public scripts and assets
    if (req.path === '/main.js' || req.path === '/index.css' || req.path === '/login.html') {
        return next();
    }
    
    const isForbidden = forbiddenPatterns.some(pattern => pattern.test(req.path));
    if (isForbidden) {
        return res.status(403).send('Forbidden');
    }
    next();
});

app.use(express.static(__dirname)); 

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Paths for persistent data
const CONTACTS_FILE = path.join(__dirname, 'contacts.json');
const TEMPLATES_FILE = path.join(__dirname, 'templates.json');
const GROUPS_FILE = path.join(__dirname, 'groups.json');

// Initialize files if they don't exist
if (!fs.existsSync(CONTACTS_FILE)) {
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify([
        { id: '1', name: 'Papa (Mock Contact)', phone: '919999999999', status: 'pending', sentAt: null, groupId: '' },
        { id: '2', name: 'Mummy (Mock Contact)', phone: '918888888888', status: 'pending', sentAt: null, groupId: '' }
    ], null, 2));
}
if (!fs.existsSync(GROUPS_FILE)) {
    fs.writeFileSync(GROUPS_FILE, JSON.stringify([
        { id: '1', name: 'Family' },
        { id: '2', name: 'Friends' },
        { id: '3', name: 'Colleagues' }
    ], null, 2));
}

const DEFAULT_TEMPLATES = [
    {
        id: '1',
        title: '🌸 Official Invitation (Formal)',
        body: '🌸 *AKSHAY WEDS HIMANSHI* 🌸\n\nDear {name},\n\nWe cordially invite you and your family to grace the auspicious occasion of our wedding union.\n\n📅 *Date:* July 7th, 2026\n📍 *Venue:* Taj Palace, Chanakyapuri, New Delhi\n\nPlease find our digital invitation card with complete details, venue itinerary, and RSVP here:\n🔗 http://localhost:3000\n\nWe eagerly await your presence to bless us.\n\nWarm regards,\n*Akshay & Himanshi*'
    },
    {
        id: '2',
        title: '🕺 Sangeet Invitation (Friendly/Vibrant)',
        body: '✨ *Time to dance! Akshay & Himanshi Sangeet* ✨\n\nHey {name}!\n\nGet ready to put on your dancing shoes! We invite you to join us for our Sangeet Night full of music, dance, and celebration.\n\n📅 *Date:* July 6th, 2026 • 7:00 PM\n📍 *Venue:* Grand Ballroom, Taj Palace, New Delhi\n\nCheck out the full itinerary and add your favorite song to our Sangeet Playlist here:\n🔗 http://localhost:3000\n\nSee you there!\n*Akshay & Himanshi*'
    },
    {
        id: '3',
        title: '🥂 Reception Invitation (Elegant)',
        body: '🥂 *Akshay & Himanshi — Wedding Reception* 🥂\n\nDear {name},\n\nPlease join us to celebrate our first evening as husband and wife at our Wedding Reception.\n\n📅 *Date:* July 8th, 2026 • 7:30 PM onwards\n📍 *Venue:* The Mughal Gardens, Taj Palace, New Delhi\n\nDigital Invite & Venue Directions:\n🔗 http://localhost:3000\n\nLooking forward to celebrating with you!\n*Akshay & Himanshi*'
    }
];

if (!fs.existsSync(TEMPLATES_FILE)) {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(DEFAULT_TEMPLATES, null, 2));
}

// ════════════════ MULTI-ACCOUNT WHATSAPP STATE ════════════════
const whatsappSessions = {};

// Helper to get session labels from users.json
function getSessionLabels() {
    const users = getUsers();
    const labels = {};
    users.forEach(u => {
        labels[u.username] = `${u.name}'s WhatsApp`;
    });
    // Ensure default is always there if needed
    if (!labels['default']) labels['default'] = 'Main Admin';
    return labels;
}

// Helper to get or create a session state
function getSession(sessionId = 'default') {
    const cleanId = sessionId.trim().toLowerCase();
    if (!whatsappSessions[cleanId]) {
        whatsappSessions[cleanId] = {
            id: cleanId,
            status: 'disconnected',
            qrCode: null,
            info: null,
            client: null
        };
    }
    return whatsappSessions[cleanId];
}

// Initialize WhatsApp Web client for a specific session
function initWhatsApp(sessionId = 'default') {
    const session = getSession(sessionId);
    if (session.client) {
        console.log(`[WhatsApp] [${sessionId}] Already initialized.`);
        return;
    }

    console.log(`[WhatsApp] [${sessionId}] Initializing client...`);
    session.status = 'connecting';
    session.qrCode = null;

    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: `session-${sessionId}`,
            dataPath: path.join(__dirname, '.wwebjs_auth')
        }),
        takeoverOnConflict: true,
        takeoverTimeoutMs: 0,
        puppeteer: {
            headless: true,
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-session-crashed-bubble',
                '--disable-infobars',
                '--no-first-run'
            ]
        }
    });

    session.client = client;

    client.on('qr', async (qr) => {
        console.log(`[WhatsApp] [${sessionId}] QR Code received. Generating data URL...`);
        try {
            session.status = 'disconnected';
            session.qrCode = await qrcode.toDataURL(qr);
        } catch (err) {
            console.error(`[WhatsApp] [${sessionId}] Failed to generate QR data URL:`, err);
        }
    });

    client.on('ready', () => {
        console.log(`[WhatsApp] [${sessionId}] Client is ready!`);
        session.status = 'ready';
        session.qrCode = null;
        session.info = client.info;
    });

    client.on('authenticated', () => {
        console.log(`[WhatsApp] [${sessionId}] Authenticated successfully!`);
    });

    client.on('auth_failure', (msg) => {
        console.error(`[WhatsApp] [${sessionId}] Authentication failure:`, msg);
        session.status = 'disconnected';
        session.qrCode = null;
    });

    client.on('disconnected', async (reason) => {
        console.log(`[WhatsApp] [${sessionId}] Client disconnected:`, reason);
        session.status = 'disconnected';
        session.qrCode = null;
        session.info = null;
        
        try {
            await client.destroy().catch(() => {});
        } catch (e) {}
        
        session.client = null;
        // Re-initialize after disconnection to show QR
        setTimeout(() => {
            initWhatsApp(sessionId);
        }, 5000);
    });

    client.initialize().catch(err => {
        console.error(`[WhatsApp] [${sessionId}] Initialization failed:`, err);
        session.status = 'disconnected';
    });
}

// Auto-initialize all previously connected sessions
function initAllSessions() {
    const authDir = path.join(__dirname, '.wwebjs_auth');
    // Always start default session
    initWhatsApp('default');
    
    if (!fs.existsSync(authDir)) return;
    
    try {
        const files = fs.readdirSync(authDir);
        files.forEach(file => {
            if (file.startsWith('session-session-')) {
                const sessionId = file.replace('session-session-', '');
                if (sessionId && sessionId !== 'default') {
                    initWhatsApp(sessionId);
                }
            }
        });
    } catch (err) {
        console.error('[WhatsApp] Failed to read auth directory:', err);
    }
}

initAllSessions();

// Graceful shutdown handling to ensure active Puppeteer session profiles are unlocked and saved cleanly
async function handleShutdown(signal) {
    console.log(`\n[System] Received ${signal}. Shutting down WhatsApp sessions gracefully to prevent session corruption...`);
    const promises = [];
    Object.keys(whatsappSessions).forEach(sessionId => {
        const session = whatsappSessions[sessionId];
        if (session.client) {
            console.log(`[System] Destroying client for session '${sessionId}'...`);
            promises.push(
                session.client.destroy()
                    .then(() => console.log(`[System] Client '${sessionId}' destroyed.`))
                    .catch(err => console.error(`[System] Error destroying client '${sessionId}':`, err))
            );
        }
    });
    
    // Wait up to 6 seconds for clean shutdown
    await Promise.race([
        Promise.all(promises),
        new Promise(resolve => setTimeout(resolve, 6000))
    ]);
    
    console.log('[System] Exit complete.');
    process.exit(0);
}

// Intercept Ctrl+C / terminating signals
process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

// Helper to format phone number to WhatsApp ID
function formatPhone(phone) {
    let cleaned = phone.toString().replace(/\D/g, '');
    // If it is 10 digits and starts with 7, 8, 9 (typical Indian number), prepend country code 91
    if (cleaned.length === 10 && /^[789]/.test(cleaned)) {
        cleaned = '91' + cleaned;
    }
    // Standard format is phone_number@c.us
    if (!cleaned.endsWith('@c.us')) {
        cleaned = cleaned + '@c.us';
    }
    return cleaned;
}

// Helper to load contacts
function getUsers() {
    try {
        if (!fs.existsSync('users.json')) return [];
        return JSON.parse(fs.readFileSync('users.json', 'utf8'));
    } catch (e) { return []; }
}

function saveUsers(users) {
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
}

function getContacts() {
    return JSON.parse(fs.readFileSync(CONTACTS_FILE, 'utf8'));
}

// Helper to save contacts
function saveContacts(contacts) {
    fs.writeFileSync(CONTACTS_FILE, JSON.stringify(contacts, null, 2));
}

// Helper to load templates
function getTemplates() {
    try { return JSON.parse(fs.readFileSync(TEMPLATES_FILE, 'utf8')); } catch (e) { return []; }
}
function saveTemplates(data) {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(data, null, 2));
}

function getGroups() {
    try { return JSON.parse(fs.readFileSync(GROUPS_FILE, 'utf8')); } catch (e) { return []; }
}
function saveGroups(data) {
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(data, null, 2));
}

// ════════════════ BULK SEND STATE ════════════════
let bulkSendState = {
    sending: false,
    total: 0,
    sent: 0,
    failed: 0,
    currentContact: '',
    errors: [],
    cancelRequested: false
};

// ════════════════ API ENDPOINTS ════════════════

// 1. WhatsApp Status
app.get('/api/status', (req, res) => {
    const sessionId = req.query.session || 'default';
    const session = getSession(sessionId);
    
    // Auto-initialize if session is selected but not active
    if (!session.client && session.status === 'disconnected') {
        console.log(`[WhatsApp] [${sessionId}] Status requested but not initialized. Starting now...`);
        initWhatsApp(sessionId);
    }
    
    const labels = getSessionLabels();
    const allSessions = [];
    
    // Build status for all users in users.json
    const users = getUsers();
    const userKeys = users.map(u => u.username);
    if (!userKeys.includes('default')) userKeys.push('default');

    userKeys.forEach(k => {
        const s = getSession(k);
        allSessions.push({
            id: k,
            label: labels[k] || k,
            status: s.status,
            info: s.info,
            qrCode: s.qrCode
        });
    });
    
    // Add any dynamic sessions not in userKeys
    Object.keys(whatsappSessions).forEach(k => {
        if (!userKeys.includes(k)) {
            const s = whatsappSessions[k];
            allSessions.push({
                id: k,
                label: `${k.charAt(0).toUpperCase() + k.slice(1)}'s WhatsApp`,
                status: s.status,
                info: s.info,
                qrCode: s.qrCode
            });
        }
    });

    res.json({
        activeSession: sessionId,
        status: session.status,
        qrCode: session.qrCode,
        info: session.info,
        allSessions: allSessions
    });
});

// Logout WhatsApp
app.post('/api/logout', async (req, res) => {
    const sessionId = req.body.session || 'default';
    try {
        const session = getSession(sessionId);
        if (session.client) {
            await session.client.logout();
            session.status = 'disconnected';
            session.qrCode = null;
            session.info = null;
            res.json({ success: true, message: `Logged out session '${sessionId}' successfully` });
        } else {
            res.status(400).json({ error: 'Client not initialized' });
        }
    } catch (err) {
        console.error(`Logout error for ${sessionId}:`, err);
        res.status(500).json({ error: err.message });
    }
});

// Restart WhatsApp client
app.post('/api/restart', async (req, res) => {
    const sessionId = req.body.session || 'default';
    try {
        const session = getSession(sessionId);
        if (session.client) {
            await session.client.destroy().catch(() => {});
            session.client = null;
        }
        initWhatsApp(sessionId);
        res.json({ success: true, message: `WhatsApp client '${sessionId}' restarting...` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create and initialize new custom WhatsApp session
app.post('/api/create-session', (req, res) => {
    const { name } = req.body;
    if (!name || !/^[a-zA-Z0-9_-]+$/.test(name)) {
        return res.status(400).json({ error: 'Invalid session name. Use letters, numbers, dashes, and underscores only.' });
    }
    const sessionId = name.toLowerCase().trim();
    if (whatsappSessions[sessionId] && whatsappSessions[sessionId].client) {
        return res.status(400).json({ error: `Session '${name}' already exists.` });
    }
    initWhatsApp(sessionId);
    res.json({ success: true, message: `Session '${name}' created and initializing.` });
});

// Get WhatsApp contacts list from the connected device
app.get('/api/whatsapp-contacts', async (req, res) => {
    const sessionId = req.query.session || 'default';
    const session = getSession(sessionId);
    if (session.status !== 'ready') {
        return res.status(400).json({ error: `WhatsApp session '${sessionId}' is not connected. Scan QR code first.` });
    }
    try {
        console.log(`[WhatsApp] Fetching contacts for session '${sessionId}'...`);
        const rawContacts = await session.client.getContacts();
        
        // Filter out groups, broadcasts, status updates, and only keep saved address book contacts
        const personalContacts = rawContacts
            .filter(c => c.isGroup === false && c.isMyContact === true && c.id.server === 'c.us' && !c.id._serialized.includes('status'))
            .map(c => ({
                id: c.id._serialized,
                name: c.name || c.pushname || c.number,
                phone: c.number,
                isMyContact: c.isMyContact
            }))
            // Sort contacts alphabetically by name
            .sort((a, b) => a.name.localeCompare(b.name));

        console.log(`[WhatsApp] Found ${personalContacts.length} personal contacts for session '${sessionId}'.`);
        res.json(personalContacts);
    } catch (err) {
        console.error(`[WhatsApp] Failed to fetch contacts for session '${sessionId}':`, err);
        res.status(500).json({ error: `Failed to fetch WhatsApp contacts: ` + err.message });
    }
});

// 2. Contacts CRUD
app.get('/api/contacts', (req, res) => {
    res.json(getContacts());
});

app.post('/api/contacts', (req, res) => {
    const { name, phone, groupId } = req.body;
    if (!name || !phone) {
        return res.status(400).json({ error: 'Name and phone are required' });
    }
    const contacts = getContacts();
    
    // Validate duplicates
    const cleanedPhone = phone.replace(/\D/g, '');
    const exists = contacts.find(c => c.phone.replace(/\D/g, '') === cleanedPhone);
    if (exists) {
        return res.status(400).json({ error: 'Contact with this phone already exists' });
    }

    const newContact = {
        id: Date.now().toString(),
        name,
        phone,
        groupId: groupId || '',
        status: 'pending',
        sentAt: null
    };
    contacts.push(newContact);
    saveContacts(contacts);
    res.json(newContact);
});

app.put('/api/contacts/:id', (req, res) => {
    const { id } = req.params;
    const { name, phone, status, groupId } = req.body;
    const contacts = getContacts();
    const idx = contacts.findIndex(c => c.id === id);
    if (idx === -1) {
        return res.status(404).json({ error: 'Contact not found' });
    }
    
    contacts[idx] = {
        ...contacts[idx],
        ...(name && { name }),
        ...(phone && { phone }),
        ...(status && { status }),
        ...(groupId !== undefined && { groupId })
    };
    saveContacts(contacts);
    res.json(contacts[idx]);
});

app.delete('/api/contacts/:id', (req, res) => {
    const { id } = req.params;
    const contacts = getContacts();
    const filtered = contacts.filter(c => c.id !== id);
    saveContacts(filtered);
    res.json({ success: true });
});

// 3. Templates API
app.get('/api/templates', (req, res) => {
    res.json(getTemplates());
});

app.post('/api/templates', (req, res) => {
    const { templates } = req.body;
    if (!Array.isArray(templates)) {
        return res.status(400).json({ error: 'Invalid templates array' });
    }
    saveTemplates(templates);
    res.json({ success: true, templates });
});

// 4. Groups API
app.get('/api/groups', (req, res) => {
    res.json(getGroups());
});

app.post('/api/groups', (req, res) => {
    const { groups } = req.body;
    if (!Array.isArray(groups)) {
        return res.status(400).json({ error: 'Invalid groups array' });
    }
    saveGroups(groups);
    res.json({ success: true, groups });
});

// 4. File Import (CSV)
const upload = multer({ dest: 'uploads/' });
app.post('/api/contacts/import', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv(['name', 'phone']))
        .on('data', (data) => {
            // Clean inputs
            const name = data.name ? data.name.trim() : '';
            const phone = data.phone ? data.phone.trim() : '';
            if (name && phone && name.toLowerCase() !== 'name') {
                results.push({ name, phone });
            }
        })
        .on('end', () => {
            const contacts = getContacts();
            let addedCount = 0;

            results.forEach(imported => {
                const cleanedPhone = imported.phone.replace(/\D/g, '');
                // Avoid duplicating phone
                const exists = contacts.find(c => c.phone.replace(/\D/g, '') === cleanedPhone);
                if (!exists) {
                    contacts.push({
                        id: (Date.now() + addedCount).toString(),
                        name: imported.name,
                        phone: imported.phone,
                        status: 'pending',
                        sentAt: null
                    });
                    addedCount++;
                }
            });

            saveContacts(contacts);
            // Delete temp file
            fs.unlinkSync(req.file.path);
            res.json({ success: true, added: addedCount, total: results.length });
        })
        .on('error', (err) => {
            res.status(500).json({ error: err.message });
        });
});

// 5. Send Single Message
app.post('/api/send-message', async (req, res) => {
    const { contactId, phone, message, session: sessionId } = req.body;
    
    const session = getSession(sessionId || 'default');
    if (session.status !== 'ready') {
        return res.status(400).json({ error: `Selected WhatsApp account '${sessionId || 'default'}' is not connected.` });
    }
    if (!phone || !message) {
        return res.status(400).json({ error: 'Phone and message are required' });
    }

    const formattedJid = formatPhone(phone);
    console.log(`[WhatsApp] [${session.id}] Sending message to ${formattedJid}...`);

    try {
        await session.client.sendMessage(formattedJid, message);
        
        // If a contact ID was passed, update their invitation status to 'sent'
        if (contactId) {
            const contacts = getContacts();
            const idx = contacts.findIndex(c => c.id === contactId);
            if (idx !== -1) {
                contacts[idx].status = 'sent';
                contacts[idx].sentAt = new Date().toISOString();
                saveContacts(contacts);
            }
        }
        res.json({ success: true });
    } catch (err) {
        console.error(`[WhatsApp] [${session.id}] Failed to send message to ${phone}:`, err);
        res.status(500).json({ error: err.message });
    }
});

// 6. Bulk Send Broadcast (with safety delay to avoid suspension)
app.post('/api/bulk-send', async (req, res) => {
    const { contactIds, templateId, customMessage, minDelay, maxDelay, session: sessionId } = req.body;

    const session = getSession(sessionId || 'default');
    if (session.status !== 'ready') {
        return res.status(400).json({ error: `Selected WhatsApp account '${sessionId || 'default'}' is not connected.` });
    }
    if (bulkSendState.sending) {
        return res.status(400).json({ error: 'A bulk broadcast is already in progress' });
    }
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({ error: 'No contacts selected for bulk sending' });
    }

    const contacts = getContacts();
    const targets = contacts.filter(c => contactIds.includes(c.id));
    
    if (targets.length === 0) {
        return res.status(400).json({ error: 'No valid contacts found' });
    }

    // Determine message contents
    let templateBody = null;
    if (templateId) {
        const templates = getTemplates();
        const tmpl = templates.find(t => t.id === templateId);
        if (tmpl) templateBody = tmpl.body;
    }

    // Setup delay limits (defaults: 5 to 10 seconds)
    const delayMin = parseInt(minDelay) || 5;
    const delayMax = parseInt(maxDelay) || 10;

    // Reset Bulk send state
    bulkSendState = {
        sending: true,
        total: targets.length,
        sent: 0,
        failed: 0,
        currentContact: '',
        errors: [],
        cancelRequested: false
    };

    res.json({ success: true, message: 'Bulk broadcast started in background', stats: bulkSendState });

    // Process bulk sending asynchronously
    (async () => {
        console.log(`[BulkSend] [${session.id}] Starting broadcast to ${targets.length} contacts...`);
        for (let i = 0; i < targets.length; i++) {
            if (bulkSendState.cancelRequested) {
                console.log(`[BulkSend] [${session.id}] Broadcast cancelled by user.`);
                bulkSendState.errors.push({ name: 'System', error: 'Cancelled by admin' });
                break;
            }

            const contact = targets[i];
            bulkSendState.currentContact = contact.name;
            const formattedJid = formatPhone(contact.phone);

            // Construct personalized message
            let msgText = customMessage || templateBody || 'You are invited to the Royal Wedding of Akshay & Himanshi!';
            msgText = msgText.replace(/{name}/g, contact.name);

            try {
                console.log(`[BulkSend] [${session.id}] Sending to ${contact.name} (${formattedJid})...`);
                await session.client.sendMessage(formattedJid, msgText);

                // Update contact state in memory and file
                const currentContacts = getContacts();
                const idx = currentContacts.findIndex(c => c.id === contact.id);
                if (idx !== -1) {
                    currentContacts[idx].status = 'sent';
                    currentContacts[idx].sentAt = new Date().toISOString();
                    saveContacts(currentContacts);
                }

                bulkSendState.sent++;
            } catch (err) {
                console.error(`[BulkSend] [${session.id}] Failed to send to ${contact.name}:`, err);
                bulkSendState.failed++;
                bulkSendState.errors.push({ name: contact.name, error: err.message });
            }

            // Apply delay between messages (except for the last one)
            if (i < targets.length - 1 && !bulkSendState.cancelRequested) {
                const randomDelay = Math.floor(Math.random() * (delayMax - delayMin + 1) + delayMin) * 1000;
                console.log(`[BulkSend] [${session.id}] Waiting for ${randomDelay / 1000}s to avoid account suspension...`);
                await new Promise(resolve => setTimeout(resolve, randomDelay));
            }
        }

        bulkSendState.sending = false;
        bulkSendState.currentContact = '';
        console.log(`[BulkSend] [${session.id}] Broadcast complete. Sent: ${bulkSendState.sent}, Failed: ${bulkSendState.failed}`);
    })();
});

// Get current bulk status
app.get('/api/bulk-status', (req, res) => {
    res.json(bulkSendState);
});

// Cancel bulk send
app.post('/api/bulk-cancel', (req, res) => {
    if (bulkSendState.sending) {
        bulkSendState.cancelRequested = true;
        res.json({ success: true, message: 'Cancellation request submitted' });
    } else {
        res.status(400).json({ error: 'No active bulk sending process' });
    }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`=============================================================`);
    console.log(`👑 AKSHIM WEDDING ROYAL INVITE SERVER RUNNING 👑`);
    console.log(`🔗 Admin Panel URL: http://localhost:${PORT}/admin.html`);
    console.log(`🔗 Wedding Invite Card URL: http://localhost:${PORT}`);
    console.log(`🚀 Akshim Wedding Server running at http://localhost:${PORT}`);
    console.log(`💡 Note: Manage users in users.json.`);
    console.log(`=============================================================`);
    
    // Auto-initialize default WhatsApp session on startup
    initWhatsApp('default');
});
