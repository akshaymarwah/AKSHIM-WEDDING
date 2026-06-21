const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    realtime: { transport: WebSocket }
});

async function checkStorage() {
    const BUCKET_NAME = 'whatsapp-sessions';
    console.log(`Checking bucket: ${BUCKET_NAME}`);
    
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
        console.error('Error listing buckets:', listError);
        return;
    }

    const exists = buckets.find(b => b.name === BUCKET_NAME);
    if (!exists) {
        console.log(`Bucket ${BUCKET_NAME} not found. Creating...`);
        const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
            public: false,
            allowedMimeTypes: ['application/zip'],
            fileSizeLimit: 52428800 // 50MB
        });
        if (error) console.error('Error creating bucket:', error);
        else console.log('Bucket created successfully! ✅');
    } else {
        console.log(`Bucket ${BUCKET_NAME} already exists. ✅`);
    }
}

checkStorage();
