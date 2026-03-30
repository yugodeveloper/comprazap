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
    alert("Texto de divulgação copiado! ✅\n\nNo WhatsApp, aguarde 2 segundos antes de enviar para carregar a foto do card.");
  };

  const handleEndCampaign = async (campId: string) => {
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
        if (savedProfile.password === formData.password) { completeLogin(savedProfile); } 
        else { alert("Senha incorreta!"); } 
      } else { 
        const { data: profile, error } = await supabase.from('profiles').upsert({ 
          id: savedProfile?.id, 
          phone, 
          full_name: formData.full_name, 
          email: formData.email, 
          unit: formData.unit, 
          password: formData.password 
        }).select().single(); 
        if (error) throw error; 
        completeLogin(profile); 
      } 
    } catch (error: any) { alert("Erro: " + error.message); } 
    finally { setLoading(false); } 
  }

  const completeLogin = (profile: any) => { 
    localStorage.setItem('user_phone', profile.phone); 
    localStorage.setItem('user_id', profile.id); 
    setSavedProfile(profile); 
    setIsLoggedIn(true); 
    fetchUserActivity(profile.phone, profile.id); 
  }

  const handleLogout = () => { localStorage.clear(); setIsLoggedIn(false); setView('phone'); setSavedProfile(null); };
  const startEdit = () => { setFormData({ full_name: savedProfile.full_name, email: savedProfile.email || '', unit: savedProfile.unit || '', password: savedProfile.password }); setView('signup'); setIsLoggedIn(false); }

  // Estilos de Input unificados para evitar "vazamentos" de layout
  const inputBaseStyle = "w-full p-5 bg-stone-50 rounded-[20px] font-bold border border-stone-100 outline-none focus:border-emerald-500 transition-all text-center placeholder:text-stone-300";

  if (!isLoggedIn) { 
      return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-stone-900">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black italic tracking-tighter text-stone-950 mb-2">CompraZap⚡</h1>
          <p className="text-stone-400 font-bold text-[10px] uppercase tracking-[0.3em]">Portal do Morador • Lanai</p>
        </div>

        <div className="w-full max-w-sm space-y-6">
          {view === 'phone' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-4">Seu WhatsApp</label>
              <input type="tel" placeholder="(00) 00000-0000" className={inputBaseStyle + " text-2xl"} value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))}/>
              <button onClick={handleCheckPhone} className="w-full bg-emerald-600 text-white py-6 rounded-full font-black text-lg shadow-xl shadow-emerald-100 active:scale-95 transition-all uppercase tracking-widest">
                {loading ? 'CARREGANDO...' : 'ENTRAR'}
              </button>
            </div>
          )}

          {view === 'login' && (
            <form onSubmit={handleAuthAction} className="space-y-6 animate-in zoom-in duration-300">
              <div className="text-center">
                <h2 className="font-black text-2xl italic text-stone-950">Olá, {savedProfile?.full_name?.split(' ')[0]}!</h2>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Digite sua senha de acesso</p>
              </div>
              <input type="password" placeholder="Senha" required className={inputBaseStyle + " text-2xl"} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}/>
              <button type="submit" className="w-full bg-emerald-600 text-white py-6 rounded-full font-black text-lg shadow-xl shadow-emerald-100 uppercase tracking-widest">
                {loading ? '...' : 'CONFIRMAR'}
              </button>
              <button type="button" onClick={() => setView('phone')} className="w-full text-[10px] font-black text-stone-400 uppercase tracking-widest">Mudar de conta</button>
            </form>
          )}

          {view === 'signup' && (
            <form onSubmit={handleAuthAction} className="space-y-3 animate-in slide-in-from-bottom-8 duration-500">
              <div className="text-center mb-4">
                <h2 className="font-black text-xl italic text-stone-950">Criar Perfil</h2>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Cadastre seus dados do condomínio</p>
              </div>
              <input type="text" placeholder="Nome Completo" required className={inputBaseStyle} value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
              <input type="email" placeholder="E-mail" required className={inputBaseStyle} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              <input type="text" placeholder="Unidade (ex: Apto 402)" required className={inputBaseStyle} value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
              <input type="password" placeholder="Crie uma Senha" required className={inputBaseStyle} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              <button type="submit" className="w-full bg-emerald-600 text-white py-6 rounded-full font-black text-lg shadow-xl shadow-emerald-100 uppercase tracking-widest mt-4">
                {loading ? '...' : 'SALVAR E ENTRAR'}
              </button>
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 p-4 sm:p-6 font-sans text-stone-900">
      <div className="max-w-md mx-auto space-y-8">
        
        {/* HEADER GOURMET */}
        <header className="bg-white p-6 rounded-[32px] shadow-sm border border-stone-100 relative overflow-hidden">
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-black italic text-stone-950">Olá, {savedProfile?.full_name?.split(' ')[0]}!</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{savedProfile?.unit} • {phone}</p>
              </div>
              <button onClick={startEdit} className="text-[10px] font-black text-emerald-600 uppercase mt-4 hover:underline">Editar Perfil</button>
            </div>
            <button onClick={handleLogout} className="text-[10px] font-black text-red-500 uppercase bg-red-50 px-4 py-2 rounded-full active:scale-95 transition-all">Sair</button>
          </div>
        </header>

        {/* ÁREA DE VENDAS */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-4">
            <h3 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Sua Gestão de Vendas</h3>
          </div>
          
          <button onClick={() => router.push('/campanha/nova')} className="w-full p-6 bg-emerald-600 text-white rounded-full font-black text-sm shadow-xl shadow-emerald-100 mb-6 uppercase tracking-widest active:scale-95 transition-all">
            + LANÇAR NOVA OFERTA
          </button>
          
          <div className="space-y-4">
          {myCampaigns.length === 0 && (
            <div className="text-center py-10 bg-white rounded-[32px] border-2 border-dashed border-stone-200">
              <p className="text-stone-300 font-bold text-xs uppercase">Nenhuma oferta ativa no momento</p>
            </div>
          )}

          {myCampaigns.map(camp => {
            const isExpired = camp.expires_at ? new Date(camp.expires_at) < new Date() : false;
            const totalSales = camp.orders?.length || 0;
            const paidSales = camp.orders?.filter((o: any) => o.status === 'paid').length || 0;

            return (
              <div key={camp.id} className={`bg-white p-5 rounded-[32px] shadow-sm border border-stone-100 space-y-4 transition-all hover:shadow-md ${isExpired ? 'opacity-70' : ''}`}>
                <div className="flex gap-4 items-center">
                  {/* MINIATURA FORÇADA */}
                  <div style={{ width: '60px', height: '60px', minWidth: '60px' }} className="bg-stone-50 rounded-2xl overflow-hidden flex-shrink-0 border border-stone-100">
                    {camp.image_url ? (
                      <img src={camp.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-stone-950 text-base truncate leading-tight italic">{camp.title}</p>
                    <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${isExpired ? 'text-red-500' : 'text-emerald-600'}`}>
                      {isExpired ? '✕ Campanha Encerrada' : `⏳ Expira: ${new Date(camp.expires_at).toLocaleDateString('pt-BR')}`}
                    </p>
                  </div>

                  <button onClick={() => handleShare(camp)} className="h-10 w-10 flex items-center justify-center bg-stone-50 text-stone-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all">
                    📢
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 py-4 border-y border-stone-50">
                  <div className="text-center border-r border-stone-50">
                    <p className="text-sm font-black text-stone-950">{camp.views || 0}</p>
                    <p className="text-[8px] font-black text-stone-400 uppercase tracking-tighter">Visitas</p>
                  </div>
                  <div className="text-center border-r border-stone-50">
                    <p className="text-sm font-black text-stone-950">{totalSales}</p>
                    <p className="text-[8px] font-black text-stone-400 uppercase tracking-tighter">Pedidos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-emerald-600">{paidSales}</p>
                    <p className="text-[8px] font-black text-stone-400 uppercase tracking-tighter">Pagos</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => router.push(`/campanha/gestao/${camp.id}`)} className="flex-1 text-[10px] font-black uppercase py-4 bg-stone-950 text-white rounded-2xl active:scale-95 transition-all">
                    Gerenciar Vendas
                  </button>
                  {isExpired ? (
                    <button onClick={() => handleReactivate(camp.id)} className="px-6 text-[10px] font-black uppercase py-4 bg-emerald-600 text-white rounded-2xl active:scale-95 transition-all">
                      Reativar 🔄
                    </button>
                  ) : (
                    <button onClick={() => handleEndCampaign(camp.id)} className="px-4 text-[10px] font-black uppercase py-4 bg-red-50 text-red-500 rounded-2xl active:scale-95 transition-all">
                      Pausar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </section>

        {/* RODAPÉ E INSTITUCIONAL */}
        <footer className="text-center space-y-4 pb-10 pt-4">
          <p className="text-[10px] font-black text-stone-300 uppercase tracking-[0.4em]">CompraZap⚡ Lanai</p>
        </footer>
      </div>
    </div>
  )
}