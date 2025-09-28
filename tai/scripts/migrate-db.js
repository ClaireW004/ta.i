#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

// Load .env.local if present so the script picks up DATABASE_URL automatically
try {
  require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') })
} catch (e) {
  // dotenv optional
}

async function promptYesNo(question) {
  const readline = require('readline')
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close()
      resolve(ans.trim().toLowerCase() === 'y' || ans.trim().toLowerCase() === 'yes')
    })
  })
}

async function run() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('Please set DATABASE_URL in your environment or in .env.local')
    process.exit(1)
  }

  const client = new Client({ connectionString: databaseUrl })
  try {
    await client.connect()
    console.log('Connected to Postgres')

    // Check existing tables
    const res = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`)
    if (res.rows.length > 0) {
      console.log('Existing tables:')
      res.rows.forEach(r => console.log(' -', r.table_name))
      const shouldDrop = await promptYesNo('\nDrop all existing tables and re-create schema? This will DELETE DATA. (y/N): ')
      if (shouldDrop) {
        console.log('Dropping tables...')
        const dropSql = `
          DO $$ DECLARE r RECORD; BEGIN
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
              EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
          END $$;
        `
        await client.query(dropSql)
        console.log('Dropped existing tables.')
      } else {
        console.log('Skipping migration because tables exist.')
        return
      }
    }

    const schemaPath = path.resolve(__dirname, '..', 'database', 'schema.sql')
    if (!fs.existsSync(schemaPath)) {
      console.error('Schema file not found at', schemaPath)
      process.exit(1)
    }

    const sql = fs.readFileSync(schemaPath, 'utf8')
    console.log('Applying schema...')
    await client.query(sql)
    console.log('Schema applied successfully.')

  } catch (err) {
    console.error('Migration failed:', err)
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

run()