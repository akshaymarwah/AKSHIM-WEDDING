const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    realtime: {
        transport: WebSocket
    }
});

async function seedAdmin() {
    console.log('Seeding Admin User...');
    const { data, error } = await supabase
        .from('users')
        .upsert({
            id: 'admin_1',
            name: 'Akshay',
            username: 'akshay',
            password: 'Trail@9416',
            role: 'admin'
        });

    if (error) {
        console.error('Error seeding admin:', error);
    } else {
        console.log('Admin user seeded successfully! 👑');
    }
}

seedAdmin();
