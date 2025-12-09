/**
 * Butler Setup Script
 * Run with: npx ts-node scripts/setup-butler.ts
 * 
 * 1. Tests cron jobs
 * 2. Installs Commercial Lending pack
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.pulselifeos.com';

async function testCronJobs() {
  console.log('🔄 Testing Cron Jobs...\n');

  const jobs = [
    'process-campaigns',
    'process-notifications', 
    'relationship-health',
    'detect-patterns',
  ];

  for (const job of jobs) {
    try {
      console.log(`  Testing: ${job}...`);
      const res = await fetch(`${BASE_URL}/api/cron`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET || 'test'}`,
        },
        body: JSON.stringify({ job }),
      });
      const data = await res.json();
      console.log(`  ✅ ${job}: ${JSON.stringify(data).slice(0, 100)}`);
    } catch (err: any) {
      console.log(`  ❌ ${job}: ${err.message}`);
    }
  }

  console.log('\n');
}

async function installCommercialLendingPack(userId: string) {
  console.log('📦 Installing Commercial Lending Pack...\n');

  try {
    const res = await fetch(`${BASE_URL}/api/packs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'install',
        packId: 'commercial-lending',
      }),
    });

    const data = await res.json();
    
    if (data.userPack) {
      console.log('  ✅ Commercial Lending Pack installed successfully!');
      console.log(`  📋 Pack ID: ${data.userPack.packId}`);
      console.log(`  📅 Installed: ${data.userPack.installedAt}`);
    } else {
      console.log('  ⚠️ Response:', JSON.stringify(data));
    }
  } catch (err: any) {
    console.log(`  ❌ Error: ${err.message}`);
  }

  console.log('\n');
}

async function main() {
  console.log('\n🚀 Pulse Butler Setup\n');
  console.log('='.repeat(40) + '\n');

  // Test cron jobs
  await testCronJobs();

  // Note about pack installation
  console.log('📦 To install Commercial Lending Pack:');
  console.log('   1. Go to https://www.pulselifeos.com/packs');
  console.log('   2. Click "Install" on Commercial Loan Officer');
  console.log('   3. Or run this in browser console while logged in:\n');
  console.log(`   fetch('/api/packs', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ action: 'install', packId: 'commercial-lending' })
   }).then(r => r.json()).then(console.log)`);

  console.log('\n' + '='.repeat(40));
  console.log('✨ Setup complete!\n');
}

main();