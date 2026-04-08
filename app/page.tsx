'use client'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useRouter } from 'next/navigation'

export default function PortalCondominio() {
  const [phone, setPhone] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [view, setView] = useState<'phone' | 'login' | 'signup'>('phone')
  const [formData, setFormData] = useState({ full_name: '', unit: '', password: '' })
  const [savedProfile, setSavedProfile] = useState<any>(null)
  const [myCampaigns, setMyCampaigns] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    async function checkSession() {
      const savedPhone = localStorage.getItem('user_phone');
      const savedId = localStorage.getItem('user_id');
      if (savedPhone && savedId) {
        const { data } = await supabase.from('profiles').select('*').eq('id', savedId).maybeSingle();
        if (data) { setSavedProfile(data); setPhone(savedPhone); setIsLoggedIn(true); fetchUserActivity(savedId); }
      }
    }
    checkSession();
  }, []);

  const fetchUserActivity = async (userId: string) => {
    const { data } = await supabase.from('campaigns').select('*, orders(status, receipt_url)').eq('creator_id', userId).order('created_at', { ascending: false });
    setMyCampaigns(data || []);
  }

  const handleShare = (camp: any) => {
    const url = `${window.location.origin}/c/${camp.id}`;
    const texto = encodeURIComponent(`🥧 *${camp.title.toUpperCase()}*\n\n${camp.description.substring(0, 100)}...\n\n👇 *FAÇA SEU PEDIDO:* \n${url}`);
    window.open(`https://api.whatsapp.com/send?text=${texto}`, '_blank');
  };

  const handleStatus = async (id: string, status: string) => {
    if(!confirm("Alterar status?")) return;
    await supabase.from('campaigns').update({ status }).eq('id', id);
    window.location.reload();
  };

  const formatPhone = (v: string) => v.replace(/\D/g, "").replace(/^(\d{2})(\d)/g, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").substring(0, 15);

  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '900', fontStyle: 'italic' }}>CompraZap⚡</h1>
        <div style={{ width: '100%', maxWidth: '300px', marginTop: '40px' }}>
          {view === 'phone' && (
            <><input type="tel" placeholder="(00) 00000-0000" style={{ width: '100%', padding: '15px', borderRadius: '15px', border: '1px solid #ddd', textAlign: 'center', fontSize: '20px' }} value={phone} onChange={e => setPhone(formatPhone(e.target.value))}/>
            <button onClick={async () => {
              const { data } = await supabase.from('profiles').select('*').eq('phone', phone).maybeSingle();
              if (data) { setSavedProfile(data); setView('login'); } else setView('signup');
            }} style={{ width: '100%', padding: '15px', backgroundColor: '#059669', color: 'white', borderRadius: '50px', border: 'none', fontWeight: '900', marginTop: 10 }}>ENTRAR</button></>
          )}
          {view === 'login' && (
            <form onSubmit={async (e) => { e.preventDefault(); if (savedProfile?.password === formData.password) { localStorage.setItem('user_phone', phone); localStorage.setItem('user_id', savedProfile.id); setIsLoggedIn(true); fetchUserActivity(savedProfile.id); } else alert("Senha incorreta"); }}>
              <input type="password" placeholder="Sua Senha" required style={{ width: '100%', padding: '15px', borderRadius: '15px', border: '1px solid #ddd', textAlign: 'center' }} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}/>
              <button type="submit" style={{ width: '100%', padding: '15px', backgroundColor: '#059669', color: 'white', borderRadius: '50px', border: 'none', fontWeight: '900' }}>CONFIRMAR</button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafaf9', padding: '12px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '450px', margin: '0 auto' }}>
        <header style={{ backgroundColor: 'white', padding: '15px', borderRadius: '18px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <div><h2 style={{ margin: 0, fontWeight: '900', fontSize: '16px' }}>Olá, {savedProfile?.full_name?.split(' ')[0]}!</h2><p style={{ margin: 0, fontSize: '8px', fontWeight: 'bold' }}>UNIDADE {savedProfile?.unit}</p></div>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{ fontSize: '8px', fontWeight: '900', color: '#ef4444', border: 'none', background: 'none' }}>SAIR</button>
        </header>

        <section>
          <h3 style={{fontSize: '10px', fontWeight: 900, color: '#a8a29e', marginBottom: '10px'}}>MINHAS OFERTAS</h3>
          <button onClick={() => router.push('/campanha/nova')} style={{ width: '100%', padding: '12px', backgroundColor: '#059669', color: 'white', borderRadius: '50px', border: 'none', fontWeight: '900', marginBottom: '15px' }}>+ NOVA OFERTA</button>
          {myCampaigns.map(camp => {
            const isExpired = camp.status === 'expired' || (camp.expires_at && new Date(camp.expires_at) < new Date());
            const pending = camp.orders?.filter((o:any) => o.status === 'pending' && o.receipt_url).length || 0;
            return (
              <div key={camp.id} style={{ backgroundColor: 'white', padding: '12px', borderRadius: '18px', border: '1px solid #f5f5f4', marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', overflow: 'hidden' }}>{camp.image_url && <img src={camp.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
                  <div style={{flex: 1}}><p style={{ margin: 0, fontWeight: '900', fontSize: '14px' }}>{camp.title}</p><p style={{ margin: 0, fontSize: '7px', fontWeight: 900, color: isExpired ? 'red' : 'green' }}>{isExpired ? 'ENCERRADA' : 'ATIVA 🟢'}</p></div>
                  <button onClick={() => handleShare(camp)} style={{ border: 'none', background: '#059669', color: 'white', padding: '8px 12px', borderRadius: '10px', fontWeight: 900, fontSize: '10px' }}>DIVULGAR 📢</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: '10px 0', textAlign: 'center', borderTop: '1px solid #fafafa', marginTop: 10 }}>
                  <div><p style={{ margin: 0, fontWeight: '900', fontSize: '11px' }}>{camp.views || 0}</p><p style={{ margin: 0, fontSize: '6px', color: '#a8a29e' }}>VIEWS</p></div>
                  <div><p style={{ margin: 0, fontWeight: '900', fontSize: '11px' }}>{camp.orders?.length || 0}</p><p style={{ margin: 0, fontSize: '6px', color: '#a8a29e' }}>PEDIDOS</p></div>
                  <div><p style={{ margin: 0, fontWeight: '900', fontSize: '11px', color: 'green' }}>{camp.orders?.filter((o:any)=>o.status==='paid').length || 0}</p><p style={{ margin: 0, fontSize: '6px', color: '#a8a29e' }}>PAGOS</p></div>
                </div>
                {pending > 0 && <div style={{backgroundColor:'#f59e0b', color:'white', fontSize:'8px', padding:'6px', borderRadius:'10px', textAlign:'center', fontWeight:900, marginBottom:10}}>🔔 {pending} AGUARDANDO VALIDAÇÃO PIX</div>}
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={() => router.push(`/campanha/gestao/${camp.id}`)} style={{ flex: 2, backgroundColor: '#0c0a09', color: 'white', padding: '10px', borderRadius: '10px', fontSize: '9px', fontWeight: '900' }}>GERENCIAR VENDAS</button>
                  <button onClick={() => router.push(`/campanha/nova?id=${camp.id}`)} style={{ flex: 1, border: '1px solid #ddd', padding: '10px', borderRadius: '10px', fontSize: '9px', fontWeight: '900' }}>EDITAR</button>
                  {isExpired ? <button onClick={() => handleStatus(camp.id, 'active')} style={{ flex: 1, backgroundColor:'green', color:'white', borderRadius:'10px', border:'none', fontSize:'9px', fontWeight:900 }}>REABRIR</button> : <button onClick={() => handleStatus(camp.id, 'expired')} style={{ flex: 1, backgroundColor:'#fef2f2', color:'red', borderRadius:'10px', border:'none', fontSize:'9px', fontWeight:900 }}>PARAR</button>}
                </div>
              </div>
            )
          })}
        </section>
      </div>
    </div>
  )
}