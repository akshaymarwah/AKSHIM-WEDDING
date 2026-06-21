const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    realtime: { transport: WebSocket }
});

async function debugContact() {
    const { data: contacts, error } = await supabase.from('guests').select('*').ilike('name', '%shiv%');
    if (error) {
        console.error('Error fetching contact:', error);
        return;
    }
    console.log('Found contacts:', JSON.stringify(contacts, null, 2));
}

debugContact();
