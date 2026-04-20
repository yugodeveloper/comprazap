'use client'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useRouter } from 'next/navigation'

export default function PortalCondominio() {
  const [phone, setPhone] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'phone' | 'login' | 'signup'>('phone')
  const [configError, setConfigError] = useState<string | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  
  const [formData, setFormData] = useState({ 
    full_name: '', 
    email: '', 
    unit: '', 
    password: '',
    telegram_id: ''
  })
  const [savedProfile, setSavedProfile] = useState<any>(null)
  const [myPurchases, setMyPurchases] = useState<any[]>([])
  const [myCampaigns, setMyCampaigns] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      setConfigError("Erro de Configuração: Chaves do Supabase não encontradas.");
      return;
    }

    async function checkSession() {
      const savedPhone = localStorage.getItem('user_phone');
      const savedId = localStorage.getItem('user_id');
      
      if (savedPhone && savedId) {
        setPhone(savedPhone);
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', savedId)
            .maybeSingle();

          if (data && !error) {
            setSavedProfile(data);
            setFormData(prev => ({
              ...prev,
              full_name: data.full_name || '',
              unit: data.unit || '',
              telegram_id: data.telegram_id || ''
            }));
            setIsLoggedIn(true);
            fetchUserActivity(savedPhone, savedId);
          } else {
            localStorage.clear();
          }
        } catch (err) {
          console.error("Erro na sessão:", err);
        } finally {
          setLoading(false);
        }
      }
    }
    checkSession();
  }, []);

  const fetchUserActivity = async (userPhone: string, userId: string) => {
    try {
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('*, orders(status, receipt_url)')
        .eq('creator_id', userId)
        .order('created_at', { ascending: false });

      setMyCampaigns(campaigns || []);

      const { data: purchases } = await supabase
        .from('orders')
        .select('*, campaigns(title, profiles(full_name))')
        .eq('buyer_contact', userPhone)
        .order('created_at', { ascending: false });

      setMyPurchases(purchases || []);

    } catch (err) {
      console.error("Erro ao carregar atividades:", err);
    }
  }

  const handleShare = (camp: any) => {
    const isExpired = camp.expires_at ? new Date(camp.expires_at) < new Date() : false;
    if (isExpired) return;

    const url = `${window.location.origin}/c/${camp.id}`;
    const texto = `🛍️ *NOVIDADE NO LANAI!*\n\n*${camp.title}*\n\nConfira os detalhes e faça sua reserva pelo link abaixo:\n👉 ${url}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(texto).then(() => {
        alert("Link copiado! ✅ Envie agora no seu grupo do WhatsApp.");
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
      });
    }
  };

  const handleEndCampaign = async (campId: string) => {
    if(!confirm("Encerrar esta campanha agora?")) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const expiresAt = yesterday.toISOString();
    setLoading(true);
    const { error } = await supabase.from('campaigns').update({ expires_at: expiresAt, status: 'expired' }).eq('id', campId);
    if (error) alert("Erro: " + error.message);
    else {
      setMyCampaigns(myCampaigns.map(c => c.id === campId ? { ...c, expires_at: expiresAt, status: 'expired' } : c));
    }
    setLoading(false);
  };

  const handleReactivate = async (campId: string) => {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    setLoading(true);
    const { error } = await supabase.from('campaigns').update({ expires_at: expiresAt, status: 'active' }).eq('id', campId);
    if (error) alert("Erro: " + error.message);
    else {
      setMyCampaigns(myCampaigns.map(c => c.id === campId ? { ...c, expires_at: expiresAt, status: 'active' } : c));
    }
    setLoading(false);
  };

  const formatPhone = (v: string) => { 
    v = v.replace(/\D/g, ""); 
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2"); 
    v = v.replace(/(\d{5})(\d)/, "$1-$2"); 
    return v.substring(0, 15); 
  }
  
  const handleCheckPhone = async () => { 
    if (phone.length < 14) return alert("Telefone inválido"); 
    setLoading(true); 
    try { 
      const { data: profile, error } = await supabase.from('profiles').select('*').eq('phone', phone).maybeSingle(); 
      if (error) throw error;
      if (profile) { setSavedProfile(profile); setView('login'); } 
      else { setView('signup'); } 
    } catch (error: any) { alert("Erro: " + error.message); } 
    finally { setLoading(false); } 
  }

  const handleAuthAction = async (e: React.FormEvent) => { 
    e.preventDefault(); 
    setLoading(true); 
    try { 
      if (view === 'login') { 
        if (savedProfile && savedProfile.password === formData.password) { 
            localStorage.setItem('user_phone', savedProfile.phone); 
            localStorage.setItem('user_id', savedProfile.id); 
            setIsLoggedIn(true); 
            setFormData(prev => ({
              ...prev,
              full_name: savedProfile.full_name || '',
              unit: savedProfile.unit || '',
              telegram_id: savedProfile.telegram_id || ''
            }));
            fetchUserActivity(savedProfile.phone, savedProfile.id);
        } else { alert("Senha incorreta!"); } 
      } else { 
        const { data: profile, error } = await supabase.from('profiles').upsert({ phone, ...formData }).select().maybeSingle(); 
        if (error) throw error; 
        if (!profile) throw new Error("Erro ao criar perfil.");
        localStorage.setItem('user_phone', profile.phone); 
        localStorage.setItem('user_id', profile.id); 
        setIsLoggedIn(true); 
        fetchUserActivity(profile.phone, profile.id);
      } 
    } catch (error: any) { alert("Erro: " + error.message); } 
    finally { setLoading(false); } 
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: formData.full_name, 
          unit: formData.unit, 
          telegram_id: formData.telegram_id 
        })
        .eq('id', savedProfile.id);
      if (error) throw error;
      setSavedProfile({ ...savedProfile, ...formData });
      setIsEditingProfile(false);
      alert("Perfil atualizado! ✅");
    } catch (error: any) { alert("Erro: " + error.message); }
    finally { setLoading(false); }
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '15px', backgroundColor: '#f5f5f4', borderRadius: '15px', border: '1px solid #e7e5e4', outline: 'none', textAlign: 'center', fontWeight: 'bold', boxSizing: 'border-box', marginBottom: '10px' };
  const btnEmerald: React.CSSProperties = { width: '100%', padding: '15px', backgroundColor: '#059669', color: 'white', borderRadius: '50px', border: 'none', fontWeight: '900', fontSize: '13px', letterSpacing: '1px', cursor: 'pointer' };
  const recoveryStyle: React.CSSProperties = { display: 'block', textAlign: 'center', marginTop: '15px', fontSize: '12px', color: '#a8a29e', textDecoration: 'underline', cursor: 'pointer', fontWeight: '600' };

  if (configError) return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}><h1>ERRO DE CONFIGURAÇÃO</h1><p>{configError}</p></div>

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
              <a href={`https://wa.me/5548991694249?text=Olá Gustavo! Esqueci minha senha do CompraZap. Meu telefone é ${phone}`} target="_blank" rel="noreferrer" style={recoveryStyle}>Esqueci minha senha</a>
            </>
          )}
          {view === 'login' && (
            <form onSubmit={handleAuthAction}>
              <p style={{ textAlign: 'center', fontWeight: '900', fontSize: '14px', marginBottom: '15px' }}>Olá, {savedProfile?.full_name?.split(' ')[0] || 'Vizinho'}!</p>
              <input type="password" placeholder="Sua Senha" required style={inputStyle} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}/>
              <button type="submit" style={btnEmerald}>CONFIRMAR</button>
              <a href={`https://wa.me/5548991694249?text=Olá Gustavo! Esqueci minha senha do CompraZap. Meu telefone é ${phone}`} target="_blank" rel="noreferrer" style={recoveryStyle}>Esqueci minha senha</a>
            </form>
          )}
          {view === 'signup' && (
            <form onSubmit={handleAuthAction}>
              <input placeholder="Nome Completo" required style={inputStyle} value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
              <input placeholder="Unidade (Apto)" required style={inputStyle} value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
              <input placeholder="ID Telegram (p/ avisos)" style={inputStyle} value={formData.telegram_id} onChange={e => setFormData({...formData, telegram_id: e.target.value})} />
              <p style={{ fontSize: '9px', color: '#a8a29e', marginBottom: '10px', textAlign: 'center', fontWeight: 'bold' }}>Obtenha seu ID enviando /id para o @userinfobot no Telegram</p>
              <input type="password" placeholder="Sua Senha" required style={inputStyle} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              <button type="submit" style={btnEmerald}>CADASTRAR</button>
            </form>
          )}
        </div>
      </div>
    )
  }

  // ORDENAÇÃO: Ativas primeiro
  const sortedCampaigns = [...myCampaigns].sort((a, b) => {
    const aExpired = a.expires_at ? new Date(a.expires_at) < new Date() : false;
    const bExpired = b.expires_at ? new Date(b.expires_at) < new Date() : false;
    if (aExpired && !bExpired) return 1;
    if (!aExpired && bExpired) return -1;
    return 0;
  });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafaf9', padding: '12px', fontFamily: 'sans-serif', color: '#1c1917' }}>
      <div style={{ maxWidth: '450px', margin: '0 auto' }}>
        <header style={{ backgroundColor: 'white', padding: '12px 18px', borderRadius: '18px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontWeight: '900', fontStyle: 'italic', fontSize: '16px' }}>Olá, {savedProfile?.full_name?.split(' ')[0] || 'Vizinho'}!</h2>
            <p style={{ margin: 0, fontSize: '8px', fontWeight: 'bold', color: '#a8a29e', textTransform: 'uppercase' }}>Unidade {savedProfile?.unit}</p>
          </div>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={() => setIsEditingProfile(!isEditingProfile)} style={{ fontSize: '8px', fontWeight: '900', color: '#059669', backgroundColor: '#ecfdf5', border: 'none', padding: '6px 10px', borderRadius: '50px', cursor: 'pointer' }}>
              {isEditingProfile ? 'CANCELAR' : 'PERFIL ⚙️'}
            </button>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{ fontSize: '8px', fontWeight: '900', color: '#ef4444', backgroundColor: '#fef2f2', border: 'none', padding: '6px 10px', borderRadius: '50px', cursor: 'pointer' }}>SAIR</button>
          </div>
        </header>

        {isEditingProfile && (
          <section style={{ backgroundColor: 'white', padding: '20px', borderRadius: '18px', marginBottom: '15px', border: '1px solid #e7e5e4' }}>
            <h3 style={{ fontSize: '10px', fontWeight: 900, color: '#a8a29e', marginBottom: '15px', textTransform: 'uppercase' }}>Editar Perfil</h3>
            <form onSubmit={handleUpdateProfile}>
              <input placeholder="Nome Completo" required style={inputStyle} value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
              <input placeholder="Unidade (Apto)" required style={inputStyle} value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
              <input placeholder="ID Telegram" style={inputStyle} value={formData.telegram_id} onChange={e => setFormData({...formData, telegram_id: e.target.value})} />
              <p style={{ fontSize: '9px', color: '#a8a29e', marginBottom: '15px', textAlign: 'center' }}>Receba avisos de vendas via @userinfobot no Telegram</p>
              <button type="submit" style={btnEmerald} disabled={loading}>{loading ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}</button>
            </form>
          </section>
        )}

        <section style={{marginBottom: '30px'}}>
          <h3 style={{fontSize: '10px', fontWeight: 900, color: '#a8a29e', marginBottom: '10px', letterSpacing: '1px'}}>MINHAS OFERTAS</h3>
          <button onClick={() => router.push('/campanha/nova')} style={{ ...btnEmerald, padding: '12px', marginBottom: '15px', backgroundColor: '#059669' }}>+ NOVA CAMPANHA</button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sortedCampaigns.map(camp => {
              const isExpired = camp.expires_at ? new Date(camp.expires_at) < new Date() : false;
              const pendingAproval = camp.orders?.filter((o:any) => o.status === 'pending' && o.receipt_url).length || 0;
              
              return (
                <div key={camp.id} style={{ 
                  // ALTERAÇÃO DE COR DE FUNDO E TEXTO PARA ENCERRADAS
                  backgroundColor: isExpired ? '#f1f5f9' : 'white', 
                  color: isExpired ? '#475569' : '#1c1917',
                  padding: '10px', 
                  borderRadius: '18px', 
                  border: isExpired ? '1px solid #e2e8f0' : '1px solid #f5f5f4', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '6px',
                  filter: isExpired ? 'grayscale(0.2)' : 'none'
                }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: isExpired ? '#cbd5e1' : '#f5f5f4', overflow: 'hidden', flexShrink: 0 }}>
                      {camp.image_url && <img src={camp.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isExpired ? 0.6 : 1 }} alt="" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: '900', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{camp.title}</p>
                      <div style={{display: 'flex', gap: '5px', alignItems: 'center'}}>
                        <p style={{ margin: 0, fontSize: '7px', fontWeight: '900', color: isExpired ? '#64748b' : '#059669', textTransform: 'uppercase' }}>{isExpired ? 'Encerrada' : 'Ativa 🟢'}</p>
                        {!isExpired && camp.expires_at && <p style={{ margin: 0, fontSize: '7px', fontWeight: '900', color: '#a8a29e', textTransform: 'uppercase' }}>| Expira em: {new Date(camp.expires_at).toLocaleDateString('pt-BR')}</p>}
                        {pendingAproval > 0 && <span style={{backgroundColor: '#f59e0b', color: 'white', fontSize: '6px', padding: '2px 4px', borderRadius: '4px', fontWeight: 900}}>🔔 {pendingAproval} AGUARDANDO PIX</span>}
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => handleShare(camp)} 
                      disabled={isExpired}
                      style={{ 
                        border: 'none', 
                        background: isExpired ? '#cbd5e1' : '#059669', 
                        color: isExpired ? '#64748b' : 'white', 
                        padding: '8px 12px', 
                        borderRadius: '8px', 
                        cursor: isExpired ? 'not-allowed' : 'pointer', 
                        fontWeight: 900, 
                        fontSize: '10px' 
                      }}
                    >
                      {isExpired ? 'ENCERRADA' : 'DIVULGAR 📢'}
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', padding: '6px 0', borderTop: isExpired ? '1px solid #e2e8f0' : '1px solid #fafafa', borderBottom: isExpired ? '1px solid #e2e8f0' : '1px solid #fafafa', textAlign: 'center' }}>
                    <div><p style={{ margin: 0, fontWeight: '900', fontSize: '11px' }}>{camp.views || 0}</p><p style={{ margin: 0, fontSize: '6px', color: isExpired ? '#94a3b8' : '#a8a29e' }}>VIEWS</p></div>
                    <div><p style={{ margin: 0, fontWeight: '900', fontSize: '11px', color: isExpired ? '#64748b' : '#059669' }}>{camp.orders?.length || 0}</p><p style={{ margin: 0, fontSize: '6px', color: isExpired ? '#94a3b8' : '#a8a29e' }}>PEDIDOS</p></div>
                    <div><p style={{ margin: 0, fontWeight: '900', fontSize: '11px' }}>{camp.orders?.filter((o:any)=>o.status==='paid').length || 0}</p><p style={{ margin: 0, fontSize: '6px', color: isExpired ? '#94a3b8' : '#a8a29e' }}>PAGOS</p></div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={() => router.push(`/campanha/gestao/${camp.id}`)} style={{ flex: 2, border: 'none', backgroundColor: isExpired ? '#475569' : '#0c0a09', color: 'white', padding: '8px', borderRadius: '8px', fontSize: '8px', fontWeight: '900', cursor: 'pointer' }}>GERENCIAR VENDAS</button>
                    <button onClick={() => router.push(`/campanha/nova?id=${camp.id}`)} style={{ flex: 1, border: '1px solid #ddd', backgroundColor: isExpired ? '#f8fafc' : 'white', color: '#444', padding: '8px', borderRadius: '8px', fontSize: '8px', fontWeight: '900', cursor: 'pointer' }}>EDITAR ✏️</button>
                    {isExpired ? (
                      <button onClick={() => handleReactivate(camp.id)} style={{ flex: 1, border: 'none', backgroundColor: '#059669', color: 'white', padding: '10px', borderRadius: '10px', fontSize: '8px', fontWeight: '900', cursor: 'pointer' }}>REABRIR</button>
                    ) : (
                      <button onClick={() => handleEndCampaign(camp.id)} style={{ flex: 1, border: 'none', backgroundColor: '#fef2f2', color: '#ef4444', padding: '8px', borderRadius: '8px', fontSize: '8px', fontWeight: '900', cursor: 'pointer' }}>ENCERRAR</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {myPurchases.length > 0 && (
          <section style={{marginBottom: '30px'}}>
             <h3 style={{fontSize: '10px', fontWeight: 900, color: '#a8a29e', marginBottom: '10px', letterSpacing: '1px'}}>MINHAS COMPRAS COM VIZINHOS</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {myPurchases.map(order => (
                  <div key={order.id} style={{ backgroundColor: 'white', padding: '12px', borderRadius: '18px', border: '1px solid #f5f5f4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: '900', fontSize: '11px' }}>{order.campaigns?.title}</p>
                      <p style={{ margin: 0, fontSize: '7px', color: '#a8a29e' }}>Vendedor: {order.campaigns?.profiles?.full_name?.split(' ')[0] || 'Vizinho'}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontWeight: '900', fontSize: '11px', color: order.status === 'paid' ? '#059669' : '#f59e0b' }}>
                        {order.status === 'paid' ? 'PAGO ✅' : 'PENDENTE ⏳'}
                      </p>
                      <p style={{ margin: 0, fontSize: '7px', color: '#a8a29e' }}>{new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
             </div>
          </section>
        )}
      </div>
    </div>
  )
}