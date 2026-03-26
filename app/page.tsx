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

  const formatPhone = (v: string) => {
    v = v.replace(/\D/g, "")
    v = v.replace(/^(\d{2})(\d)/g, "($1) $2")
    v = v.replace(/(\d{5})(\d)/, "$1-$2")
    return v.substring(0, 15)
  }

  const handleCheckPhone = async () => {
    if (phone.length < 14) return alert("Telefone inválido");
    setLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('phone', phone).maybeSingle();
      if (profile) {
        setSavedProfile(profile);
        setView('login');
      } else {
        setView('signup');
      }
    } finally { setLoading(false); }
  }

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (view === 'login') {
        if (savedProfile.password === formData.password) {
          completeLogin(savedProfile);
        } else {
          alert("Senha incorreta!");
        }
      } else {
        // CADASTRO OU EDIÇÃO (UPSERT)
        const { data: profile, error } = await supabase.from('profiles').upsert({ 
          id: savedProfile?.id, // Se tiver ID, ele atualiza (Edição)
          phone, 
          full_name: formData.full_name,
          email: formData.email,
          unit: formData.unit,
          password: formData.password 
        }).select().single();

        if (error) throw error;
        completeLogin(profile);
      }
    } catch (error: any) {
      alert("Erro: " + error.message);
    } finally { setLoading(false); }
  }

  const completeLogin = (profile: any) => {
    localStorage.setItem('user_phone', profile.phone);
    localStorage.setItem('user_id', profile.id);
    setSavedProfile(profile);
    setIsLoggedIn(true);
    fetchUserActivity(profile.phone, profile.id);
  }

  const fetchUserActivity = async (userPhone: string, userId: string) => {
    const { data: purchases } = await supabase.from('orders').select('*, campaigns(title)').eq('buyer_contact', userPhone);
    const { data: campaigns } = await supabase.from('campaigns').select('*').eq('creator_id', userId);
    setMyPurchases(purchases || [])
    setMyCampaigns(campaigns || [])
    setLoading(false)
  }

  // Preenche o formulário ao clicar em "Editar Perfil"
  const startEdit = () => {
    setFormData({
      full_name: savedProfile.full_name,
      email: savedProfile.email || '',
      unit: savedProfile.unit || '',
      password: savedProfile.password
    });
    setView('signup');
    setIsLoggedIn(false); // Volta para a tela de formulário
  }

  if (!isLoggedIn) {
    // [O código das telas de Login/Signup permanece igual ao anterior, 
    // apenas garantindo que o handleAuthAction acima suporte o Upsert]
    // ... (mesmo retorno de login/signup do passo anterior) ...
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      <div className="max-w-md mx-auto space-y-10">
        
        {/* HEADER ATUALIZADO (ITEM 1) */}
        <header className="flex justify-between items-start bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
          <div>
            <h2 className="text-2xl font-black italic text-slate-900 leading-tight">
              Olá, {savedProfile?.full_name?.split(' ')[0] || 'Vizinho'}!
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {phone} • {savedProfile?.unit || 'Unidade não informada'}
            </p>
            <button 
              onClick={startEdit}
              className="text-[10px] font-black text-blue-600 uppercase border-b border-blue-100 mt-2"
            >
              Editar Dados / Senha
            </button>
          </div>
          <button 
            onClick={() => { localStorage.clear(); setIsLoggedIn(false); setView('phone'); }} 
            className="text-[10px] font-black text-red-500 uppercase bg-red-50 px-4 py-2 rounded-full active:scale-90 transition-all"
          >
            Sair
          </button>
        </header>

        {/* SEÇÃO DE COMPRAS */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-2">🛒 Minhas Compras</h3>
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
                <button onClick={() => router.push(`/c/${order.campaign_id}`)} className="p-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase">Ver / Pagar</button>
              </div>
            ))
          )}
        </section>

        {/* SEÇÃO DE VENDAS */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-2">💰 Minhas Vendas</h3>
          
          {/* CORREÇÃO DO LINK (ITEM 2) */}
          <button 
            onClick={() => router.push('/campanha/nova')} 
            className="w-full p-6 bg-blue-600 text-white rounded-[30px] font-black text-sm shadow-xl shadow-blue-100 mb-4 uppercase hover:bg-blue-700 active:scale-95 transition-all"
          >
            + Lançar Nova Oferta
          </button>
          
          {myCampaigns.length === 0 ? (
            <div className="p-8 bg-white rounded-[32px] text-center text-slate-300 text-xs font-bold border-2 border-dashed">Você ainda não vende nada</div>
          ) : (
            myCampaigns.map(camp => (
              <div key={camp.id} className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 flex justify-between items-center">
                  <p className="font-black text-slate-800">{camp.title}</p>
                  <button 
                    onClick={() => router.push('/gestao')} // Ajustado para a página de gestão que já temos
                    className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-3 py-2 rounded-lg"
                  >
                    Gerenciar
                  </button>
              </div>
            ))
          )}
        </section>

      </div>
    </div>
  )
}