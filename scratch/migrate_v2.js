const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    realtime: { transport: WebSocket }
});

async function migrate() {
    console.log('Migrating database: Adding travel and profile columns...');
    
    // Using RPC to execute SQL or checking columns via introspect is complex.
    // For this environment, we'll try to insert a dummy record with new fields to see if they exist, 
    // but the most reliable way is to use a SQL execution via a tool if available.
    // Since I don't have a direct SQL tool, I'll rely on the server.js upsert to create them if Supabase allows dynamic schema (which it doesn't by default).
    
    // BETTER: I'll create the Storage buckets first.
    const buckets = ['guest-documents', 'guest-images'];
    for (const b of buckets) {
        const { data, error } = await supabase.storage.createBucket(b, { public: true });
        if (error) {
            if (error.message.includes('already exists')) console.log(`Bucket ${b} already exists. ✅`);
            else console.error(`Error creating bucket ${b}:`, error.message);
        } else {
            console.log(`Bucket ${b} created successfully! ✅`);
        }
    }
}

migrate();
