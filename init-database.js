const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
    connectionString: 'postgres://postgres:6TMsar5dPNeJqueb9Bsshekpxb7SyuEdoVYy6MyxW76WFZnSvBXDjk0pEyX4AGDq@45.13.225.39:2456/postgres',
    ssl: false
});

async function initializeDatabase() {
    console.log('🔄 Initializing Amam database...\n');

    try {
        // Read SQL file
        const sqlPath = path.join(__dirname, 'database.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute SQL
        await pool.query(sql);

        console.log('✅ Database schema created successfully!');
        console.log('✅ Sample data inserted!');
        console.log('\n📊 Database is ready!\n');
        console.log('Default accounts created:');
        console.log('  Admin: admin@university.edu / admin123');
        console.log('  Student: sarah.j@university.edu / admin123');
        console.log('  Driver: mike.d@university.edu / admin123');
        console.log('  Pending Driver: john.p@university.edu / admin123');

        // Verify tables
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);

        console.log('\n📋 Tables created:');
        result.rows.forEach(row => {
            console.log('  ✓', row.table_name);
        });

        // Get counts
        const stats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as users,
                (SELECT COUNT(*) FROM driver_applications) as driver_apps,
                (SELECT COUNT(*) FROM rides) as rides,
                (SELECT COUNT(*) FROM messages) as messages
        `);

        console.log('\n📈 Current data:');
        console.log('  Users:', stats.rows[0].users);
        console.log('  Driver Applications:', stats.rows[0].driver_apps);
        console.log('  Rides:', stats.rows[0].rides);
        console.log('  Messages:', stats.rows[0].messages);

        console.log('\n🚀 Database initialization complete!');
        console.log('   You can now start the server with: npm start\n');

    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        console.error('\nPlease ensure:');
        console.error('  1. PostgreSQL is running');
        console.error('  2. Connection credentials are correct');
        console.error('  3. database.sql file exists\n');
    } finally {
        await pool.end();
    }
}

initializeDatabase();
