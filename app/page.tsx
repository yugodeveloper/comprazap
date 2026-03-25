'use client'
import { supabase } from './lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [myCampaigns, setMyCampaigns] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!profileData?.full_name) { router.push('/perfil'); return }
      setProfile(profileData)

      // Busca as campanhas criadas por você
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })
      
      setMyCampaigns(campaigns || [])
    }
    fetchData()
  }, [router])

  const copyToClipboard = (id: string) => {
    const url = `${window.location.origin}/c/${id}`
    navigator.clipboard.writeText(url)
    alert('Link da campanha copiado! Só colar no WhatsApp. 🚀')
  }

  if (!user || !profile) return <div className="p-10 text-center text-black">Carregando...</div>

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
      <div className="w-full max-w-md">
        <div className="bg-white p-6 rounded-2xl shadow-sm mb-6 text-center">
          <h1 className="text-2xl font-bold text-blue-600">CompraZap ☕</h1>
          <p className="text-gray-500 text-sm">{profile.full_name} @ {profile.condo_name}</p>
        </div>

        <button 
          onClick={() => router.push('/campanha/nova')}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold mb-8 shadow-lg hover:bg-blue-700 transition-all"
        >
          + Nova Venda de Produto
        </button>

        <h2 className="font-bold text-gray-700 mb-4">Minhas Campanhas Ativas</h2>
        <div className="space-y-4">
          {myCampaigns.length === 0 && <p className="text-gray-400 text-center italic">Nenhuma campanha criada ainda.</p>}
          {myCampaigns.map((c) => (
            <div key={c.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-black">{c.title}</h3>
              <p className="text-xs text-gray-400 mb-4">Local: {c.location}</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => copyToClipboard(c.id)}
                  className="flex-1 bg-green-50 text-green-700 py-2 rounded-lg text-sm font-bold border border-green-200"
                >
                  Copiar Link Zap
                </button>
                <button 
                  onClick={() => router.push(`/campanha/gestao/${c.id}`)}
                  className="flex-1 bg-gray-50 text-gray-700 py-2 rounded-lg text-sm font-bold border border-gray-200"
                >
                  Ver Pedidos
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}