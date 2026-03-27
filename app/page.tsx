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
    // Busca compras
    const { data: purchases } = await supabase.from('orders').select('*, campaigns(title)').eq('buyer_contact', userPhone);
    
    // Busca campanhas com contagem de ordens vinculadas
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*, orders(status, receipt_url)')
      .eq('creator_id', userId)
      .order('expires_at', { ascending: false });

    setMyPurchases(purchases || [])
    setMyCampaigns(campaigns || [])
    setLoading(false)
  }

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setView('phone');
    setSavedProfile(null);
  };

  const handleEndCampaign = async (campId: string) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('campaigns')
      .update({ expires_at: now, status: 'expired' })
      .eq('id', campId);

    if (!error) {
      // Atualiza o estado local para refletir a mudança
      setMyCampaigns(myCampaigns.map(c => c.id === campId ? { ...c, expires_at: now, status: 'expired' } : c));
    }
  };

  // Funções de Auth e Login permanecem as mesmas...
  const formatPhone = (v: string) => { v = v.replace(/\D/g, ""); v = v.replace(/^(\d{2})(\d)/g, "($1) $2"); v = v.replace(/(\d{5})(\d)/, "$1-$2"); return v.substring(0, 15); }
  const handleCheckPhone = async () => { if (phone.length < 14) return alert("Telefone inválido"); setLoading(true); try { const { data: profile } = await supabase.from('profiles').select('*').eq('phone', phone).maybeSingle(); if (profile) { setSavedProfile(profile); setView('login'); } else { setView('signup'); } } finally { setLoading(false); } }
  const handleAuthAction = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); try { if (view === 'login') { if (savedProfile.password === formData.password) { completeLogin(savedProfile); } else { alert("Senha incorreta!"); } } else { const { data: profile, error } = await supabase.from('profiles').upsert({ id: savedProfile?.id, phone, full_name: formData.full_name, email: formData.email, unit: formData.unit, password: formData.password }).select().single(); if (error) throw error; completeLogin(profile); } } catch (error: any) { alert("Erro: " + error.message); } finally { setLoading(false); } }
  const completeLogin = (profile: any) => { localStorage.setItem('user_phone', profile.phone); localStorage.setItem('user_id', profile.id); setSavedProfile(profile); setIsLoggedIn(true); fetchUserActivity(profile.phone, profile.id); }
  const startEdit = () => { setFormData({ full_name: savedProfile.full_name, email: savedProfile.email || '', unit: savedProfile.unit || '', password: savedProfile.password }); setView('signup'); setIsLoggedIn(false); }

  if (!isLoggedIn) { /* ... Mesma tela de login ... */ return (<div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-slate-900"><h1 className="text-5xl font-black italic tracking-tighter mb-2">CompraZap⚡</h1><p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em] mb-12">Portal do Morador • Lanai</p><div className="w-full max-w-sm space-y-6">{view === 'phone' && (<div className="space-y-4 animate-in fade-in duration-500"><label className="text-[10px] font-black text-slate-400 uppercase ml-2">WhatsApp para entrar</label><input type="tel" placeholder="(00) 00000-0000" className="w-full p-6 bg-slate-50 rounded-[30px] text-2xl font-black outline-none border-2 border-transparent focus:border-slate-900 transition-all" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))}/><button onClick={handleCheckPhone} className="w-full bg-slate-900 text-white py-6 rounded-[30px] font-black text-xl shadow-2xl active:scale-95 transition-all">{loading ? 'CARREGANDO...' : 'ENTRAR'}</button></div>)}{view === 'login' && (<form onSubmit={handleAuthAction} className="space-y-4 animate-in zoom-in duration-300"><div className="text-center"><h2 className="font-black text-xl italic">Olá, {savedProfile?.full_name?.split(' ')[0]}!</h2><p className="text-[10px] text-slate-400 font-bold uppercase">Sua senha para entrar:</p></div><input type="password" placeholder="Senha" required className="w-full p-6 bg-slate-50 rounded-[30px] text-center text-2xl font-black outline-none border-2 border-transparent focus:border-slate-900" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}/><button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[30px] font-black text-xl shadow-2xl uppercase">{loading ? 'AUTENTICANDO...' : 'CONFIRMAR'}</button><button type="button" onClick={() => setView('phone')} className="w-full text-[10px] font-black text-slate-400 uppercase">Trocar número</button></form>)}{view === 'signup' && (<form onSubmit={handleAuthAction} className="space-y-3 animate-in slide-in-from-bottom-4 duration-500"><h2 className="font-black text-xl text-center italic">{savedProfile?.id ? 'Editar Perfil' : 'Criar Cadastro'}</h2><input type="text" placeholder="Nome Completo" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-slate-100" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} /><input type="email" placeholder="E-mail" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-slate-100" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /><input type="text" placeholder="Unidade (ex: Apto 402)" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-slate-100" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} /><input type="password" placeholder="Sua Senha" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-slate-100" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /><button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-[30px] font-black text-lg shadow-xl uppercase">{loading ? 'SALVANDO...' : 'SALVAR DADOS'}</button><button type="button" onClick={() => setIsLoggedIn(true)} className="w-full text-[10px] font-black text-slate-400 uppercase">Cancelar</button></form>)}</div></div>)}

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      <div className="max-w-md mx-auto space-y-10">
        
        <header className="flex justify-between items-start bg-white p-6 rounded-[32px] shadow-sm">
          <div>
            <h2 className="text-2xl font-black italic">Olá, {savedProfile?.full_name?.split(' ')[0]}!</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{savedProfile?.unit} • {phone}</p>
            <button onClick={startEdit} className="text-[10px] font-black text-blue-600 uppercase mt-2">Editar Perfil</button>
          </div>
          <button onClick={handleLogout} className="text-[10px] font-black text-red-500 uppercase bg-red-50 px-4 py-2 rounded-full">Sair</button>
        </header>

        {/* SEÇÃO MINHAS VENDAS ATUALIZADA */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-2">💰 Painel do Vendedor</h3>
          <button onClick={() => router.push('/campanha/nova')} className="w-full p-6 bg-blue-600 text-white rounded-[30px] font-black text-sm shadow-xl shadow-blue-100 mb-4 uppercase">+ Lançar Campanha</button>
          
          {myCampaigns.map(camp => {
            const isExpired = camp.expires_at ? new Date(camp.expires_at) < new Date() : false;
            const totalSales = camp.orders?.length || 0;
            const paidSales = camp.orders?.filter((o: any) => o.status === 'paid').length || 0;
            const hasReceipt = camp.orders?.filter((o: any) => o.receipt_url).length || 0;

            return (
              <div key={camp.id} className={`bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 space-y-4 ${isExpired ? 'opacity-60 grayscale' : ''}`}>
                <div className="flex gap-4">
                  {/* MINIATURA DA IMAGEM */}
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden flex-shrink-0">
                    {camp.image_url ? (
                      <img src={camp.image_url} className="w-full h-full object-cover" alt={camp.title} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">🖼️</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 truncate">{camp.title}</p>
                    <p className={`text-[9px] font-black uppercase ${isExpired ? 'text-red-500' : 'text-slate-400'}`}>
                      {isExpired ? '❌ Encerrada' : `⏳ Expira: ${new Date(camp.expires_at).toLocaleDateString('pt-BR')}`}
                    </p>
                  </div>
                </div>

                {/* MÉTRICAS (ITEM 1) */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-50">
                  <div className="text-center">
                    <p className="text-lg font-black">{camp.views || 0}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Visitas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-blue-600">{totalSales}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Pedidos</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-green-600">{paidSales}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Pagos ({hasReceipt} 📄)</p>
                  </div>
                </div>

                {/* BOTÕES DE AÇÃO (ITEM 2) */}
                <div className="flex gap-2">
                  <button onClick={() => router.push(`/campanha/gestao/${camp.id}`)} className="flex-1 text-[10px] font-black uppercase py-3 bg-slate-900 text-white rounded-xl">Gerenciar</button>
                  {!isExpired && (
                    <button onClick={() => handleEndCampaign(camp.id)} className="px-4 text-[10px] font-black uppercase py-3 bg-red-50 text-red-500 rounded-xl">Encerrar</button>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  )
}