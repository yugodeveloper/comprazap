'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function NovaCampanha() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [maxSales, setMaxSales] = useState('50')
  
  const [headerImg, setHeaderImg] = useState('')
  const [gallery, setGallery] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  const [variations, setVariations] = useState([{ name: '', price: '' }])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, isHeader: boolean) => {
    if (!e.target.files || e.target.files.length === 0) return
    setUploading(true)
    const files = Array.from(e.target.files)
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `campaigns/${Date.now()}-${Math.random()}.${fileExt}`
      const { error: upErr } = await supabase.storage.from('comprovantes').upload(fileName, file)
      
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('comprovantes').getPublicUrl(fileName)
        if (isHeader) setHeaderImg(publicUrl)
        else setGallery(prev => [...prev, publicUrl].slice(0, 5))
      }
    }
    setUploading(false)
  }

  const addVariation = () => setVariations([...variations, { name: '', price: '' }])
  const removeVariation = (index: number) => setVariations(variations.filter((_, i) => i !== index))
  const updateVariation = (index: number, field: 'name' | 'price', value: string) => {
    const newVars = [...variations]
    newVars[index][field] = value
    setVariations(newVars)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!headerImg) return alert("Adicione uma imagem de capa!")
    setLoading(true)

    try {
      const userId = localStorage.getItem('user_id')
      if (!userId) throw new Error("Usuário não identificado.")

      const { data: camp, error: campErr } = await supabase
        .from('campaigns')
        .insert({
          title, description, pix_key: pixKey, expires_at: expiresAt,
          max_sales: parseInt(maxSales), image_url: headerImg, 
          image_gallery: gallery, creator_id: userId, status: 'active'
        })
        .select().single()

      if (campErr) throw campErr

      const formattedVariations = variations.map(v => ({
        name: v.name,
        price: parseFloat(v.price.replace(',', '.'))
      }))

      await supabase.from('products').insert({
        campaign_id: camp.id, name: title,
        price: formattedVariations[0].price,
        variations: formattedVariations 
      })

      alert("Oferta de Cucas lançada! 🚀")
      router.push('/')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '15px', borderRadius: '15px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '450px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h1 style={{ fontSize: '18px', fontWeight: '900', fontStyle: 'italic', margin: 0 }}>Criar Oferta de Cucas ⚡</h1>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Capa da Campanha</label>
            {headerImg ? (
              <div style={{ width: '100%', height: '120px', borderRadius: '15px', overflow: 'hidden', position: 'relative' }}>
                <img src={headerImg} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button type="button" onClick={() => setHeaderImg('')} style={{ position: 'absolute', top: 5, right: 5, background: 'black', color: 'white', border: 'none', borderRadius: '50%', width: '25px', height: '25px', cursor: 'pointer' }}>✕</button>
              </div>
            ) : (
              <label style={{ width: '100%', height: '100px', borderRadius: '15px', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backgroundColor: 'white' }}>
                <input type="file" accept="image/*" hidden onChange={(e) => handleUpload(e, true)} disabled={uploading} />
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' }}>{uploading ? 'Processando...' : '+ Capa Horizontal'}</span>
              </label>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Fotos Detalhadas (Carrossel)</label>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                {gallery.map((img, i) => (
                  <div key={i} style={{ width: '80px', height: '110px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                    <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => setGallery(gallery.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px' }}>✕</button>
                  </div>
                ))}
                {gallery.length < 5 && (
                  <label style={{ width: '80px', height: '110px', borderRadius: '12px', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, backgroundColor: 'white' }}>
                    <input type="file" multiple accept="image/*" hidden onChange={(e) => handleUpload(e, false)} disabled={uploading} />
                    <span style={{ fontSize: '16px', color: '#94a3b8' }}>+</span>
                  </label>
                )}
            </div>
          </div>

          <input placeholder="Título (ex: Cucas da Vovó)" required style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} />
          <textarea placeholder="História, sabores e entregas..." required style={{ ...inputStyle, height: '120px' }} value={description} onChange={e => setDescription(e.target.value)} />

          <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '25px', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '15px', textAlign: 'center' }}>Variações de Preço</label>
            {variations.map((v, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input placeholder="Ex: Sabor" required style={{ ...inputStyle, padding: '10px' }} value={v.name} onChange={e => updateVariation(index, 'name', e.target.value)} />
                    <input placeholder="R$" required style={{ ...inputStyle, padding: '10px', width: '80px' }} value={v.price} onChange={e => updateVariation(index, 'price', e.target.value)} />
                    {variations.length > 1 && <button type="button" onClick={() => removeVariation(index)} style={{ border: 'none', background: 'none', color: '#f87171', cursor: 'pointer' }}>✕</button>}
                </div>
            ))}
            <button type="button" onClick={addVariation} style={{ width: '100%', padding: '8px', border: 'none', background: '#f1f5f9', borderRadius: '10px', fontSize: '10px', fontWeight: '900', cursor: 'pointer' }}>+ ADICIONAR ITEM</button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
             <input type="date" required style={inputStyle} value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
             <input type="number" placeholder="Limite" style={{ ...inputStyle, width: '100px' }} value={maxSales} onChange={e => setMaxSales(e.target.value)} />
          </div>
          <input placeholder="Sua Chave Pix" required style={inputStyle} value={pixKey} onChange={e => setPixKey(e.target.value)} />

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '18px', backgroundColor: '#059669', color: 'white', borderRadius: '50px', border: 'none', fontWeight: '900', cursor: 'pointer' }}>
            {loading ? 'LANÇANDO...' : 'LANÇAR NO GRUPO 🚀'}
          </button>
        </form>
      </div>
    </div>
  )
}