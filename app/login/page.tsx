'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) setMessage(error.message)
    else setMessage('Verifique seu e-mail!')
  }

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>CompraZap ☕</h1>
      <form onSubmit={handleLogin}>
        <input 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="Seu e-mail"
          required 
          style={{ padding: '10px', marginRight: '10px', color: 'black' }}
        />
        <button type="submit" style={{ padding: '10px' }}>Entrar</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  )
}