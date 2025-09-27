const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

async function runMigration() {
  const client = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: process.env.DATABASE_PORT || 5432,
    database: process.env.DATABASE_NAME || 'tai_db',
    user: process.env.DATABASE_USER || 'tai_user',
    password: process.env.DATABASE_PASSWORD,
  })

  try {
    await client.connect()
    console.log('Connected to database')

    // Check ALL existing tables in the public schema
    const checkTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)

    if (checkTables.rows.length > 0) {
      console.log('📋 All existing tables found:')
      checkTables.rows.forEach(row => console.log(`  - ${row.table_name}`))
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      })

      const answer = await new Promise((resolve) => {
        readline.question('\nDo you want to recreate the schema? This will DROP ALL existing tables! (y/N): ', resolve)
      })
      readline.close()

      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        console.log('🗑️  Dropping ALL existing tables...')
        
        // Drop all tables in the correct order (reverse dependency order)
        const dropQueries = [
          'DROP TABLE IF EXISTS slide_elements CASCADE;',
          'DROP TABLE IF EXISTS slides CASCADE;', 
          'DROP TABLE IF EXISTS import_jobs CASCADE;',
          'DROP TABLE IF EXISTS presentations CASCADE;',
          'DROP TABLE IF EXISTS user_sessions CASCADE;',
          // Add any other tables that might exist
          'DROP TABLE IF EXISTS users CASCADE;',
          'DROP TABLE IF EXISTS accounts CASCADE;',
          'DROP TABLE IF EXISTS sessions CASCADE;',
          'DROP TABLE IF EXISTS verification_tokens CASCADE;'
        ]

        for (const query of dropQueries) {
          try {
            await client.query(query)
          } catch (err) {
            // Ignore errors for tables that don't exist
            console.log(`  Note: ${err.message}`)
          }
        }
        
        console.log('✅ All existing tables dropped')
      } else {
        console.log('✅ Migration skipped - tables already exist')
        return
      }
    }

    // Run the schema migration
    const schemaPath = path.join(__dirname, '../database/schema.sql')
    
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ Schema file not found at:', schemaPath)
      return
    }

    const schema = fs.readFileSync(schemaPath, 'utf8')
    await client.query(schema)
    console.log('✅ Database schema migrated successfully!')

    // Verify tables were created
    const verifyTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    
    console.log('\n📋 Tables created:')
    verifyTables.rows.forEach(row => console.log(`  ✅ ${row.table_name}`))

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('Full error:', error)
  } finally {
    await client.end()
  }
}

runMigration()