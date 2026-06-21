const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    realtime: {
        transport: WebSocket
    }
});

const defaultTemplates = [
    {
        id: 'tpl_invite',
        title: 'Wedding Invitation',
        body: 'Pranaam {name} ji, \n\nYou are cordially invited to the wedding of Akshay & Shimona. 👑✨\n\nYour presence will make our union truly special. Please visit our website for more details: https://akshim.quest\n\nRegards,\nAkshay & Shimona',
        is_quick_action: true
    },
    {
        id: 'tpl_reminder',
        title: 'Gentle Reminder',
        body: 'Hello {name}, \n\nJust a gentle reminder for the wedding ceremonies starting tomorrow! 🥂\n\nWe are excited to see you there. For venue location and schedule, check: https://akshim.quest\n\nSee you soon!',
        is_quick_action: false
    },
    {
        id: 'tpl_thankyou',
        title: 'RSVP Thank You',
        body: 'Hi {name}, \n\nThank you for your RSVP! We have noted your confirmation for the event. 🙏\n\nWarm regards,\nAkshay & Shimona',
        is_quick_action: true
    }
];

async function seedTemplates() {
    console.log('Seeding Default Templates...');
    for (const t of defaultTemplates) {
        const { error } = await supabase.from('templates').upsert(t);
        if (error) {
            console.error(`Error seeding template ${t.title}:`, error);
        } else {
            console.log(`Template "${t.title}" seeded! ✅`);
        }
    }
}

seedTemplates();
