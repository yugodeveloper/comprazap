'use client'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useRouter } from 'next/navigation'

export default function PortalCondominio() {
  const [phone, setPhone] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'phone' | 'login' | 'signup'>('phone')
  
  const [formData, setFormData] = useState({ full_name: '', email: '', unit: '', password: '' })
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
    alert("Texto de divulgação copiado! ✅\n\nDica: Ao colar no WhatsApp, aguarde 2 segundos para carregar a imagem do card.");
  };

  // ... (Funções Auxiliares handleEndCampaign, handleReactivate, handleAuthAction mantidas iguais)

  if (!isLoggedIn) { /* ... Bloco de Login omitido para brevidade, manter o original ... */ return null; }

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      <div className="max-w-md mx-auto space-y-10">
        
        <header className="flex justify-between items-start bg-white p-6 rounded-[32px] shadow-sm">
          <div>
            <h2 className="text-2xl font-black italic">Olá, {savedProfile?.full_name?.split(' ')[0]}!</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{savedProfile?.unit}</p>
          </div>
          <button onClick={() => { localStorage.clear(); setIsLoggedIn(false); }} className="text-[10px] font-black text-red-500 uppercase bg-red-50 px-4 py-2 rounded-full">Sair</button>
        </header>

        <section className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-2">💰 Minhas Campanhas</h3>
          <button onClick={() => router.push('/campanha/nova')} className="w-full p-6 bg-blue-600 text-white rounded-[30px] font-black text-sm shadow-xl shadow-blue-100 mb-6 uppercase">+ Nova Campanha</button>
          
          <div className="space-y-4">
          {myCampaigns.map(camp => {
            const isExpired = camp.expires_at ? new Date(camp.expires_at) < new Date() : false;
            return (
              <div key={camp.id} className="bg-white p-5 rounded-[32px] shadow-sm border border-slate-100 space-y-4">
                <div className="flex gap-3 items-center">
                  {/* MINIATURA FORÇADA - 48px FIXO */}
                  <div style={{ width: '48px', height: '48px', minWidth: '48px' }} className="bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                    {camp.image_url ? (
                      <img src={camp.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 text-sm truncate">{camp.title}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Expira: {new Date(camp.expires_at).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => handleShare(camp)} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-200 transition-all">
                    📢
                  </button>
                </div>
                {/* ... (Grid de métricas Visitas/Pedidos/Pagos mantido igual) ... */}
                <div className="flex gap-2">
                  <button onClick={() => router.push(`/campanha/gestao/${camp.id}`)} className="flex-1 text-[10px] font-black uppercase py-3 bg-slate-900 text-white rounded-xl">Gerenciar</button>
                </div>
              </div>
            );
          })}
          </div>
        </section>
      </div>
    </div>
  )
}