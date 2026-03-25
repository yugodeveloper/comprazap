import { NextResponse } from 'next/server'
import { supabase } from '../../lib/supabase'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    // Troca o código temporário por uma sessão real
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redireciona para a home após o login
  return NextResponse.redirect(`${origin}/`)
}