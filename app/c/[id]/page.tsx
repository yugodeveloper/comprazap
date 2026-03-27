'use client'

import { supabase } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'

export default function LandingPageGourmetFinal() {
  const params = useParams()
  const id = params?.id as string
  
  const [campaign, setCampaign] = useState<any>(null)
  const [product, setProduct] = useState<any>(null)
  const [seller, setSeller] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [orderStatus, setOrderStatus] = useState<string>('pending')
  
  const [step, setStep] = useState<'identificacao' | 'reserva' | 'checkout'>('identificacao')
  const [contact, setContact] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [buyerApto, setBuyerApto] = useState('')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [uploading, setUploading] = useState(false)
  const [currentReceipt, setCurrentReceipt] = useState<string | null>(null)

  // --- 1. VIEWS ÚNICAS E RECUPERAÇÃO ---
  useEffect(() => {
    if (!id) return;

    const handleViewAndOrder = async () => {
      try {
        // Lógica de Views Únicas (Blindada)
        const viewKey = `viewed_${id}`;
        if (!localStorage.getItem(viewKey)) {
          // Usamos try/catch aqui para não travar a página se o RPC falhar
          await supabase.rpc('increment_campaign_views', { row_id: id }).then(({error}) => {
            if (!error) localStorage.setItem(viewKey, 'true');
          });
        }

        // Recuperar Pedido em Aberto
        const savedOrderId = localStorage.getItem(`order_${id}`);
        if (savedOrderId) {
          setOrderId(savedOrderId);
          setStep('checkout');
          const { data } = await supabase.from('orders').select('*').eq('id', savedOrderId).single();
          if (data) {
            setOrderStatus(data.status);
            if (data.status === 'paid') setCurrentReceipt('confirmed');
            else if (data.receipt_url) setCurrentReceipt(data.receipt_url);
            if (data.buyer_name) setBuyerName(data.buyer_name);
          }
        }
      } catch (e) {
        console.error("Erro silencioso no carregamento inicial:", e);
      }
    };
    
    handleViewAndOrder();
  }, [id]);

  // --- 2. CARREGAMENTO DOS DADOS DA CAMPANHA ---
  useEffect(() => {
    if (!id) return
    const fetchData = async () => {
      try {
        const { data: cp, error: errCp } = await supabase.from('campaigns').select('*').eq('id', id).single()
        if (errCp || !cp) {
           console.error("Campanha não encontrada");
           return;
        }
        setCampaign(cp)
        
        const { data: pd } = await supabase.from('products').select('*').eq('campaign_id', id).single()
        setProduct(pd)
        
        const { data: sl } = await supabase.from('profiles').select('*').eq('id', cp.creator_id).single()
        setSeller(sl)
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
      } finally {
        setLoading(false) // Garante que o loading encerre SEMPRE
      }
    }
    fetchData()
  }, [id])

  // --- RESTANTE DO CÓDIGO (Telegram, Realtime, JSX) ---
  // [Manter as funções enviarNotificacaoTelegram, handleOrder e handleFileUpload que já validamos]

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="font-black uppercase text-[10px] tracking-[0.3em] text-slate-400 animate-pulse">Lanai Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 pb-20">
       {/* [Seu JSX da LP com a correção da mensagem de rejeição que fizemos antes] */}
       <div className="mx-auto max-w-md bg-white min-h-screen shadow-2xl overflow-hidden">
          <div className="relative w-full aspect-video bg-slate-200 overflow-hidden">
            {campaign?.image_url && <img src={campaign.image_url} className="w-full h-full object-cover" alt="" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <h1 className="absolute bottom-6 left-6 right-6 text-3xl font-black text-white italic tracking-tighter">{campaign?.title}</h1>
          </div>
          
          <div className="p-8 space-y-10">
            {/* ... lógica dos steps (Identificação, Reserva, Checkout) ... */}
            {/* Lembre-se de usar: orderStatus === 'rejected' para a mensagem de erro personalizada */}
          </div>
       </div>
    </div>
  )
}