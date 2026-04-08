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
  const [shareImg, setShareImg] = useState('') 
  const [gallery, setGallery] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [variations, setVariations] = useState([{ name: '', price: '' }])
  
  // ESTADOS DE CONTROLE
  const [existingProductId, setExistingProductId] = useState<string | null>(null)

  const maskDate = (value: string) => {
    return value.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2").replace(/(\/\d{4})\d+?$/, "$1");
  };

  useEffect(() => {
    if (editId) {
      const loadEditData = async () => {
        const { data: camp, error } = await supabase
          .from('campaigns')
          .select('*, products(*)')
          .eq('id', editId)
          .single();

        if (camp && !error) {
          setTitle(camp.title || '');
          setDescription(camp.description || '');
          setPixKey(camp.pix_key || '');
          if (camp.expires_at) {
            setExpiresAt(new Date(camp.expires_at).toLocaleDateString('pt-BR'));
          }
          setMaxSales(camp.max_sales?.toString() || '50');
          setHeaderImg(camp.image_url || '');
          setShareImg(camp.share_image || '');
          setGallery(Array.isArray(camp.image_gallery) ? camp.image_gallery : []);
          
          if (camp.products) {
            const prod = Array.isArray(camp.products) ? camp.products[0] : camp.products;
            if (prod) {
              setExistingProductId(prod.id); // Captura o ID real da linha de produtos
              let loadedVars = [];
              if (typeof prod.variations === 'string') {
                try { loadedVars = JSON.parse(prod.variations); } catch(e) { loadedVars = []; }
              } else {
                loadedVars = prod.variations;
              }
              if (Array.isArray(loadedVars) && loadedVars.length > 0) {
                setVariations(loadedVars.map((v: any) => ({
                  name: String(v.name || ''),
                  price: String(v.price || '')
                })));
              }
            }
          }
        }
      };
      loadEditData();
    }
  }, [editId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'header' | 'share' | 'gallery') => {
    if (!e.target.files || e.target.files.length === 0) return
    setUploading(true)
    const files = Array.from(e.target.files)
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `campaigns/${Date.now()}-${Math.random()}.${fileExt}`
      const { error: upErr } = await supabase.storage.from('comprovantes').upload(fileName, file)
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('comprovantes').getPublicUrl(fileName)
        if (type === 'header') setHeaderImg(publicUrl)
        else if (type === 'share') setShareImg(publicUrl)
        else setGallery(prev => [...prev, publicUrl].slice(0, 5))
      }
    }
    setUploading(false)
  }

  const addVariation = () => setVariations([...variations, { name: '', price: '' }])
  const removeVariation = (index: number) => {
    if (variations.length === 1) return alert("Mínimo de 1 item");
    setVariations(variations.filter((_, i) => i !== index));
  }
  const updateVariation = (index: number, field: 'name' | 'price', value: string) => {
    const newVars = [...variations];
    (newVars[index] as any)[field] = value;
    setVariations(newVars);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const userId = localStorage.getItem('user_id')
      if (!userId) throw new Error("Sessão expirada.");

      const parts = expiresAt.split('/');
      const isoDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}T23:59:59` : null;

      const payload = {
        title, description, pix_key: pixKey, expires_at: isoDate, max_sales: parseInt(maxSales),
        image_url: headerImg || null, share_image: shareImg || null, image_gallery: gallery,
        creator_id: userId, status: 'active'
      };

      let campId = editId;
      if (editId) {
        await supabase.from('campaigns').update(payload).eq('id', editId);
      } else {
        const { data: camp } = await supabase.from('campaigns').insert(payload).select().single();
        if (!camp) throw new Error("Erro ao criar campanha.");
        campId = camp.id;
      }

      const formattedVariations = variations
        .filter(v => v.name && v.price)
        .map(v => ({
          name: v.name, 
          price: parseFloat(String(v.price).replace(',', '.'))
        }));

      // --- UPSERT COM ID PRIMÁRIO (CURA O ERRO DE RLS) ---
      const productPayload: any = {
        campaign_id: campId,
        variations: formattedVariations
      };

      if (existingProductId) {
        productPayload.id = existingProductId; // Se for edição, manda o ID da linha
      }

      const { error: prodErr } = await supabase
        .from('products')
        .upsert(productPayload, { onConflict: 'campaign_id' });

      if (prodErr) throw prodErr;

      alert("Campanha salva com sucesso! 🚀");
      window.location.href = '/';
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
          <h1 style={{ fontSize: '18px', fontWeight: '900', fontStyle: 'italic', margin: 0 }}>{editId ? 'Editar Campanha' : 'Nova Campanha'} 🥧</h1>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Blocos de imagem... */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <label style={{ flex: 1.5, height: '100px', backgroundColor: 'white', borderRadius: '15px', border: '2px dashed #cbd5e1', overflow: 'hidden', cursor:'pointer' }}>
              <input type="file" hidden onChange={(e) => handleUpload(e, 'header')} />
              {headerImg ? <img src={headerImg} style={{width:'100%', height:'100%', objectFit:'cover'}} alt="" /> : <div style={{textAlign:'center', fontSize:10, marginTop:40}}>+ CAPA</div>}
            </label>
            <label style={{ flex: 1, height: '100px', backgroundColor: 'white', borderRadius: '10px', border: '2px dashed #059669', overflow: 'hidden', cursor:'pointer' }}>
              <input type="file" hidden onChange={(e) => handleUpload(e, 'share')} />
              {shareImg ? <img src={shareImg} style={{width:'100%', height:'100%', objectFit:'contain'}} alt="" /> : <div style={{textAlign:'center', fontSize:10, marginTop:40}}>+ CARD</div>}
            </label>
          </div>

          {/* Galeria... */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }}>Galeria (Até 5)</label>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto' }}>
                {gallery.map((img, i) => (
                  <div key={i} style={{ width: '80px', height: '110px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                    <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    <button type="button" onClick={() => setGallery(gallery.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px' }}>✕</button>
                  </div>
                ))}
                {gallery.length < 5 && (
                  <label style={{ width: '80px', height: '110px', borderRadius: '12px', border: '2px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, backgroundColor: 'white' }}>
                    <input type="file" multiple accept="image/*" hidden onChange={(e) => handleUpload(e, 'gallery')} /><span style={{ fontSize: '16px', color: '#94a3b8' }}>+</span>
                  </label>
                )}
            </div>
          </div>

          <input placeholder="Título da Campanha" required style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} />
          <textarea placeholder="História e sabores..." required style={{ ...inputStyle, height: '100px' }} value={description} onChange={e => setDescription(e.target.value)} />

          <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '25px', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '15px', textAlign: 'center' }}>Variações e Preços</label>
            {variations.map((v, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                    <input placeholder="Item" required style={{ ...inputStyle, padding: '12px' }} value={v.name} onChange={e => updateVariation(index, 'name', e.target.value)} />
                    <input placeholder="R$" required style={{ ...inputStyle, padding: '12px', width: '90px' }} value={v.price} onChange={e => updateVariation(index, 'price', e.target.value)} />
                    <button type="button" onClick={() => removeVariation(index)} style={{ border: 'none', background: '#fee2e2', color: '#ef4444', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', flexShrink: 0 }}>✕</button>
                </div>
            ))}
            <button type="button" onClick={addVariation} style={{ width: '100%', padding: '12px', border: 'none', background: '#f1f5f9', borderRadius: '12px', fontSize: '11px', fontWeight: '900', color: '#059669', cursor: 'pointer' }}>+ ADICIONAR ITEM</button>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
             <div style={{ flex: 1 }}>
                <label style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', marginBottom: '5px', display: 'block' }}>PEDIDOS ATÉ</label>
                <div style={{ position: 'relative' }}>
                  <input placeholder="dd/mm/aaaa" required style={inputStyle} value={expiresAt} onChange={e => setExpiresAt(maskDate(e.target.value))} />
                  <input 
                    type="date" 
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', width: '24px', opacity: 0.5 }} 
                    onChange={e => {
                      const date = new Date(e.target.value + 'T00:00:00');
                      setExpiresAt(date.toLocaleDateString('pt-BR'));
                    }}
                  />
                </div>
             </div>
             <div style={{ width: 100 }}><label style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', marginBottom: '5px', display: 'block' }}>LIMITE</label><input type="number" required style={inputStyle} value={maxSales} onChange={e => setMaxSales(e.target.value)} /></div>
          </div>
          <input placeholder="Sua Chave Pix" required style={inputStyle} value={pixKey} onChange={e => setPixKey(e.target.value)} />

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" onClick={() => router.push('/')} style={{ flex: 1, padding: '18px', backgroundColor: '#f1f5f9', color: '#64748b', borderRadius: '50px', border: 'none', fontWeight: '900', cursor: 'pointer' }}>CANCELAR</button>
            <button type="submit" disabled={loading} style={{ flex: 2, padding: '18px', backgroundColor: '#059669', color: 'white', borderRadius: '50px', border: 'none', fontWeight: '900', cursor: 'pointer' }}>
              {loading ? 'SALVANDO...' : 'SALVAR CAMPANHA 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NovaCampanha() {
  return ( <Suspense fallback={<div>Carregando...</div>}><NovaCampanhaContent /></Suspense> )
}