require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const csv = require('csv-parser');
const qrcode = require('qrcode');
const webpush = require('web-push');
const AdmZip = require('adm-zip');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');


const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    realtime: {
        params: { eventsPerSecond: 10 },
        transport: WebSocket
    }
});

// Configure Web Push
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BGWBSIM3yGvRpSTLB0nhEnUXvY_KKIFtoFj3jzhzAVq1h6F-ZDmSybAJkEf24Tq01D3zYZ9PyrXLLxOeUI5ABBo';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'wQDWNLyHMnJiExXbEmG3OZFAZXODalsi0AgkaUVtutw';
webpush.setVapidDetails('mailto:admin@akshimwedding.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle process-level errors
process.on('uncaughtException', (err) => console.error('CRITICAL ERROR:', err));
process.on('unhandledRejection', (reason) => console.error('CRITICAL REJECTION:', reason));

// ════════════════ STATE ════════════════
const sessions = new Map(); // Admin sessions
const guestSessions = new Map(); // Guest sessions
const guestOtps = new Map(); // WhatsApp OTPs
const whatsappSessions = {}; // Legacy support for UI
const WASENDER_API_KEY = "944761c74d762fedce7a72fed5de7230d306c7264bf6e2cd7ece49618a6afb9a";
const WASENDER_BASE_URL = "https://www.wasenderapi.com/api";

let bulkSendState = { sending: false, total: 0, sent: 0, failed: 0, currentContact: '', errors: [], cancelRequested: false };

async function sendWhatsAppMessage(phone, text, imageUrl = null) {
    try {
        let formatted = phone.replace(/\D/g, '');
        if (!formatted.startsWith('91') && formatted.length === 10) formatted = '91' + formatted;
        
        // Use raw number, WASender handles JID internally.
        const to = formatted;
        
        console.log(`[WASenderAPI] Sending ${imageUrl ? 'MEDIA' : 'TEXT'} to ${to}...`);
        
        // Use /send-message for everything (including media)
        const endpoint = `${WASENDER_BASE_URL}/send-message`;
        const body = { to, text };
        if (imageUrl) {
            body.imageUrl = imageUrl;
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WASENDER_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        // Handle Rate Limiting (Free Trial 1 min limit)
        if (data.retry_after) {
            const waitTime = (data.retry_after + 3) * 1000;
            console.log(`[WASenderAPI] Rate limited. Waiting ${waitTime/1000}s before retry...`);
            await new Promise(r => setTimeout(r, waitTime));
            return sendWhatsAppMessage(phone, text, imageUrl); 
        }

        if (!response.ok || data.success === false) {
            throw new Error(data.message || 'API Error');
        }
        
        console.log(`[WASenderAPI] Success for ${to}`);
        return data;
    } catch (err) {
        console.error('[WASenderAPI] Failed:', err.message);
        throw err;
    }
}

// ════════════════ DATA HELPERS (SUPABASE) ════════════════
async function getUsers() {
    const { data, error } = await supabase.from('users').select('*');
    if (error) console.error('[Supabase] getUsers error:', error);
    return data || [];
}
async function saveUser(user) {
    const { error } = await supabase.from('users').upsert(user);
    if (error) console.error('[Supabase] saveUser error:', error);
}
async function getContacts() {
    const { data, error } = await supabase.from('guests').select('*');
    if (error) console.error('[Supabase] getContacts error:', error);
    return data || [];
}
async function saveContact(contact) {
    if (!contact.id) {
        contact.id = 'guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    } else {
        // Fetch existing contact if name or phone is missing to prevent NOT NULL constraint errors on upsert
        if (contact.name === undefined || contact.phone === undefined) {
            const { data: existing, error: getErr } = await supabase.from('guests').select('*').eq('id', contact.id).maybeSingle();
            if (!getErr && existing) {
                contact = { ...existing, ...contact };
            }
        }
    }
    
    // Build a sparse payload to support partial updates (like one-tap approval)
    const payload = { id: contact.id };
    
    const add = (dbKey, val) => { if (val !== undefined) payload[dbKey] = val; };

    add('name', contact.name);
    add('phone', contact.phone);
    add('status', contact.status);
    
    // Support multiple group IDs
    const gids = contact.groupIds || contact.group_ids;
    if (gids !== undefined) payload.group_ids = Array.isArray(gids) ? gids : (gids ? [gids] : []);
    
    if (contact.message !== undefined) payload.message = contact.message;
    if (contact.type !== undefined) payload.type = contact.type;
    
    const sa = contact.sentAt || contact.sent_at;
    if (sa !== undefined) payload.sent_at = sa || null;
    
    const ad = contact.arrivalDate || contact.arrival_date;
    if (ad !== undefined) payload.arrival_date = ad || null;
    
    const am = contact.arrivalMode || contact.arrival_mode;
    if (am !== undefined) payload.arrival_mode = am || null;
    
    const adt = contact.arrivalDetails || contact.arrival_details;
    if (adt !== undefined) payload.arrival_details = adt || null;
    
    const piu = contact.profileImageUrl || contact.profile_image_url;
    if (piu !== undefined) payload.profile_image_url = piu || null;
    
    const du = contact.documentUrl || contact.document_url;
    if (du !== undefined) payload.document_url = du || null;
    
    if (contact.vaultAccess !== undefined) payload.vault_access = contact.vaultAccess;
    else if (contact.vault_access !== undefined) payload.vault_access = contact.vault_access;

    console.log(`[Supabase] Saving guest ${contact.id} (${contact.name || 'Partial Update'})`);
    const { error } = await supabase.from('guests').upsert(payload);
    if (error) {
        console.error(`[Supabase] saveContact error for ${contact.id}:`, error.message, error.details);
        throw error;
    }
}
async function deleteContact(id) {
    const { error } = await supabase.from('guests').delete().eq('id', id);
    if (error) console.error('[Supabase] deleteContact error:', error);
}
async function getTemplates() {
    const { data, error } = await supabase.from('templates').select('*');
    if (error) console.error('[Supabase] getTemplates error:', error);
    return data || [];
}
async function saveTemplate(t) {
    const payload = {
        id: t.id,
        title: t.title,
        body: t.body,
        image_url: t.imageUrl || t.image_url || null,
        is_quick_action: t.isQuickAction || t.is_quick_action || false
    };
    const { error } = await supabase.from('templates').upsert(payload);
    if (error) console.error('[Supabase] saveTemplate error:', error);
}
async function getGroups() {
    const { data, error } = await supabase.from('groups').select('*');
    return data || [];
}
async function saveGroup(g) {
    await supabase.from('groups').upsert(g);
}

// ════════════════ WHATSAPP CLOUD SYNC ════════════════
const AUTH_DIR = path.join(__dirname, '.wwebjs_auth');
const BUCKET_NAME = 'whatsapp-sessions';

async function ensureBucket() {
    try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const requiredBuckets = [
            { name: 'whatsapp-sessions', public: false },
            { name: 'templates', public: true },
            { name: 'guest-images', public: true },
            { name: 'guest-documents', public: true },
            { name: 'shared-vault', public: true }
        ];

        for (const b of requiredBuckets) {
            if (!buckets.find(bucket => bucket.name === b.name)) {
                await supabase.storage.createBucket(b.name, { public: b.public });
                console.log(`[Supabase] Created bucket: ${b.name} (Public: ${b.public})`);
            }
        }
    } catch (e) { console.error('[Supabase] Storage check failed:', e.message); }
}

async function uploadSession(sessionId) {
    try {
        await ensureBucket();
        const sessionPath = path.join(AUTH_DIR, `session-${sessionId}`);
        if (!fs.existsSync(sessionPath)) {
            console.log(`[Supabase] [${sessionId}] Backup skipped: No session folder at ${sessionPath}`);
            return;
        }
        console.log(`[Supabase] [${sessionId}] Zipping session files...`);
        const zip = new AdmZip();
        // Use try-catch for zipping as files might be temporarily locked
        try {
            zip.addLocalFolder(sessionPath);
        } catch (zipErr) {
            console.warn(`[Supabase] [${sessionId}] Zip warning (some files might be busy):`, zipErr.message);
            // We proceed anyway, AdmZip often captures enough for restoration
        }
        
        const buffer = zip.toBuffer();
        console.log(`[Supabase] [${sessionId}] Uploading ${buffer.length} bytes to cloud...`);
        const { error } = await supabase.storage.from(BUCKET_NAME).upload(`${sessionId}.zip`, buffer, { 
            upsert: true,
            contentType: 'application/zip'
        });
        if (error) throw error;
        console.log(`[Supabase] [${sessionId}] Session backup completed successfully. 👑`);
    } catch (err) { console.error(`[Supabase] [${sessionId}] Backup failed:`, err.message); }
}

async function downloadSession(sessionId) {
    try {
        console.log(`[Supabase] [${sessionId}] Checking cloud backup...`);
        const { data, error } = await supabase.storage.from(BUCKET_NAME).download(`${sessionId}.zip`);
        if (error) {
            console.log(`[Supabase] [${sessionId}] No cloud backup found in bucket "${BUCKET_NAME}".`);
            return false;
        }
        const sessionPath = path.join(AUTH_DIR, `session-${sessionId}`);
        
        // Clear existing folder to prevent corruption merge
        if (fs.existsSync(sessionPath)) {
            console.log(`[Supabase] [${sessionId}] Cleaning up old session folder for fresh restore...`);
            fs.rmSync(sessionPath, { recursive: true, force: true });
        }
        fs.mkdirSync(sessionPath, { recursive: true });
        
        console.log(`[Supabase] [${sessionId}] Restoring session files (${data.size} bytes)...`);
        const zip = new AdmZip(Buffer.from(await data.arrayBuffer()));
        zip.extractAllTo(sessionPath, true);
        console.log(`[Supabase] [${sessionId}] Session restored successfully. 👑`);
        return true;
    } catch (err) { 
        console.error(`[Supabase] [${sessionId}] Download/Restore failed:`, err.message); 
        return false;
    }
}

// ════════════════ AUTH MIDDLEWARE ════════════════
function getSessionToken(req) { return (req.headers.cookie || '').split(';').find(c => c.trim().startsWith('session_token='))?.split('=')[1]; }
function getGuestToken(req) { return (req.headers.cookie || '').split(';').find(c => c.trim().startsWith('guest_token='))?.split('=')[1]; }

function requireAuth(req, res, next) {
    const token = getSessionToken(req);
    if (token && sessions.has(token)) { req.user = sessions.get(token); return next(); }
    if (req.originalUrl.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
    res.redirect('/login.html');
}

// ════════════════ ROUTES ════════════════
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const users = await getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
        sessions.set(token, { id: user.id, username: user.username, name: user.name, role: user.role });
        res.setHeader('Set-Cookie', `session_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
        res.json({ success: true, user: { name: user.name, role: user.role } });
    } else res.status(401).json({ error: 'Invalid credentials' });
});

app.get('/admin.html', requireAuth, (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/admin', (req, res) => res.redirect('/admin.html'));

app.get('/api/guest/status', async (req, res) => {
    const token = getGuestToken(req);
    if (token && guestSessions.has(token)) {
        const gs = guestSessions.get(token);
        const contacts = await getContacts();
        const fresh = contacts.find(c => c.id === gs.guestId);
        return res.json({ loggedIn: true, guest: fresh || gs });
    }
    res.json({ loggedIn: false });
});

app.post('/api/guest/request-otp', async (req, res) => {
    const { phone, name } = req.body;
    const clean = phone.replace(/\D/g, '');
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    guestOtps.set(clean, { otp, name, expires: Date.now() + 5 * 60 * 1000 });

    let sender = null;
    for (const s of Object.values(whatsappSessions)) { if (s.status === 'ready') { sender = s.client; break; } }
    if (!sender) { console.log(`[OTP] No WA. OTP for ${clean}: ${otp}`); return res.json({ success: true, debug: true }); }

    try {
        const msg = `✨ *Pranaam ${name} ji!* ✨\n\nYour secret entry code to the *Akshim Wedding* is:\n\n👑 *${otp}* 👑\n\nWith Warmth & Joy,\n*Marwah & Patel Families*`;
        await sender.sendMessage(`${clean}@c.us`, msg);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Failed to send OTP' }); }
});

app.post('/api/guest/login', async (req, res) => {
    const { phone, otp } = req.body;
    const clean = phone.replace(/\D/g, '');
    const stored = guestOtps.get(clean);
    if (!stored || stored.otp !== otp || Date.now() > stored.expires) return res.status(401).json({ error: 'Invalid OTP' });

    const contacts = await getContacts();
    // Match by last 10 digits to be extremely robust
    let guest = contacts.find(c => {
        const cp = (c.phone || '').replace(/\D/g, '');
        return cp.endsWith(clean.slice(-10));
    });

    if (!guest) {
        guest = { id: 'uninvited_' + Date.now(), name: stored.name, phone: clean, status: 'uninvited' };
        await saveContact(guest);
    } else if (guest.status === 'uninvited') {
        // If they were found but marked uninvited, keep them uninvited but log them in
    }

    guestOtps.delete(clean);
    const token = 'guest_' + Math.random().toString(36).substring(2);
    guestSessions.set(token, { guestId: guest.id, name: guest.name, phone: guest.phone });
    res.setHeader('Set-Cookie', `guest_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000`);
    res.json({ success: true, guest });
});

app.post('/api/rsvp', async (req, res) => {
    const { name, message } = req.body;
    const guest = { id: 'RSVP_' + Date.now(), name, message: message || '', status: 'accepted', type: 'rsvp' };
    await saveContact(guest);
    res.json({ success: true, guest });
});

// ════════════════ WHATSAPP LOGIC ════════════════
function formatPhone(p) { 
    let c = p.toString().replace(/\D/g, '');
    if (c.length === 10) c = '91' + c;
    return c.endsWith('@c.us') ? c : c + '@c.us';
}

function getSession(id = 'default') {
    const cid = id.toLowerCase();
    if (!whatsappSessions[cid]) whatsappSessions[cid] = { id: cid, status: 'disconnected', qrCode: null, info: null, client: null };
    return whatsappSessions[cid];
}

// Legacy session helper - no longer used but kept for route compatibility
function getSession(id) {
    if (!whatsappSessions[id]) whatsappSessions[id] = { id: id, status: 'ready', qrCode: null, info: { pushname: 'WASenderAPI' }, client: null };
    return whatsappSessions[id];
}

async function initWhatsApp(id = 'default') {
    console.log(`[WASenderAPI] Integration active for session: ${id}. No local client initialization required.`);
}

app.get('/api/status', async (req, res) => {
    // Always return ready since we are using a third-party API now
    res.json({ 
        activeSession: 'default', 
        status: 'ready', 
        qrCode: null, 
        info: { pushname: 'WASenderAPI' }, 
        allSessions: [{ id: 'default', label: 'Main API Gateway', status: 'ready' }] 
    });
});

app.get('/api/contacts', requireAuth, async (req, res) => {
    try { res.json(await getContacts()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/contacts', requireAuth, async (req, res) => { 
    try { await saveContact(req.body); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.put('/api/contacts/:id', requireAuth, async (req, res) => { 
    try { await saveContact({ ...req.body, id: req.params.id }); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/contacts/:id', requireAuth, async (req, res) => { 
    try { await deleteContact(req.params.id); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/templates', requireAuth, async (req, res) => res.json(await getTemplates()));
app.post('/api/templates', requireAuth, async (req, res) => { for (const t of req.body.templates) await saveTemplate(t); res.json({ success: true }); });

app.get('/api/groups', requireAuth, async (req, res) => res.json(await getGroups()));
app.post('/api/groups', requireAuth, async (req, res) => { for (const g of req.body.groups) await saveGroup(g); res.json({ success: true }); });

app.post('/api/send-message', requireAuth, async (req, res) => {
    const { phone, message, contactId, imageUrl } = req.body;
    try { 
        await sendWhatsAppMessage(phone, message, imageUrl); 
        
        if (contactId) {
            const { data: contact } = await supabase.from('guests').select('*').eq('id', contactId).maybeSingle();
            if (contact) {
                contact.status = 'sent';
                contact.sent_at = new Date().toISOString();
                await saveContact(contact);
            }
        }
        
        res.json({ success: true }); 
    }
    catch (e) { 
        console.error('[Send Message] Error:', e.message);
        res.status(500).json({ error: e.message }); 
    }
});

// ════════════════ FILE UPLOAD ════════════════
app.post('/api/upload-file', requireAuth, upload.single('file'), async (req, res) => {
    try {
        const { bucket } = req.body;
        const file = req.file;
        console.log(`[Upload DEBUG] Received request for bucket: ${bucket}, File: ${file?.originalname}`);

        if (!file) {
            console.warn('[Upload DEBUG] No file provided in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileName = `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
        console.log(`[Upload DEBUG] Target filename: ${fileName}`);

        const { data, error } = await supabase.storage.from(bucket).upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: true
        });

        if (error) {
            console.error(`[Upload DEBUG] Supabase error for bucket "${bucket}":`, error.message);
            return res.status(500).json({ error: `Storage Error: ${error.message}` });
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName);
        console.log(`[Upload DEBUG] Successfully uploaded. Public URL: ${publicUrl}`);
        res.json({ success: true, url: publicUrl });
    } catch (err) {
        console.error('[Upload DEBUG] Critical endpoint failure:', err.message);
        res.status(500).json({ error: `Server Error: ${err.message}` });
    }
});

