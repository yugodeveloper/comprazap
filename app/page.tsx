'use client'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useRouter } from 'next/navigation'

export default function PortalCondominio() {
  const [phone, setPhone] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'phone' | 'login' | 'signup'>('phone')
  
  // Campos de Cadastro/Login
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

  // Máscara de Telefone (xx) xxxxx-xxxx
  const formatPhone = (v: string) => {
    v = v.replace(/\D/g, "")
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2")
    v = v.replace(/(\d{5})(\d)/, "$1-$2")
    return v.substring(0, 15)
  }

  // 1. VERIFICA SE O TELEFONE JÁ EXISTE
  const handleCheckPhone = async () => {
    if (phone.length < 14) return alert("Telefone inválido");
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', phone)
        .maybeSingle();

      if (profile) {
        setSavedProfile(profile);
        setView('login'); // Usuário antigo -> pede senha
      } else {
        setView('signup'); // Usuário novo -> cadastro completo
      }
    } catch (err) {
      alert("Erro ao verificar telefone");
    } finally {
      setLoading(false);
    }
  }

  // 2. EXECUTA LOGIN OU CADASTRO FINAL
  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (view === 'login') {
        // Validação de Senha
        if (savedProfile.password === formData.password) {
          completeLogin(savedProfile);
        } else {
          alert("Senha incorreta!");
          setLoading(false);
        }
      } else {
        // Cadastro de Novo Usuário
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({ 
            phone, 
            full_name: formData.full_name,
            email: formData.email,
            unit: formData.unit,
            password: formData.password 
          })
          .select()
          .single();

        if (insertError) throw insertError;
        completeLogin(newProfile);
      }
    } catch (error: any) {
      alert("Erro no processo: " + error.message);
      setLoading(false);
    }
  }

  const completeLogin = (profile: any) => {
    localStorage.setItem('user_phone', profile.phone);
    localStorage.setItem('user_id', profile.id);
    setIsLoggedIn(true);
    fetchUserActivity(profile.phone, profile.id);
  }

  const fetchUserActivity = async (userPhone: string, userId: string) => {
    const { data: purchases } = await supabase
      .from('orders')
      .select('*, campaigns(title)')
      .eq('buyer_contact', userPhone)
    
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('creator_id', userId)

    setMyPurchases(purchases || [])
    setMyCampaigns(campaigns || [])
    setLoading(false)
  }

  // RESET DE SENHA (MVP)
  const handleForgotPassword = () => {
    if (savedProfile?.email) {
      alert(`Lembrete: Um link de recuperação seria enviado para: ${savedProfile.email}. (Funcionalidade em breve)`);
    }
  }

  // TELA DE ENTRADA (IDENTIFICAÇÃO)
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-slate-900">
        <h1 className="text-5xl font-black italic tracking-tighter mb-2">CompraZap⚡</h1>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em] mb-12">Portal do Morador • Lanai</p>
        
        <div className="w-full max-w-sm space-y-6">
          
          {/* PASSO 1: SÓ TELEFONE */}
          {view === 'phone' && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Seu WhatsApp</label>
                <input 
                  type="tel" placeholder="(00) 00000-0000"
                  className="w-full p-6 bg-slate-50 rounded-[30px] text-2xl font-black outline-none border-2 border-transparent focus:border-slate-900 transition-all"
                  value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))}
                />
              </div>
              <button 
                onClick={handleCheckPhone}
                className="w-full bg-slate-900 text-white py-6 rounded-[30px] font-black text-xl shadow-2xl active:scale-95 transition-all"
              >
                {loading ? 'VERIFICANDO...' : 'CONTINUAR'}
              </button>
            </div>
          )}

          {/* PASSO 2: CADASTRO NOVO */}
          {view === 'signup' && (
            <form onSubmit={handleAuthAction} className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
              <h2 className="font-black text-xl text-center">Bem-vindo! Crie seu cadastro</h2>
              <input 
                type="text" placeholder="Nome Completo" required
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border border-slate-100"
                value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})}
              />
              <input 
                type="email" placeholder="E-mail" required
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border border-slate-100"
                value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
              />
              <input 
                type="text" placeholder="Unidade (ex: Apto 402)" required
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border border-slate-100"
                value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}
              />
              <input 
                type="password" placeholder="Crie uma Senha" required
                className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border border-slate-100"
                value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
              />
              <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-[30px] font-black text-lg shadow-xl uppercase">
                {loading ? 'SALVANDO...' : 'CONCLUIR CADASTRO'}
              </button>
              <button type="button" onClick={() => setView('phone')} className="w-full text-[10px] font-black text-slate-400 uppercase">Voltar</button>
            </form>
          )}

          {/* PASSO 2: LOGIN (USUÁRIO JÁ EXISTE) */}
          {view === 'login' && (
            <form onSubmit={handleAuthAction} className="space-y-4 animate-in zoom-in duration-300">
              <div className="text-center">
                <h2 className="font-black text-xl">Olá, {savedProfile?.full_name}!</h2>
                <p className="text-xs text-slate-400 font-bold uppercase">Sua senha para entrar:</p>
              </div>
              <input 
                type="password" placeholder="Sua Senha" required
                className="w-full p-6 bg-slate-50 rounded-[30px] text-center text-2xl font-black outline-none border-2 border-transparent focus:border-slate-900 transition-all"
                value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
              />
              <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[30px] font-black text-xl shadow-2xl uppercase">
                {loading ? 'AUTENTICANDO...' : 'ENTRAR'}
              </button>
              <div className="flex flex-col gap-2">
                <button type="button" onClick={handleForgotPassword} className="text-[10px] font-black text-blue-500 uppercase">Esqueci minha senha</button>
                <button type="button" onClick={() => setView('phone')} className="text-[10px] font-black text-slate-400 uppercase">Não sou eu (Trocar número)</button>
              </div>
            </form>
          )}
        </div>
      </div>
    )
  }

  // TELA PRINCIPAL (LOGADO)
  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      <div className="max-w-md mx-auto space-y-10">
        
        <header className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black italic">Olá, Vizinho!</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{phone}</p>
          </div>
          <button onClick={() => { localStorage.clear(); setIsLoggedIn(false); setView('phone'); }} className="text-[10px] font-black text-red-500 uppercase border-b-2 border-red-100">Sair</button>
        </header>

        {/* SEÇÃO DE COMPRAS */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            🛒 Minhas Compras
          </h3>
          {myPurchases.length === 0 ? (
            <div className="p-8 bg-white rounded-[32px] text-center text-slate-300 text-xs font-bold border-2 border-dashed">Nenhuma compra ainda</div>
          ) : (
            myPurchases.map(order => (
              <div key={order.id} className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 flex justify-between items-center">
                <div>
                  <p className="font-black text-slate-800">{order.campaigns?.title}</p>
                  <p className={`text-[10px] font-black uppercase ${order.status === 'paid' ? 'text-green-500' : 'text-orange-500'}`}>
                    {order.status === 'paid' ? '✅ Pago' : '⏳ Pendente'}
                  </p>
                </div>
                <button onClick={() => router.push(`/c/${order.campaign_id}`)} className="p-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Ver</button>
              </div>
            ))
          )}
        </section>

        {/* SEÇÃO DE VENDAS */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
            💰 Minhas Vendas
          </h3>
          <button onClick={() => router.push('/nova-campanha')} className="w-full p-6 bg-blue-600 text-white rounded-[24px] font-black text-sm shadow-lg shadow-blue-100 mb-4 uppercase">
            + Lançar Nova Oferta
          </button>
          
          {myCampaigns.map(camp => (
            <div key={camp.id} className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100">
               <div className="flex justify-between items-center">
                  <p className="font-black text-slate-800">{camp.title}</p>
                  <button onClick={() => router.push(`/dashboard/${camp.id}`)} className="text-[10px] font-black text-blue-600 uppercase">Gerenciar Pedidos</button>
               </div>
            </div>
          ))}
        </section>

      </div>
    </div>
  )
}