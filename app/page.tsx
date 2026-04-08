'use client'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useRouter } from 'next/navigation'

export default function PortalCondominio() {
  const [phone, setPhone] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'phone' | 'login' | 'signup'>('phone')
  const [savedProfile, setSavedProfile] = useState<any>(null)
  const [myPurchases, setMyPurchases] = useState<any[]>([])
  const [myCampaigns, setMyCampaigns] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    async function checkSession() {
      const savedPhone = localStorage.getItem('user_phone');
      const savedId = localStorage.getItem('user_id');
      if (savedPhone && savedId) {
        const { data } = await supabase.from('profiles').select('*').eq('id', savedId).maybeSingle();
        if (data) { setSavedProfile(data); setPhone(savedPhone); setIsLoggedIn(true); fetchUserActivity(savedPhone, savedId); }
      }
    }
    checkSession();
  }, []);

  const fetchUserActivity = async (userPhone: string, userId: string) => {
    const { data: campaigns } = await supabase.from('campaigns').select('*, orders(status, receipt_url)').eq('creator_id', userId).order('created_at', { ascending: false });
    setMyCampaigns(campaigns || []);
    const { data: purchases } = await supabase.from('orders').select('*, campaigns(title, profiles(full_name))').eq('buyer_contact', userPhone).order('created_at', { ascending: false });
    setMyPurchases(purchases || []);
  }

  const handleShare = (camp: any) => {
    const url = `${window.location.origin}/c/${camp.id}`;
    const texto = encodeURIComponent(`🥧 *${camp.title.toUpperCase()}*\n\n${camp.description}\n\n👇 *FAÇA SEU PEDIDO:* \n${url}`);
    window.open(`https://api.whatsapp.com/send?text=${texto}`, '_blank');
  };

  const formatPhone = (v: string) => v.replace(/\D/g, "").replace(/^(\d{2})(\d)/g, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").substring(0, 15);

  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px', fontFamily: 'sans-serif' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '900', fontStyle: 'italic', margin: '0' }}>CompraZap⚡</h1>
        <div style={{ width: '100%', maxWidth: '300px', marginTop: '40px' }}>
          <input type="tel" placeholder="(00) 00000-0000" style={{ width: '100%', padding: '15px', borderRadius: '15px', border: '1px solid #ddd', textAlign: 'center', fontSize: '20px' }} value={phone} onChange={e => setPhone(formatPhone(e.target.value))}/>
          <button onClick={async () => {
            const { data } = await supabase.from('profiles').select('*').eq('phone', phone).maybeSingle();
            if (data) { setSavedProfile(data); setView('login'); } else setView('signup');
          }} style={{ width: '100%', padding: '15px', backgroundColor: '#059669', color: 'white', borderRadius: '50px', border: 'none', fontWeight: '900', marginTop: 10 }}>ENTRAR</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafaf9', padding: '12px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '450px', margin: '0 auto' }}>
        <header style={{ backgroundColor: 'white', padding: '15px', borderRadius: '18px', marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><h2 style={{ margin: 0, fontWeight: '900', fontSize: '16px' }}>Olá, {savedProfile?.full_name?.split(' ')[0]}!</h2><p style={{ margin: 0, fontSize: '8px', color: '#a8a29e' }}>Unidade {savedProfile?.unit}</p></div>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{ fontSize: '8px', fontWeight: '900', color: '#ef4444', border: 'none', background: 'none' }}>SAIR</button>
        </header>
        <button onClick={() => router.push('/campanha/nova')} style={{ width: '100%', padding: '12px', backgroundColor: '#059669', color: 'white', borderRadius: '50px', border: 'none', fontWeight: '900', marginBottom: '15px' }}>+ NOVA CAMPANHA</button>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {myCampaigns.map(camp => (
            <div key={camp.id} style={{ backgroundColor: 'white', padding: '10px', borderRadius: '18px', border: '1px solid #f5f5f4' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', overflow: 'hidden' }}>{camp.image_url && <img src={camp.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
                <p style={{ flex: 1, margin: 0, fontWeight: '900', fontSize: '13px' }}>{camp.title}</p>
                <button onClick={() => handleShare(camp)} style={{ border: 'none', background: '#059669', color: 'white', padding: '8px 12px', borderRadius: '8px', fontWeight: 900, fontSize: '10px' }}>DIVULGAR 📢</button>
              </div>
              <div style={{ display: 'flex', gap: '4px', marginTop: '10px' }}>
                <button onClick={() => router.push(`/campanha/gestao/${camp.id}`)} style={{ flex: 2, backgroundColor: '#0c0a09', color: 'white', padding: '8px', borderRadius: '8px', fontSize: '8px', fontWeight: '900' }}>GERENCIAR</button>
                <button onClick={() => router.push(`/campanha/nova?id=${camp.id}`)} style={{ flex: 1, border: '1px solid #ddd', padding: '8px', borderRadius: '8px', fontSize: '8px', fontWeight: '900' }}>EDITAR ✏️</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}