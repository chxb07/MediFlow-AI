import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * SupabaseKeepAlive Component
 * 
 * This component runs in the background and sends a "heartbeat" ping to Supabase
 * every 5 minutes (300,000ms) to prevent the project from being paused due to inactivity.
 * 
 * It also pings our custom /api/keep-alive endpoint as a fallback.
 */
export const SupabaseKeepAlive = () => {
  useEffect(() => {
    const pingSupabase = async () => {
      const timestamp = new Date().toLocaleTimeString();
      
      try {
        // 1. Direct Supabase Ping (Minimal query on profiles table)
        const { error: dbError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);

        if (dbError) throw dbError;

        // 2. API Endpoint Ping (Triggers Vercel function)
        const response = await fetch('/api/keep-alive');
        const apiData = await response.json();

        if (import.meta.env.DEV) {
          console.log(`[Supabase Keep-Alive] ${timestamp}: Ping successful - DB: OK, API: ${apiData.success ? 'OK' : 'Error'}`);
        }
      } catch (err: any) {
        console.error(`[Supabase Keep-Alive] ${timestamp}: Ping failed:`, err.message);
      }
    };

    // Initial ping on mount
    pingSupabase();

    // Set up interval (5 minutes)
    const intervalId = setInterval(pingSupabase, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  // This component doesn't render anything
  return null;
};
