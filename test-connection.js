import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: Missing required environment variables')
  process.exit(1)
}

console.log('Testing connection to:', process.env.SUPABASE_URL)

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testConnection() {
  try {
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Connection Error:', error.message)
      return
    }
    
    console.log('Successfully connected to Supabase!')
    console.log('Connection test passed ✅')
  } catch (err) {
    console.error('Error:', err.message)
  }
}

testConnection() 