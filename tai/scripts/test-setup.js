const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

// Load environment variables from .env.local manually
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

// Load the environment variables
loadEnvFile()

async function testSetup() {
  console.log('🧪 Testing TA.I Setup...\n')

  // Debug: Show if env file was loaded
  console.log('🔍 Environment file check:')
  const envPath = path.join(__dirname, '../.env.local')
  console.log(`   .env.local exists: ${fs.existsSync(envPath)}`)
  console.log(`   Path: ${envPath}`)

  // Test Database Connection
  try {
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    })
    await client.connect()
    const result = await client.query('SELECT NOW()')
    console.log('✅ Database: Connected successfully')
    
    // Check tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `)
    console.log(`✅ Database: Found ${tables.rows.length} tables`)
    
    await client.end()
  } catch (error) {
    console.log('❌ Database: Connection failed', error.message)
  }

  // Test Service Account File
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    console.log('✅ Service Account: JSON file found')
  } else {
    console.log('❌ Service Account: JSON file missing at', serviceAccountPath || 'undefined')
  }

  // Test Environment Variables
  const requiredVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET', 
    'DATABASE_URL',
    'GOOGLE_CLOUD_STORAGE_BUCKET',
    'NEXTAUTH_SECRET',
    'GOOGLE_CLOUD_PROJECT_ID'
  ]

  console.log('\n🔍 Environment Variables Check:')
  requiredVars.forEach(varName => {
    const value = process.env[varName]
    if (value) {
      const displayValue = varName.includes('SECRET') || varName.includes('PASSWORD') 
        ? '[HIDDEN]' 
        : value.length > 30 ? value.substring(0, 30) + '...' : value
      console.log(`  ✅ ${varName}: ${displayValue}`)
    } else {
      console.log(`  ❌ ${varName}: Missing`)
    }
  })

  const missing = requiredVars.filter(v => !process.env[v])
  if (missing.length === 0) {
    console.log('\n✅ Environment: All variables configured')
  } else {
    console.log('\n❌ Environment: Missing variables:', missing.join(', '))
  }

  // Test Google Cloud Storage (optional)
  try {
    const { Storage } = require('@google-cloud/storage')
    const storage = new Storage()
    const bucket = storage.bucket(process.env.GOOGLE_CLOUD_STORAGE_BUCKET)
    const [exists] = await bucket.exists()
    console.log(`✅ Cloud Storage: Bucket ${exists ? 'exists and accessible' : 'not found'}`)
  } catch (error) {
    console.log('⚠️  Cloud Storage: Not testable yet (service account needed)')
  }

  console.log('\n🎉 Setup test complete!')
  
  if (missing.length > 0 || !fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS || '')) {
    console.log('\n📋 What you still need:')
    if (missing.length > 0) {
      console.log('   ❌ Environment variables missing - check your .env.local file')
    }
    if (!fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS || '')) {
      console.log('   ❌ Download service account JSON from Google Cloud Console')
      console.log('   ❌ Save it as gcp-service-account.json in your project root')
    }
    console.log('   ❌ Create/verify your Google Cloud Storage bucket')
  } else {
    console.log('\n🚀 Everything looks good! You can start your app with: pnpm dev')
  }
}

testSetup()