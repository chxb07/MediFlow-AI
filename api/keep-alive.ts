import { createClient } from '@supabase/supabase-js'

export default async function handler(req: any, res: any) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ 
      success: false,
      error: 'Missing Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)' 
    })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  try {
    // Perform a minimal query to keep the database active.
    // The 'profiles' table has a public SELECT policy.
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    if (error) throw error

    return res.status(200).json({ 
      success: true, 
      message: 'Supabase keep-alive ping successful',
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('Keep-alive failed:', error.message)
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}