// ════════════════ SHARED VAULT ════════════════
app.get('/api/vault', requireAuth, async (req, res) => {
    try {
        if (req.user.role === 'guest') {
            const { data: guest } = await supabase.from('guests').select('vault_access').eq('id', req.user.id).single();
            if (!guest || !guest.vault_access) return res.status(403).json({ error: 'Vault access denied' });
        }
        const { data, error } = await supabase.from('shared_vault').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/vault/upload', requireAuth, upload.single('file'), async (req, res) => {
    try {
        if (req.user.role === 'guest') {
            const { data: guest } = await supabase.from('guests').select('vault_access, name').eq('id', req.user.id).single();
            if (!guest || !guest.vault_access) return res.status(403).json({ error: 'Vault access denied' });
            req.user.name = guest.name;
        }
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No file' });
        const fileName = `vault_${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;
        const { error: upErr } = await supabase.storage.from('shared-vault').upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: true
        });
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('shared-vault').getPublicUrl(fileName);
        const entry = {
            id: 'vlt_' + Date.now(),
            url: publicUrl,
            uploader_id: req.user.id,
            uploader_name: req.user.name || 'Admin'
        };
        const { error: dbErr } = await supabase.from('shared_vault').insert(entry);
        if (dbErr) throw dbErr;
        res.json({ success: true, entry });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/bulk-send', requireAuth, async (req, res) => {
    const { contactIds, templateId, customMessage, minDelay, maxDelay, session: sid } = req.body;
    const s = getSession(sid || 'default');
    if (s.status !== 'ready' || bulkSendState.sending) return res.status(400).json({ error: 'Busy or disconnected' });
    if (!contactIds || contactIds.length === 0) return res.status(400).json({ error: 'No recipients' });

    const all = await getContacts();
    const targets = all.filter(c => contactIds.includes(c.id));
    const tmpls = await getTemplates();
    const tmpl = tmpls.find(t => t.id === templateId);

    const minD = (parseInt(minDelay) || 65) * 1000;
    const maxD = (parseInt(maxDelay) || 75) * 1000;

    bulkSendState = { sending: true, total: targets.length, sent: 0, failed: 0, currentContact: '', errors: [], cancelRequested: false };
    res.json({ success: true, stats: bulkSendState });

    (async () => {
        for (const t of targets) {
            if (bulkSendState.cancelRequested) break;
            bulkSendState.currentContact = t.name;
            try {
                const rawMsg = customMessage || (tmpl ? tmpl.body : 'Hello');
                const imageUrl = tmpl ? tmpl.image_url : null;
                const m = rawMsg.replace(/{name}/g, t.name);
                
                await sendWhatsAppMessage(t.phone, m, imageUrl);
                
                // Update status in DB
                t.status = 'sent'; 
                t.sent_at = new Date().toISOString(); 
                await saveContact(t);
                
                bulkSendState.sent++;
            } catch (e) { 
                const errMsg = e.message || 'Unknown error';
                console.error(`[Broadcast] [${t.name}] Error:`, errMsg);
                bulkSendState.failed++; 
                bulkSendState.errors.push({ name: t.name, error: errMsg }); 
            }
            // Dynamic delay - still useful to prevent rate limiting even on 3rd party
            const delay = Math.floor(Math.random() * (maxD - minD + 1)) + minD;
            await new Promise(r => setTimeout(r, delay));
        }
        bulkSendState.sending = false;
        console.log(`[Broadcast] Finished. Sent: ${bulkSendState.sent}, Failed: ${bulkSendState.failed}`);
    })();
});

app.get('/api/bulk-status', requireAuth, (req, res) => res.json(bulkSendState));
app.post('/api/bulk-cancel', requireAuth, (req, res) => { bulkSendState.cancelRequested = true; res.json({ success: true }); });

// ════════════════ STATIC & STARTUP ════════════════
// WhatsApp Control Endpoints
app.post('/api/logout', requireAuth, async (req, res) => {
    const id = req.body.session || 'default';
    const s = getSession(id);
    if (s.client) { await s.client.logout(); s.status = 'disconnected'; s.info = null; res.json({ success: true }); }
    else res.status(400).json({ error: 'Not initialized' });
});

app.post('/api/restart', requireAuth, async (req, res) => {
    const id = req.body.session || 'default';
    const s = getSession(id);
    if (s.client) { await s.client.destroy().catch(() => {}); s.client = null; }
    initWhatsApp(id);
    res.json({ success: true });
});

app.post('/api/create-session', requireAuth, (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    initWhatsApp(name.toLowerCase().trim());
    res.json({ success: true });
});

app.get('/api/whatsapp-contacts', requireAuth, async (req, res) => {
    try {
        const response = await fetch('https://wasenderapi.com/api/contacts', {
            headers: {
                'Authorization': `Bearer ${process.env.WA_API_KEY || '944761c74d762fedce7a72fed5de7230d306c7264bf6e2cd7ece49618a6afb9a'}`,
                'Accept': 'application/json'
            }
        });
        
        const result = await response.json();
        if (!result.success) {
            console.error('[WASenderAPI] Sync failed. Response:', result);
            throw new Error(result.message || 'API failed to return contacts');
        }
        
        // Map to format expected by frontend: { name, phone }
        const contacts = (result.data || []).map(c => ({
            name: c.name || c.verifiedName || c.notify || 'Unknown Contact',
            phone: c.id ? c.id.split('@')[0] : 'No Number'
        })).filter(c => c.phone !== 'No Number');

        res.json(contacts);
    } catch (e) { 
        console.error('[WASenderAPI] Sync error:', e.message);
        res.status(500).json({ error: e.message }); 
    }
});

app.post('/api/backup-session', requireAuth, async (req, res) => {
    const id = req.body.session || 'default';
    await uploadSession(id);
    res.json({ success: true });
});

app.post('/api/sync-from-cloud', requireAuth, async (req, res) => {
    const id = req.body.session || 'default';
    const s = getSession(id);
    console.log(`[WhatsApp] [${id}] Manual cloud sync requested.`);
    
    // If client is running, we must stop it before restoring files
    if (s.client) {
        console.log(`[WhatsApp] [${id}] Stopping client for session restore...`);
        await s.client.destroy().catch(() => {});
        s.client = null;
    }
    
    const success = await downloadSession(id);
    if (!success) {
        return res.status(404).json({ error: 'No cloud backup found for this profile.' });
    }
    
    initWhatsApp(id); // Re-initialize after restore
    res.json({ success: true, message: 'Sync started. Handshaking...' });
});

app.get('/api/admin/backups', requireAuth, async (req, res) => {
    try {
        const { data, error } = await supabase.storage.from(BUCKET_NAME).list();
        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin Manual Validation
app.post('/api/admin/validate-guest', requireAuth, async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone required' });
    const clean = phone.replace(/\D/g, '');
    const contacts = await getContacts();
    let guest = contacts.find(c => c.phone.replace(/\D/g, '').endsWith(clean.slice(-10)));
    if (!guest) guest = { id: 'manual_' + Date.now(), name: 'Guest (' + clean + ')', phone: clean, status: 'accepted' };
    else guest.status = 'accepted';
    await saveContact(guest);
    res.json({ success: true, guest });
});

// Biometric Login (Face ID)
app.post('/api/face-login/register-challenge', async (req, res) => {
    res.json({ challenge: Buffer.from(Math.random().toString()).toString('base64'), rp: { name: 'Akshim Wedding' } });
});
app.post('/api/face-login/verify', async (req, res) => { res.json({ success: true }); });

app.use(express.static(__dirname));

app.post('/api/push/subscribe', async (req, res) => {
    const token = getGuestToken(req);
    if (!token || !guestSessions.has(token)) return res.status(401).json({ error: 'Unauthorized' });
    const { subscription } = req.body;
    const guestId = guestSessions.get(token).guestId;
    
    try {
        await supabase.from('push_subscriptions').upsert({
            id: `sub_${guestId}`,
            guest_id: guestId,
            subscription: subscription
        });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/send-push', requireAuth, async (req, res) => {
    const { title, body, target, groupId, guestId } = req.body;
    
    try {
        let query = supabase.from('push_subscriptions').select('*');
        
        if (target === 'group') query = query.eq('guest_id', supabase.from('guests').select('id').eq('group_id', groupId));
        else if (target === 'individual') query = query.eq('guest_id', guestId);
        
        const { data: subs } = await query;
        if (!subs || subs.length === 0) return res.json({ success: true, sent: 0 });

        const promises = subs.map(s => 
            webpush.sendNotification(s.subscription, JSON.stringify({ title, body }))
            .catch(err => {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    return supabase.from('push_subscriptions').delete().eq('id', s.id);
                }
            })
        );
        
        await Promise.all(promises);
        res.json({ success: true, sent: subs.length });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`👑 AKSHIM Server running on port ${PORT}`);
    initWhatsApp('default');
    ensureBucket();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    for (const s of Object.values(whatsappSessions)) if (s.client) { await s.client.destroy(); await uploadSession(s.id); }
    process.exit(0);
});
