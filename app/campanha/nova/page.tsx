'use client'
import { supabase } from '../../lib/supabase' 
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NovaCampanha() {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [price, setPrice] = useState('')
  const [pix, setPix] = useState('')
  const [expires, setExpires] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [variationsInput, setVariationsInput] = useState('') // Ex: "Tamanho: P, M; Sabor: Banana"
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const parseVariations = (input: string) => {
    if (!input) return {};
    const variations: any = {};
    const parts = input.split(';');
    parts.forEach(part => {
      const [key, valuesText] = part.split(':');
      if (key && valuesText) {
        variations[key.trim()] = valuesText.split(',').map(v => v.trim());
      }
    });
    return variations;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Faça login novamente.')

      let imageUrl = ''
      if (imageFile) {
        // Limpa o nome do arquivo para evitar erros de URL
        const fileExt = imageFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        const { error: upErr } = await supabase.storage
          .from('fotos-campanhas') 
          .upload(fileName, imageFile)

        if (upErr) throw upErr

        const { data: { publicUrl } } = supabase.storage
          .from('fotos-campanhas')
          .getPublicUrl(fileName)
        
        imageUrl = publicUrl
      }

      // 1. Criar Campanha
      const { data: cp, error: cpErr } = await supabase.from('campaigns').insert({
        title, description: desc, pix_key: pix, 
        creator_id: user.id, image_url: imageUrl,
        expires_at: expires ? new Date(expires).toISOString() : null,
        location: 'Lanai - Retirar com Vendedor',
        status: 'active'
      }).select().single()

      if (cpErr) throw cpErr

      // 2. Criar Produto com as variações digitadas
      const variationsJson = parseVariations(variationsInput);
      await supabase.from('products').insert({
        campaign_id: cp.id,
        name: title,
        price: parseFloat(price),
        variations: variationsJson
      })

      router.push('/')
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 flex flex-col items-center font-sans">
      <div className="w-full max-w-md bg-white p-8 rounded-[32px] shadow-xl border border-slate-100">
        <h1 className="text-2xl font-black text-slate-900 mb-6">Lançar Oferta 🎉</h1>
        
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Foto do Produto</label>
            <input 
              type="file" accept="image/*" 
              onChange={e => setImageFile(e.target.files?.[0] || null)} 
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" 
            />
          </div>

          <input placeholder="Título (ex: Cuca de Banana)" required className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-blue-500 font-medium text-slate-900" value={title} onChange={e => setTitle(e.target.value)} />
          
          <textarea placeholder="Descrição curta..." className="w-full p-4 bg-slate-50 rounded-2xl h-24 text-slate-900" value={desc} onChange={e => setDesc(e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Preço R$" type="number" step="0.01" required className="p-4 bg-slate-50 rounded-2xl text-slate-900" value={price} onChange={e => setPrice(e.target.value)} />
            <input type="date" className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-500" value={expires} onChange={e => setExpires(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Variações (Separe por ; e ,)</label>
            <input 
              placeholder="Ex: Sabor: Banana, Mel; Tamanho: P, G" 
              className="w-full p-4 bg-slate-50 rounded-2xl text-xs text-slate-900 border border-slate-100" 
              value={variationsInput} onChange={e => setVariationsInput(e.target.value)} 
            />
          </div>

          <input placeholder="Chave Pix" required className="w-full p-4 bg-slate-50 rounded-2xl font-mono text-blue-600 border border-slate-100" value={pix} onChange={e => setPix(e.target.value)} />

          <button disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all">
            {loading ? 'PUBLICANDO...' : 'LANÇAR AGORA'}
          </button>
        </form>
      </div>
    </div>
  )
}