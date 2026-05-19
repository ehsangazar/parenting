#!/usr/bin/env node
import webpush from 'web-push';

const keys = webpush.generateVAPIDKeys();
console.log('# Add these to your env (Coolify / .env):\n');
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log('VAPID_SUBJECT=mailto:hello@yourdomain.com   # change to a real contact');
console.log('\n# The frontend also needs the PUBLIC key:');
console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}`);
