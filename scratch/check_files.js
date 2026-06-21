const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    realtime: { transport: WebSocket }
});

async function checkFiles() {
    const BUCKET_NAME = 'whatsapp-sessions';
    const { data, error } = await supabase.storage.from(BUCKET_NAME).list();
    if (error) {
        console.error('Error listing files:', error);
        return;
    }
    console.log('Files in bucket:', JSON.stringify(data, null, 2));
}

checkFiles();
