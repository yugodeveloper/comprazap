'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function NovaCampanha() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [price, setPrice] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()

  // --- PERSISTÊNCIA DE LOGIN ---
  useEffect(() => {
    const savedId = localStorage.getItem('user_id')
    if (!savedId) {
      alert("Sessão expirada. Por favor, entre novamente.")
      router.push('/')
      return
    }
    setUserId(savedId)
  }, [router])

  // --- UPLOAD DE IMAGEM ---
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!e.target.files || e.target.files.length === 0) return
      setUploading(true)
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}-${Math.random()}.${fileExt}`
      const filePath = `campaign-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('comprovantes') // Usando o bucket que já temos permissão
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('comprovantes')
        .getPublicUrl(filePath)

      setImageUrl(publicUrl)
    } catch (error: any) {
      alert('Erro ao subir imagem: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return

    setLoading(true)
    try {
      // 1. Criar a Campanha
      const { data: campaign, error: cpError } = await supabase
        .from('campaigns')
        .insert({
          title,
          description,
          pix_key: pixKey,
          image_url: imageUrl, // Imagem restaurada aqui!
          creator_id: userId,
          status: 'active'
        })
        .select()
        .single()

      if (cpError) throw cpError

      // 2. Criar o Produto padrão
      const { error: pdError } = await supabase
        .from('products')
        .insert({
          campaign_id: campaign.id,
          price: parseFloat(price.replace(',', '.')),
          variations: { "Opção": ["Padrão"] }
        })

      if (pdError) throw pdError

      alert("🚀 Oferta lançada com sucesso!")
      router.push('/')
    } catch (err: any) {
      alert("Erro ao criar oferta: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center font-sans text-slate-900">
      <div className="w-full max-w-md bg-white rounded-[40px] p-8 shadow-2xl border border-slate-100">
        
        <header className="mb-6">
          <button onClick={() => router.push('/')} className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">← Voltar</button>
          <h1 className="text-3xl font-black italic tracking-tighter">Lançar Oferta ⚡</h1>
        </header>

        <form onSubmit={handleCreate} className="space-y-4">
          
          {/* ÁREA DE FOTO (RESTAURADA) */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Foto do Produto</label>
            <div className="relative h-40 w-full bg-slate-100 rounded-3xl border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center">
              {imageUrl ? (
                <img src={imageUrl} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="text-center">
                   <p className="text-2xl">📸</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Toque para enviar</p>
                </div>
              )}
              <input 
                type="file" accept="image/*" onChange={handleUploadImage}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {uploading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <p className="animate-pulse text-[10px] font-black text-blue-600">SUBINDO...</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Título</label>
            <input 
              placeholder="Ex: Cuca de Banana" required 
              className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none"
              value={title} onChange={e => setTitle(e.target.value)} 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Descrição</label>
            <textarea 
              placeholder="Detalhes..." 
              className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none h-20"
              value={description} onChange={e => setDescription(e.target.value)} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Preço (R$)</label>
              <input 
                type="text" placeholder="25,00" required 
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none"
                value={price} onChange={e => setPrice(e.target.value)} 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Chave PIX</label>
              <input 
                placeholder="PIX" required 
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none"
                value={pixKey} onChange={e => setPixKey(e.target.value)} 
              />
            </div>
          </div>

          <button 
            type="submit" disabled={loading || uploading}
            className="w-full bg-slate-900 text-white py-6 rounded-[30px] font-black text-xl shadow-2xl active:scale-95 transition-all mt-4 disabled:bg-slate-300"
          >
            {loading ? 'PUBLICANDO...' : 'LANÇAR NO CONDOMÍNIO'}
          </button>
        </form>
      </div>
    </div>
  )
}