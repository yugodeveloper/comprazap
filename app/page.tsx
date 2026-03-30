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
    const now = new Date().toISOString();
    await supabase.from('campaigns').update({ expires_at: now, status: 'expired' }).eq('id', campId);
    setMyCampaigns(myCampaigns.map(c => c.id === campId ? { ...c, expires_at: now, status: 'expired' } : c));
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

  // --- ESTILOS FIXOS (BLINDAGEM ANTI-CACHE) ---
  const inputStyle: React.CSSProperties = { width: '100%', padding: '20px', backgroundColor: '#f5f5f4', borderRadius: '20px', border: '1px solid #e7e5e4', outline: 'none', textAlign: 'center', fontWeight: 'bold', boxSizing: 'border-box', marginBottom: '15px' };
  const btnEmerald: React.CSSProperties = { width: '100%', padding: '20px', backgroundColor: '#059669', color: 'white', borderRadius: '50px', border: 'none', fontWeight: '900', fontSize: '14px', letterSpacing: '2px', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(5, 150, 105, 0.3)' };

  if (!isLoggedIn) { 
      return (
      <div style={{ minHeight: '100vh', backgroundColor: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px', fontFamily: 'sans-serif' }}>
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h1 style={{ fontSize: '48px', fontWeight: '900', fontStyle: 'italic', margin: '0', color: '#0c0a09', letterSpacing: '-2px' }}>CompraZap⚡</h1>
          <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '4px', marginTop: '5px' }}>Portal do Morador • Lanai</p>
        </div>

        <div style={{ width: '100%', maxWidth: '350px' }}>
          {view === 'phone' && (
            <div style={{ animation: 'fadein 0.5s' }}>
              <input type="tel" placeholder="(00) 00000-0000" style={{ ...inputStyle, fontSize: '24px' }} value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))}/>
              <button onClick={handleCheckPhone} style={btnEmerald}>{loading ? '...' : 'ENTRAR'}</button>
            </div>
          )}

          {view === 'login' && (
            <form onSubmit={handleAuthAction}>
              <h2 style={{ textAlign: 'center', fontWeight: '900', fontStyle: 'italic', marginBottom: '20px' }}>Olá, {savedProfile?.full_name?.split(' ')[0]}!</h2>
              <input type="password" placeholder="Sua Senha" required style={{ ...inputStyle, fontSize: '20px' }} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}/>
              <button type="submit" style={btnEmerald}>CONFIRMAR</button>
            </form>
          )}

          {view === 'signup' && (
            <form onSubmit={handleAuthAction}>
              <h2 style={{ textAlign: 'center', fontWeight: '900', fontStyle: 'italic', marginBottom: '20px' }}>Criar Perfil</h2>
              <input placeholder="Nome Completo" required style={inputStyle} value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
              <input placeholder="Unidade (Apto)" required style={inputStyle} value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
              <input type="password" placeholder="Sua Senha" required style={inputStyle} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              <button type="submit" style={btnEmerald}>CADASTRAR</button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafaf9', padding: '20px', fontFamily: 'sans-serif', color: '#1c1917' }}>
      <div style={{ maxWidth: '450px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <header style={{ backgroundColor: 'white', padding: '25px', borderRadius: '30px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: '900', fontStyle: 'italic', fontSize: '22px' }}>Olá, {savedProfile?.full_name?.split(' ')[0]}!</h2>
            <p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', color: '#a8a29e', textTransform: 'uppercase' }}>{savedProfile?.unit} • {phone}</p>
          </div>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{ fontSize: '10px', fontWeight: '900', color: '#ef4444', backgroundColor: '#fef2f2', border: 'none', padding: '10px 15px', borderRadius: '50px', cursor: 'pointer' }}>SAIR</button>
        </header>

        {/* VENDAS */}
        <section style={{ marginBottom: '40px' }}>
          <h3 style={{ fontSize: '10px', fontWeight: '900', color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '2px', paddingLeft: '15px', marginBottom: '15px' }}>💰 Suas Vendas</h3>
          <button onClick={() => router.push('/campanha/nova')} style={{ ...btnEmerald, marginBottom: '20px' }}>+ LANÇAR OFERTA</button>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {myCampaigns.map(camp => {
              const isExpired = camp.expires_at ? new Date(camp.expires_at) < new Date() : false;
              return (
                <div key={camp.id} style={{ backgroundColor: 'white', padding: '20px', borderRadius: '30px', border: '1px solid #f5f5f4', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{ width: '55px', height: '55px', borderRadius: '15px', backgroundColor: '#f5f5f4', overflow: 'hidden' }}>
                      {camp.image_url && <img src={camp.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: '900', fontStyle: 'italic', fontSize: '16px' }}>{camp.title}</p>
                      <p style={{ margin: 0, fontSize: '9px', fontWeight: '900', color: isExpired ? '#ef4444' : '#059669', textTransform: 'uppercase' }}>{isExpired ? 'Encerrada' : 'Ativa 🟢'}</p>
                    </div>
                    <button onClick={() => handleShare(camp)} style={{ border: 'none', background: '#f5f5f4', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}>📢</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: '15px 0', borderTop: '1px solid #f5f5f4', borderBottom: '1px solid #f5f5f4', textAlign: 'center' }}>
                    <div><p style={{ margin: 0, fontWeight: '900' }}>{camp.views || 0}</p><p style={{ margin: 0, fontSize: '8px', color: '#a8a29e' }}>VISITAS</p></div>
                    <div><p style={{ margin: 0, fontWeight: '900', color: '#059669' }}>{camp.orders?.length || 0}</p><p style={{ margin: 0, fontSize: '8px', color: '#a8a29e' }}>PEDIDOS</p></div>
                    <div><p style={{ margin: 0, fontWeight: '900' }}>{camp.orders?.filter((o:any)=>o.status==='paid').length || 0}</p><p style={{ margin: 0, fontSize: '8px', color: '#a8a29e' }}>PAGOS</p></div>
                  </div>

                  <button onClick={() => router.push(`/campanha/gestao/${camp.id}`)} style={{ ...btnEmerald, padding: '15px', backgroundColor: '#0c0a09' }}>GERENCIAR VENDAS</button>
                </div>
              );
            })}
          </div>
        </section>

        <footer style={{ textAlign: 'center', paddingTop: '20px', paddingBottom: '40px' }}>
          <p style={{ fontSize: '10px', fontWeight: '900', color: '#d6d3d1', letterSpacing: '5px' }}>COMPRAZAP⚡LANAI</p>
        </footer>
      </div>
    </div>
  )
}