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

  const maskDate = (value: string) => value.replace(/\D/g, "").replace(/(\d{2})(\d)/, "$1/$2").replace(/(\d{2})(\d)/, "$1/$2").replace(/(\/\d{4})\d+?$/, "$1");

  useEffect(() => {
    if (editId) {
      const loadEditData = async () => {
        const { data: camp } = await supabase.from('campaigns').select('*, products(*)').eq('id', editId).single();
        if (camp) {
          setTitle(camp.title || ''); setDescription(camp.description || ''); setPixKey(camp.pix_key || '');
          if (camp.expires_at) setExpiresAt(new Date(camp.expires_at).toLocaleDateString('pt-BR'));
          setMaxSales(camp.max_sales?.toString() || '50'); setHeaderImg(camp.image_url || ''); setShareImg(camp.share_image || '');
          setGallery(Array.isArray(camp.image_gallery) ? camp.image_gallery : []);
          if (camp.products && camp.products.length > 0) {
            const prod = camp.products[0];
            const loadedVars = Array.isArray(prod.variations) ? prod.variations : [];
            setVariations(loadedVars.length > 0 ? loadedVars.map((v: any) => ({ name: v.name, price: v.price.toString() })) : [{ name: '', price: '' }]);
          }
        }
      };
      loadEditData();
    }
  }, [editId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'header' | 'share' | 'gallery') => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    const files = Array.from(e.target.files);
    for (const file of files) {
      const fileName = `campaigns/${Date.now()}-${Math.random()}.${file.name.split('.').pop()}`;
      const { error: upErr } = await supabase.storage.from('comprovantes').upload(fileName, file);
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('comprovantes').getPublicUrl(fileName);
        if (type === 'header') setHeaderImg(publicUrl);
        else if (type === 'share') setShareImg(publicUrl);
        else setGallery(prev => [...prev, publicUrl].slice(0, 5));
      }
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const userId = localStorage.getItem('user_id');
      const parts = expiresAt.split('/');
      const isoDate = parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}T23:59:59` : null;

      const payload = {
        title, description, pix_key: pixKey, expires_at: isoDate, max_sales: parseInt(maxSales),
        image_url: headerImg || null, share_image: shareImg || null, image_gallery: gallery,
        creator_id: userId, status: 'active'
      };

      let campId = editId;
      if (editId) { await supabase.from('campaigns').update(payload).eq('id', editId); }
      else { const { data: camp } = await supabase.from('campaigns').insert(payload).select().single(); campId = camp.id; }

      const formattedVars = variations.filter(v => v.name && v.price).map(v => ({ name: v.name, price: parseFloat(v.price.toString().replace(',', '.')) }));

      // SALVAMENTO GARANTIDO DE PRODUTOS
      await supabase.from('products').delete().eq('campaign_id', campId);
      await supabase.from('products').insert({
        campaign_id: campId, name: title, price: formattedVars[0]?.price || 0, variations: formattedVars
      });

      alert("Campanha salva com sucesso! 🚀"); router.push('/');
    } catch (err: any) { alert("Erro: " + err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '450px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '900' }}>{editId ? 'Editar' : 'Nova'} Campanha ⚡</h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <label style={{ flex: 1, height: '100px', border: '2px dashed #ddd', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', backgroundColor:'white' }}>
              <input type="file" hidden onChange={e => handleUpload(e, 'header')} />
              {headerImg ? <img src={headerImg} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : 'Capa Página'}
            </label>
            <label style={{ flex: 1, height: '100px', border: '2px dashed #059669', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', backgroundColor:'white' }}>
              <input type="file" hidden onChange={e => handleUpload(e, 'share')} />
              {shareImg ? <img src={shareImg} style={{width:'100%', height:'100%', objectFit:'contain'}} /> : 'Polaroid Card'}
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8' }}>GALERIA (ATÉ 5 FOTOS)</label>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
              {gallery.map((img, i) => (
                <div key={i} style={{ width: '80px', height: '100px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                  <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => setGallery(gallery.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: 2, right: 2, background: 'black', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px' }}>✕</button>
                </div>
              ))}
              {gallery.length < 5 && (
                <label style={{ width: '80px', height: '100px', borderRadius: '10px', border: '2px dashed #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, backgroundColor:'white' }}>
                  <input type="file" multiple hidden onChange={e => handleUpload(e, 'gallery')} />
                  <span style={{fontSize:'24px', color:'#999'}}>+</span>
                </label>
              )}
            </div>
          </div>

          <input placeholder="Título" required style={{padding:'15px', borderRadius:'15px', border:'1px solid #ddd'}} value={title} onChange={e => setTitle(e.target.value)} />
          <textarea placeholder="História e sabores..." required style={{padding:'15px', borderRadius:'15px', border:'1px solid #ddd', height:'120px'}} value={description} onChange={e => setDescription(e.target.value)} />
          
          <div style={{ background: '#fff', padding: '15px', borderRadius: '25px', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', display: 'block', marginBottom: '15px', textAlign: 'center' }}>OPÇÕES DE COMPRA</label>
            {variations.map((v, i) => (
              <div key={i} style={{display:'flex', gap:8, marginBottom:8}}>
                <input placeholder="Produto" style={{flex:2, padding:'12px', borderRadius:'12px', border:'1px solid #ddd'}} value={v.name} onChange={e => { const n = [...variations]; n[i].name = e.target.value; setVariations(n); }} />
                <input placeholder="R$" style={{flex:1, padding:'12px', borderRadius:'12px', border:'1px solid #ddd'}} value={v.price} onChange={e => { const n = [...variations]; n[i].price = e.target.value; setVariations(n); }} />
              </div>
            ))}
            <button type="button" onClick={() => setVariations([...variations, {name:'', price:''}])} style={{width:'100%', padding:'10px', border:'none', background:'#f8fafc', borderRadius:'12px', fontSize:'11px', fontWeight:900, color:'#059669'}}>+ NOVO ITEM</button>
          </div>
          
          <div style={{display:'flex', gap:10}}>
            <div style={{flex:1}}><label style={{fontSize:9, fontWeight:900, color:'#999'}}>EXPIRA EM</label><input placeholder="dd/mm/aaaa" style={{width:'100%', padding:'15px', borderRadius:'15px', border:'1px solid #ddd'}} value={expiresAt} onChange={e => setExpiresAt(maskDate(e.target.value))} /></div>
            <div style={{width:80}}><label style={{fontSize:9, fontWeight:900, color:'#999'}}>LIMITE</label><input type="number" style={{width:'100%', padding:'15px', borderRadius:'15px', border:'1px solid #ddd'}} value={maxSales} onChange={e => setMaxSales(e.target.value)} /></div>
          </div>
          <input placeholder="Sua Chave Pix" required style={{padding:'15px', borderRadius:'15px', border:'1px solid #ddd'}} value={pixKey} onChange={e => setPixKey(e.target.value)} />
          <button type="submit" disabled={loading} style={{ padding: '18px', backgroundColor: '#059669', color: 'white', borderRadius: '50px', border: 'none', fontWeight: '900', cursor: 'pointer' }}>{loading ? 'SALVANDO...' : 'SALVAR CAMPANHA 🚀'}</button>
        </form>
      </div>
    </div>
  );
}

export default function NovaCampanha() { return ( <Suspense fallback={<div>Carregando...</div>}><NovaCampanhaContent /></Suspense> ); }