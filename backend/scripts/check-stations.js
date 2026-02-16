// Quick script to check stations in database
import { pool } from '../dist/database/connection.js';

async function checkStations() {
  try {
    const result = await pool.query(`
      SELECT station_id, device_id, station_name, province, status 
      FROM station 
      ORDER BY station_id
    `);

    console.log('\n📊 Stations in database:\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (result.rows.length === 0) {
      console.log('❌ No stations found in database!');
      console.log('\n💡 You need to run: npm run db:seed');
    } else {
      console.log(`✅ Found ${result.rows.length} station(s):\n`);
      result.rows.forEach(s => {
        console.log(`   ID: ${s.station_id}`);
        console.log(`   Device ID: ${s.device_id}`);
        console.log(`   Name: ${s.station_name}`);
        console.log(`   Province: ${s.province}`);
        console.log(`   Status: ${s.status}`);
        console.log('   ' + '─'.repeat(60));
      });
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkStations();
