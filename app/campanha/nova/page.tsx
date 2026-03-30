'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function NovaCampanha() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // Campos Principais
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [maxSales, setMaxSales] = useState('20')
  const [imageUrl, setImageUrl] = useState('')

  // LISTA DINÂMICA DE TIPOS E PREÇOS
  const [variations, setVariations] = useState([{ name: '', price: '' }])

  const addVariation = () => {
    setVariations([...variations, { name: '', price: '' }])
  }

  const removeVariation = (index: number) => {
    const newVars = variations.filter((_, i) => i !== index)
    setVariations(newVars)
  }

  const updateVariation = (index: number, field: 'name' | 'price', value: string) => {
    const newVars = [...variations]
    newVars[index][field] = value
    setVariations(newVars)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const userId = localStorage.getItem('user_id')
      if (!userId) throw new Error("Usuário não logado")

      // 1. Criar a Campanha
      const { data: camp, error: campErr } = await supabase
        .from('campaigns')
        .insert({
          title,
          description,
          pix_key: pixKey,
          expires_at: expiresAt,
          max_sales: parseInt(maxSales),
          image_url: imageUrl,
          creator_id: userId,
          status: 'active'
        })
        .select()
        .single()

      if (campErr) throw campErr

      // 2. Criar o Produto vinculado com as variações (JSON)
      // Transformamos os preços em números antes de salvar
      const formattedVariations = variations.map(v => ({
        name: v.name,
        price: parseFloat(v.price.replace(',', '.'))
      }))

      const { error: prodErr } = await supabase
        .from('products')
        .insert({
          campaign_id: camp.id,
          name: title,
          price: formattedVariations[0].price, // Preço base (mínimo)
          variations: formattedVariations 
        })

      if (prodErr) throw prodErr

      alert("Campanha lançada com sucesso! 🚀")
      router.push('/')
    } catch (err: any) {
      alert("Erro ao criar: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = "w-full p-4 bg-white rounded-2xl border border-slate-200 focus:border-emerald-500 outline-none font-medium text-sm transition-all";

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="max-w-md mx-auto space-y-8">
        
        <header className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-2xl">←</button>
          <h1 className="text-xl font-black italic">Nova Campanha ⚡</h1>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* INFORMAÇÕES BÁSICAS */}
          <section className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">O que você vai vender?</p>
            <input placeholder="Título (ex: Cuca da Vavá)" required className={inputStyle} value={title} onChange={e => setTitle(e.target.value)} />
            <textarea placeholder="Descrição (detalhes do produto...)" required className={`${inputStyle} h-32 resize-none`} value={description} onChange={e => setDescription(e.target.value)} />
            <input placeholder="URL da Imagem do Produto" className={inputStyle} value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
          </section>

          {/* TIPOS E PREÇOS DINÂMICOS */}
          <section className="space-y-4 bg-white p-6 rounded-[30px] border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tipos e Valores</p>
            
            {variations.map((v, index) => (
              <div key={index} className="flex gap-2 items-center animate-in slide-in-from-left duration-300">
                <input 
                  placeholder="Nome (ex: G de Maçã)" 
                  required 
                  className="flex-1 p-3 bg-slate-50 rounded-xl text-xs border-none outline-none"
                  value={v.name}
                  onChange={(e) => updateVariation(index, 'name', e.target.value)}
                />
                <input 
                  placeholder="Preço R$" 
                  type="text"
                  required 
                  className="w-20 p-3 bg-slate-50 rounded-xl text-xs border-none outline-none font-bold text-emerald-600"
                  value={v.price}
                  onChange={(e) => updateVariation(index, 'price', e.target.value)}
                />
                {variations.length > 1 && (
                  <button type="button" onClick={() => removeVariation(index)} className="text-red-400 p-2">✕</button>
                )}
              </div>
            ))}
            
            <button 
              type="button" 
              onClick={addVariation}
              className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-black text-slate-400 uppercase hover:bg-slate-50"
            >
              + Adicionar Opção
            </button>
          </section>

          {/* REGRAS E PAGAMENTO */}
          <section className="space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Configurações</p>
            
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Data de Fim</label>
                <input type="date" required className={inputStyle} value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
              </div>
              <div className="w-1/3">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1 block">Limite Un.</label>
                <input type="number" required className={inputStyle} value={maxSales} onChange={e => setMaxSales(e.target.value)} />
              </div>
            </div>

            <input placeholder="Sua Chave Pix para Receber" required className={inputStyle} value={pixKey} onChange={e => setPixKey(e.target.value)} />
          </section>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-6 bg-emerald-600 text-white rounded-[30px] font-black text-lg shadow-xl shadow-emerald-100 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'LANÇANDO...' : 'LANÇAR CAMPANHA 🚀'}
          </button>

        </form>
      </div>
    </div>
  )
}