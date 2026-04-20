import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Se as chaves estiverem vazias, o cliente será criado mas falhará nas chamadas, 
// permitindo que o nosso try/catch no page.tsx capture o erro sem derrubar o app.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)