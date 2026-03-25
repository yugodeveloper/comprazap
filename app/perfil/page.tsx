'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'

export default function PerfilPage() {
  const [fullName, setFullName] = useState('')
  const [apartment, setApartment] = useState('')
  const [condoName, setCondoName] = useState('Residencial Lanai') // Valor padrão sugerido
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { error } = await supabase
  .from('profiles')
  .upsert({
    id: user.id,
    full_name: fullName,
    apartment: apartment,
    condo_name: condoName,
    // Removi a linha do updated_at que estava dando erro
  })

      if (error) {
        alert('Erro ao salvar: ' + error.message)
      } else {
        router.push('/') // Volta para a home após salvar
      }
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Finalize seu Cadastro</h1>
        <p className="text-sm text-gray-500 mb-6">Precisamos desses dados para que seus vizinhos te identifiquem.</p>
        
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
            <input
              type="text"
              required
              className="w-full p-3 border border-gray-300 rounded-lg mt-1 text-black"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Unidade (Ex: Apto 402, Bloco B)</label>
            <input
              type="text"
              required
              className="w-full p-3 border border-gray-300 rounded-lg mt-1 text-black"
              value={apartment}
              onChange={(e) => setApartment(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Condomínio</label>
            <input
              type="text"
              required
              className="w-full p-3 border border-gray-300 rounded-lg mt-1 text-black"
              value={condoName}
              onChange={(e) => setCondoName(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white p-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
          >
            {loading ? 'Salvando...' : 'Concluir Cadastro'}
          </button>
        </form>
      </div>
    </div>
  )
}