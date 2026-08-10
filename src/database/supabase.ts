import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env, isSupabaseConfigured } from '../config/env'
import { logger } from '../lib/logger'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null
  if (!client) {
    try {
      client = createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
      logger.info('DB', 'Supabase client inicializado')
    } catch (e) {
      logger.error('DB', 'Falha ao inicializar Supabase', String(e))
      client = null
    }
  }
  return client
}

export const supabaseAvailable = isSupabaseConfigured