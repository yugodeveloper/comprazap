'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

function NovaCampanhaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id')
  
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

  // CARREGAR DADOS SE FOR EDIÇÃO
  useEffect(() => {
    if (editId) {
      const loadEditData = async () => {
        const { data: camp } = await supabase.from('campaigns').select('*, products(*)').eq('id', editId).single();
        if (camp) {
          setTitle(camp.title || '');
          setDescription(camp.description || '');
          setPixKey(camp.pix_key || '');
          setExpiresAt(camp.expires_at?.split('T')[0] || '');
          setMaxSales(camp.max_sales?.toString() || '50');
          setHeaderImg(camp.image_url || '');
          setGallery(camp.image_gallery || []);
          
          if (camp.products && camp.products.length > 0) {
            const vars = camp.products[0].variations;
            if (Array.isArray(vars)) {
              setVariations(vars.map((v: any) => ({ name: v.name, price: v.price.toString() })));
            }
          }
        }
      }
      loadEditData();
    }
  }, [editId]);

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
  
  // FUNÇÃO CORRIGIDA (DENTRO DO COMPONENTE)
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
      
      const payload = {
        title, 
        description, 
        pix_key: pixKey, 
        expires_at: expiresAt,
        max_sales: parseInt(maxSales), 
        image_url: headerImg || null, // Garante a exclusão no banco enviando null
        image_gallery: gallery, 
        creator_id: userId, 
        status: 'active'
      };

      let campId = editId;
      if (editId) {
        const { error: updErr } = await supabase.from('campaigns').update(payload).eq('id', editId);
        if (updErr) throw updErr;
      } else {
        const { data: camp, error: insErr } = await supabase.from('campaigns').insert(payload).select().single();
        if (insErr) throw insErr;
        campId = camp.id;
      }

      const formattedVariations = variations.map(v => ({
        name: v.name, price: parseFloat(v.price.replace(',', '.'))
      }))

      if (editId) {
        await supabase.from('products').update({ name: title, price: formattedVariations[0].price, variations: formattedVariations }).eq('campaign_id', editId);
      } else {
        await supabase.from('products').insert({ campaign_id: campId, name: title, price: formattedVariations[0].price, variations: formattedVariations });
      }

      alert("Oferta salva com sucesso! 🚀");
      router.push('/');
      router.refresh();
    } catch (err: any) { 
      alert("Erro ao salvar: " + err.message); 
    } finally { 
      setLoading(false); 
    }
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '15px', borderRadius: '15px', border: '1px solid #e2e8f0', fontSize: '14px', boxSizing: 'border-box' };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '450px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '25px' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h1 style={{ fontSize: '18px', fontWeight: '900', fontStyle: 'italic', margin: 0 }}>{editId ? 'Editar Oferta' : 'Criar Oferta'} ⚡</h1>
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
                <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' }}>{uploading ? 'Processando...' : '+ Adicionar Capa'}</span>
              </label>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Fotos Detalhadas (Carrossel)</label>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                {gallery.map((img, i) => (
                  <div key={i} style={{ width: '80px', height: '110px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                    <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => setGallery(gallery.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer' }}>✕</button>
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

          <input placeholder="Título" required style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} />
          <textarea placeholder="História e sabores..." required style={{ ...inputStyle, height: '120px' }} value={description} onChange={e => setDescription(e.target.value)} />

          <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '25px', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '15px', textAlign: 'center' }}>Variações de Preço</label>
            {variations.map((v, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input placeholder="Item" required style={{ ...inputStyle, padding: '10px' }} value={v.name} onChange={e => updateVariation(index, 'name', e.target.value)} />
                    <input placeholder="R$" required style={{ ...inputStyle, padding: '10px', width: '80px' }} value={v.price} onChange={e => updateVariation(index, 'price', e.target.value)} />
                    {variations.length > 1 && <button type="button" onClick={() => removeVariation(index)} style={{ border: 'none', background: 'none', color: '#f87171', cursor: 'pointer' }}>✕</button>}
                </div>
            ))}
            <button type="button" onClick={addVariation} style={{ width: '100%', padding: '8px', border: 'none', background: '#f1f5f9', borderRadius: '10px', fontSize: '10px', fontWeight: '900', cursor: 'pointer' }}>+ ADICIONAR ITEM</button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
             <div style={{ flex: 1 }}>
                <label style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', marginBottom: '5px', display: 'block' }}>PEDIDOS ATÉ</label>
                <input type="date" required style={inputStyle} value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
             </div>
             <div style={{ width: '100px' }}>
                <label style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', marginBottom: '5px', display: 'block' }}>LIMITE</label>
                <input type="number" required style={inputStyle} value={maxSales} onChange={e => setMaxSales(e.target.value)} />
             </div>
          </div>
          <input placeholder="Sua Chave Pix" required style={inputStyle} value={pixKey} onChange={e => setPixKey(e.target.value)} />

          <button type="submit" disabled={loading} style={{ width: '100%', padding: '18px', backgroundColor: '#059669', color: 'white', borderRadius: '50px', border: 'none', fontWeight: '900', cursor: 'pointer' }}>
            {loading ? 'SALVANDO...' : 'SALVAR OFERTA 🚀'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function NovaCampanha() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <NovaCampanhaContent />
    </Suspense>
  )
}