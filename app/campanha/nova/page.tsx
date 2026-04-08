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

      // SALVAMENTO GARANTIDO
      await supabase.from('products').delete().eq('campaign_id', campId);
      await supabase.from('products').insert({ campaign_id: campId, name: title, price: formattedVars[0]?.price || 0, variations: formattedVars });

      alert("Salvo com sucesso! 🚀"); router.push('/');
    } catch (err: any) { alert("Erro: " + err.message); } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '450px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '900' }}>{editId ? 'Editar' : 'Nova'} Campanha ⚡</h1>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <label style={{ flex: 1, height: '80px', border: '2px dashed #ddd', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
              <input type="file" hidden onChange={e => handleUpload(e, 'header')} />
              {headerImg ? <img src={headerImg} style={{width:'100%', height:'100%', objectFit:'cover'}} /> : 'Página 🖼️'}
            </label>
            <label style={{ flex: 1, height: '80px', border: '2px dashed #059669', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
              <input type="file" hidden onChange={e => handleUpload(e, 'share')} />
              {shareImg ? <img src={shareImg} style={{width:'100%', height:'100%', objectFit:'contain'}} /> : 'WhatsApp 📸'}
            </label>
          </div>
          <input placeholder="Título" required style={{padding:'15px', borderRadius:'10px', border:'1px solid #ddd'}} value={title} onChange={e => setTitle(e.target.value)} />
          <textarea placeholder="Descrição" required style={{padding:'15px', borderRadius:'10px', border:'1px solid #ddd', height:'100px'}} value={description} onChange={e => setDescription(e.target.value)} />
          
          <div style={{ background: '#fff', padding: '15px', borderRadius: '15px', border: '1px solid #eee' }}>
            <p style={{fontSize:'10px', fontWeight:900, color:'#999', marginBottom:'10px'}}>ITENS E PREÇOS</p>
            {variations.map((v, i) => (
              <div key={i} style={{display:'flex', gap:5, marginBottom:5}}>
                <input placeholder="Nome" style={{flex:2, padding:'8px', borderRadius:'5px', border:'1px solid #ddd'}} value={v.name} onChange={e => { const n = [...variations]; n[i].name = e.target.value; setVariations(n); }} />
                <input placeholder="R$" style={{flex:1, padding:'8px', borderRadius:'5px', border:'1px solid #ddd'}} value={v.price} onChange={e => { const n = [...variations]; n[i].price = e.target.value; setVariations(n); }} />
              </div>
            ))}
            <button type="button" onClick={() => setVariations([...variations, {name:'', price:''}])} style={{width:'100%', padding:'5px', border:'none', background:'#f5f5f5', borderRadius:'5px', fontSize:'10px', fontWeight:900}}>+ ADICIONAR ITEM</button>
          </div>
          
          <div style={{display:'flex', gap:10}}>
            <input placeholder="dd/mm/aaaa" style={{flex:1, padding:'15px', borderRadius:'10px', border:'1px solid #ddd'}} value={expiresAt} onChange={e => setExpiresAt(maskDate(e.target.value))} />
            <input placeholder="Qtd" type="number" style={{width:'80px', padding:'15px', borderRadius:'10px', border:'1px solid #ddd'}} value={maxSales} onChange={e => setMaxSales(e.target.value)} />
          </div>
          <input placeholder="Chave Pix" required style={{padding:'15px', borderRadius:'10px', border:'1px solid #ddd'}} value={pixKey} onChange={e => setPixKey(e.target.value)} />
          <button type="submit" disabled={loading} style={{ padding: '18px', backgroundColor: '#059669', color: 'white', borderRadius: '50px', border: 'none', fontWeight: '900' }}>{loading ? 'SALVANDO...' : 'SALVAR 🚀'}</button>
        </form>
      </div>
    </div>
  );
}

export default function NovaCampanha() { return ( <Suspense fallback={<div>Carregando...</div>}><NovaCampanhaContent /></Suspense> ); }