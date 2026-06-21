const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    realtime: { transport: WebSocket }
});

async function testUpload() {
    const BUCKET_NAME = 'whatsapp-sessions';
    const content = 'test ' + Date.now();
    console.log('Testing upload to Supabase...');
    const { data, error } = await supabase.storage.from(BUCKET_NAME).upload('test.txt', Buffer.from(content), { upsert: true });
    
    if (error) {
        console.error('Upload Error:', JSON.stringify(error, null, 2));
    } else {
        console.log('Upload Success:', data);
    }
}

testUpload();
