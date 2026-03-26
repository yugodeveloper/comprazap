'use client'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useRouter } from 'next/navigation'

export default function PortalCondominio() {
  const [phone, setPhone] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(false)
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

  const handleLogin = async () => {
  if (phone.length < 14) return alert("Telefone inválido");
  setLoading(true);
  
  try {
    // Busca o perfil
    let { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', phone)
      .maybeSingle(); // maybeSingle é mais seguro que single() aqui

    if (!profile) {
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({ phone, full_name: 'Vizinho' })
        .select()
        .single();
      
      if (insertError) throw insertError;
      profile = newProfile;
    }

    localStorage.setItem('user_phone', phone);
    localStorage.setItem('user_id', profile.id);
    setIsLoggedIn(true);
    fetchUserActivity(phone, profile.id);

  } catch (error: any) {
    console.error(error);
    alert("Erro ao entrar: " + error.message);
  } finally {
    setLoading(false);
  }
}

  const fetchUserActivity = async (userPhone: string, userId: string) => {
    // Buscar compras feitas
    const { data: purchases } = await supabase
      .from('orders')
      .select('*, campaigns(title)')
      .eq('buyer_contact', userPhone)
    
    // Buscar campanhas criadas (vendas)
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('creator_id', userId)

    setMyPurchases(purchases || [])
    setMyCampaigns(campaigns || [])
    setLoading(false)
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-slate-900">
        <h1 className="text-5xl font-black italic tracking-tighter mb-2">CompraZap⚡</h1>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em] mb-12">Portal do Morador • Lanai</p>
        
        <div className="w-full max-w-sm space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">WhatsApp para entrar</label>
            <input 
              type="tel" placeholder="(00) 00000-0000"
              className="w-full p-6 bg-slate-50 rounded-[30px] text-2xl font-black outline-none border-2 border-transparent focus:border-slate-900 transition-all"
              value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))}
            />
          </div>
          <button 
            onClick={handleLogin}
            className="w-full bg-slate-900 text-white py-6 rounded-[30px] font-black text-xl shadow-2xl active:scale-95 transition-all"
          >
            {loading ? 'CARREGANDO...' : 'ENTRAR'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      <div className="max-w-md mx-auto space-y-10">
        
        <header className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-black italic">Olá, Vizinho!</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{phone}</p>
          </div>
          <button onClick={() => { localStorage.clear(); setIsLoggedIn(false); }} className="text-[10px] font-black text-red-500 uppercase border-b-2 border-red-100">Sair</button>
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