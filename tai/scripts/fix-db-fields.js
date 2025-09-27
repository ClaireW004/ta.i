const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

// Load environment variables
function loadEnvFile() {
  const envPath = path.join(__dirname, '../.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        if (key && valueParts.length > 0) {
          process.env[key] = valueParts.join('=')
        }
      }
    })
  }
}

loadEnvFile()

async function fixFieldLengths() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })

  try {
    await client.connect()
    console.log('Connected to database')

    const migrationPath = path.join(__dirname, '../database/fix-field-lengths.sql')
    const migration = fs.readFileSync(migrationPath, 'utf8')

    await client.query(migration)
    console.log('✅ Database field lengths fixed successfully!')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
  } finally {
    await client.end()
  }
}

fixFieldLengths()