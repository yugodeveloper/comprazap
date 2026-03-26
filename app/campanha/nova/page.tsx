'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function NovaCampanha() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [price, setPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  // --- VERIFICA SE O USUÁRIO ESTÁ LOGADO VIA LOCALSTORAGE ---
  useEffect(() => {
    const savedId = localStorage.getItem('user_id')
    if (!savedId) {
      alert("Sessão expirada. Por favor, entre novamente.")
      router.push('/')
      return
    }
    setUserId(savedId)
  }, [router])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setLoading(true)
    try {
      // 1. Criar a Campanha vinculada ao creator_id (nosso user_id manual)
      const { data: campaign, error: cpError } = await supabase
        .from('campaigns')
        .insert({
          title,
          description,
          pix_key: pixKey,
          creator_id: userId,
          status: 'active'
        })
        .select()
        .single()

      if (cpError) throw cpError

      // 2. Criar o Produto padrão para esta campanha
      const { error: pdError } = await supabase
        .from('products')
        .insert({
          campaign_id: campaign.id,
          price: parseFloat(price.replace(',', '.')), // Garante formato decimal
          variations: { "Opção": ["Padrão"] }
        })

      if (pdError) throw pdError

      alert("🚀 Oferta lançada com sucesso!")
      router.push('/')
    } catch (err: any) {
      console.error(err)
      alert("Erro ao criar oferta: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center font-sans text-slate-900">
      <div className="w-full max-w-md bg-white rounded-[40px] p-8 shadow-2xl border border-slate-100">
        
        <header className="mb-8">
          <button onClick={() => router.push('/')} className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">← Voltar</button>
          <h1 className="text-3xl font-black italic tracking-tighter">Lançar Oferta ⚡</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">O condomínio vai amar isso.</p>
        </header>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Título da Oferta</label>
            <input 
              placeholder="Ex: Cuca de Banana Artesanal" 
              required 
              className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-600 transition-all"
              value={title} onChange={e => setTitle(e.target.value)} 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Descrição Curta</label>
            <textarea 
              placeholder="Conte detalhes do produto..." 
              className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-600 transition-all h-24 resize-none"
              value={description} onChange={e => setDescription(e.target.value)} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Preço (R$)</label>
              <input 
                type="text" placeholder="25,00" required 
                className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-600 transition-all"
                value={price} onChange={e => setPrice(e.target.value)} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Chave PIX</label>
              <input 
                placeholder="CPF, e-mail ou Cel" required 
                className="w-full p-5 bg-slate-50 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-blue-600 transition-all"
                value={pixKey} onChange={e => setPixKey(e.target.value)} 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 text-white py-6 rounded-[30px] font-black text-xl shadow-2xl active:scale-95 transition-all mt-4 disabled:bg-slate-300"
          >
            {loading ? 'PUBLICANDO...' : 'LANÇAR NO CONDOMÍNIO'}
          </button>
        </form>
      </div>
      
      <p className="mt-8 text-[10px] font-black text-slate-300 uppercase tracking-widest">CompraZap ⚡ Lanai</p>
    </div>
  )
}