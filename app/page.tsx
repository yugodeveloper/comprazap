'use client'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useRouter } from 'next/navigation'

export default function PortalCondominio() {
  const [phone, setPhone] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'phone' | 'login' | 'signup'>('phone')
  
  const [formData, setFormData] = useState({ 
    full_name: '', 
    email: '', 
    unit: '', 
    password: '' 
  })
  const [savedProfile, setSavedProfile] = useState<any>(null)
  const [myPurchases, setMyPurchases] = useState<any[]>([])
  const [myCampaigns, setMyCampaigns] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const savedPhone = localStorage.getItem('user_phone');
    const savedId = localStorage.getItem('user_id');
    if (savedPhone && savedId) {
      setPhone(savedPhone);
      setLoading(true);
      supabase.from('profiles').select('*').eq('id', savedId).single().then(({ data }) => {
        if (data) {
          setSavedProfile(data);
          setIsLoggedIn(true);
          fetchUserActivity(savedPhone, savedId);
        } else {
          localStorage.clear();
        }
        setLoading(false);
      });
    }
  }, []);

  const fetchUserActivity = async (userPhone: string, userId: string) => {
    const { data: purchases } = await supabase.from('orders').select('*, campaigns(title)').eq('buyer_contact', userPhone);
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*, orders(status, receipt_url)')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false });

    setMyPurchases(purchases || [])
    setMyCampaigns(campaigns || [])
    setLoading(false)
  }

  const handleShare = (camp: any) => {
    const url = `${window.location.origin}/c/${camp.id}`;
    const texto = `🛍️ *NOVIDADE NO LANAI!*\n\n*${camp.title}*\n\nConfira os detalhes e faça sua reserva pelo link abaixo:\n👉 ${url}`;
    navigator.clipboard.writeText(texto);
    alert("Link copiado! ✅");
  };

  const handleEndCampaign = async (campId: string) => {
    if(!confirm("Encerrar esta campanha agora?")) return;
    const now = new Date().toISOString();
    await supabase.from('campaigns').update({ expires_at: now, status: 'expired' }).eq('id', campId);
    setMyCampaigns(myCampaigns.map(c => c.id === campId ? { ...c, expires_at: now, status: 'expired' } : c));
  };

  const handleReactivate = async (campId: string) => {
    const novaData = new Date();
    novaData.setDate(novaData.getDate() + 7);
    const expiresAt = novaData.toISOString();
    await supabase.from('campaigns').update({ expires_at: expiresAt, status: 'active' }).eq('id', campId);
    setMyCampaigns(myCampaigns.map(c => c.id === campId ? { ...c, expires_at: expiresAt, status: 'active' } : c));
  };

  const formatPhone = (v: string) => { v = v.replace(/\D/g, ""); v = v.replace(/^(\d{2})(\d)/g, "($1) $2"); v = v.replace(/(\d{5})(\d)/, "$1-$2"); return v.substring(0, 15); }
  
  const handleCheckPhone = async () => { 
    if (phone.length < 14) return alert("Telefone inválido"); 
    setLoading(true); 
    try { 
      const { data: profile } = await supabase.from('profiles').select('*').eq('phone', phone).maybeSingle(); 
      if (profile) { setSavedProfile(profile); setView('login'); } 
      else { setView('signup'); } 
    } finally { setLoading(false); } 
  }

  const handleAuthAction = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    setLoading(true); 
    try { 
      if (view === 'login') { 
        if (savedProfile.password === formData.password) { 
            localStorage.setItem('user_phone', savedProfile.phone); 
            localStorage.setItem('user_id', savedProfile.id); 
            setIsLoggedIn(true); 
            fetchUserActivity(savedProfile.phone, savedProfile.id);
        } else { alert("Senha incorreta!"); } 
      } else { 
        const { data: profile, error } = await supabase.from('profiles').upsert({ phone, ...formData }).select().single(); 
        if (error) throw error; 
        localStorage.setItem('user_phone', profile.phone); 
        localStorage.setItem('user_id', profile.id); 
        setIsLoggedIn(true); fetchUserActivity(profile.phone, profile.id);
      } 
    } catch (error: any) { alert(error.message); } 
    finally { setLoading(false); } 
  }

  // --- ESTILOS FIXOS ---
  const inputStyle: React.CSSProperties = { width: '100%', padding: '15px', backgroundColor: '#f5f5f4', borderRadius: '15px', border: '1px solid #e7e5e4', outline: 'none', textAlign: 'center', fontWeight: 'bold', boxSizing: 'border-box', marginBottom: '10px' };
  const btnEmerald: React.CSSProperties = { width: '100%', padding: '15px', backgroundColor: '#059669', color: 'white', borderRadius: '50px', border: 'none', fontWeight: '900', fontSize: '13px', letterSpacing: '1px', cursor: 'pointer' };

  if (!isLoggedIn) { 
      return (
      <div style={{ minHeight: '100vh', backgroundColor: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '900', fontStyle: 'italic', margin: '0', color: '#0c0a09' }}>CompraZap⚡</h1>
        <p style={{ fontSize: '9px', fontWeight: 'bold', color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '40px' }}>Portal Lanai</p>
        <div style={{ width: '100%', maxWidth: '300px' }}>
          {view === 'phone' && (
            <>
              <input type="tel" placeholder="(00) 00000-0000" style={{ ...inputStyle, fontSize: '20px' }} value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))}/>
              <button onClick={handleCheckPhone} style={btnEmerald}>{loading ? '...' : 'ENTRAR'}</button>
            </>
          )}
          {view === 'login' && (
            <form onSubmit={handleAuthAction}>
              <p style={{ textAlign: 'center', fontWeight: '900', fontSize: '14px', marginBottom: '15px' }}>Olá, {savedProfile?.full_name?.split(' ')[0]}!</p>
              <input type="password" placeholder="Sua Senha" required style={inputStyle} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}/>
              <button type="submit" style={btnEmerald}>CONFIRMAR</button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafaf9', padding: '15px', fontFamily: 'sans-serif', color: '#1c1917' }}>
      <div style={{ maxWidth: '450px', margin: '0 auto' }}>
        
        <header style={{ backgroundColor: 'white', padding: '15px 20px', borderRadius: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: '900', fontStyle: 'italic', fontSize: '18px' }}>Olá, {savedProfile?.full_name?.split(' ')[0]}!</h2>
            <p style={{ margin: 0, fontSize: '9px', fontWeight: 'bold', color: '#a8a29e', textTransform: 'uppercase' }}>{savedProfile?.unit}</p>
          </div>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{ fontSize: '9px', fontWeight: '900', color: '#ef4444', backgroundColor: '#fef2f2', border: 'none', padding: '8px 12px', borderRadius: '50px', cursor: 'pointer' }}>SAIR</button>
        </header>

        <section>
          <button onClick={() => router.push('/campanha/nova')} style={{ ...btnEmerald, marginBottom: '20px', backgroundColor: '#059669' }}>+ NOVA OFERTA</button>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {myCampaigns.map(camp => {
              const isExpired = camp.expires_at ? new Date(camp.expires_at) < new Date() : false;
              return (
                <div key={camp.id} style={{ backgroundColor: 'white', padding: '12px', borderRadius: '20px', border: '1px solid #f5f5f4', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#f5f5f4', overflow: 'hidden', flexShrink: 0 }}>
                      {camp.image_url && <img src={camp.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: '900', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{camp.title}</p>
                      <p style={{ margin: 0, fontSize: '8px', fontWeight: '900', color: isExpired ? '#ef4444' : '#059669', textTransform: 'uppercase' }}>{isExpired ? 'Encerrada' : 'Ativa 🟢'}</p>
                    </div>
                    <button onClick={() => handleShare(camp)} style={{ border: 'none', background: '#f5f5f4', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>📢</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: '8px 0', borderTop: '1px solid #fafafa', borderBottom: '1px solid #fafafa', textAlign: 'center' }}>
                    <div><p style={{ margin: 0, fontWeight: '900', fontSize: '12px' }}>{camp.views || 0}</p><p style={{ margin: 0, fontSize: '7px', color: '#a8a29e' }}>VIEWS</p></div>
                    <div><p style={{ margin: 0, fontWeight: '900', fontSize: '12px', color: '#059669' }}>{camp.orders?.length || 0}</p><p style={{ margin: 0, fontSize: '7px', color: '#a8a29e' }}>PEDIDOS</p></div>
                    <div><p style={{ margin: 0, fontWeight: '900', fontSize: '12px' }}>{camp.orders?.filter((o:any)=>o.status==='paid').length || 0}</p><p style={{ margin: 0, fontSize: '7px', color: '#a8a29e' }}>PAGOS</p></div>
                  </div>

                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => router.push(`/campanha/gestao/${camp.id}`)} style={{ flex: 2, border: 'none', backgroundColor: '#0c0a09', color: 'white', padding: '10px', borderRadius: '10px', fontSize: '9px', fontWeight: '900', cursor: 'pointer' }}>GERENCIAR</button>
                    {isExpired ? (
                      <button onClick={() => handleReactivate(camp.id)} style={{ flex: 1, border: 'none', backgroundColor: '#059669', color: 'white', padding: '10px', borderRadius: '10px', fontSize: '9px', fontWeight: '900', cursor: 'pointer' }}>REABRIR</button>
                    ) : (
                      <button onClick={() => handleEndCampaign(camp.id)} style={{ flex: 1, border: 'none', backgroundColor: '#fef2f2', color: '#ef4444', padding: '10px', borderRadius: '10px', fontSize: '9px', fontWeight: '900', cursor: 'pointer' }}>ENCERRAR</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <footer style={{ textAlign: 'center', paddingTop: '30px', paddingBottom: '30px' }}>
          <p style={{ fontSize: '8px', fontWeight: '900', color: '#d6d3d1', letterSpacing: '4px' }}>COMPRAZAP⚡LANAI</p>
        </footer>
      </div>
    </div>
  )
}