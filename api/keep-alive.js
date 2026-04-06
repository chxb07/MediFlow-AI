import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
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
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    if (error) throw error

    return res.status(200).json({ 
      success: true, 
      message: 'Supabase keep-alive ping successful (JS)',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Keep-alive failed:', error.message)
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    })
  }
}
