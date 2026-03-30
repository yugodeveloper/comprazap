'use client'

import { supabase } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'

export default function LandingPageGourmetFinal() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  
  const [campaign, setCampaign] = useState<any>(null)
  const [product, setProduct] = useState<any>(null)
  const [seller, setSeller] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [orderStatus, setOrderStatus] = useState<string>('pending')

  // Controle de Fluxo
  const [step, setStep] = useState<'identificacao' | 'reserva' | 'checkout'>('identificacao')
  const [contact, setContact] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [buyerApto, setBuyerApto] = useState('')
  const [orderId, setOrderId] = useState<string | null>(null)

  // Seleções Dinâmicas
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState(1)

  // Upload
  const [uploading, setUploading] = useState(false)
  const [currentReceipt, setCurrentReceipt] = useState<string | null>(null)

  // --- 1. SESSÃO, VIEWS ÚNICAS E RECUPERAÇÃO DE PEDIDO ---
  useEffect(() => {
    if (!id) return;

    const handleViewCount = async () => {
      try {
        const viewKey = `viewed_${id}`;
        const alreadyViewed = localStorage.getItem(viewKey);
        if (!alreadyViewed) {
          await supabase.rpc('increment_campaign_views', { row_id: id });
          localStorage.setItem(viewKey, 'true');
        }
      } catch (e) {
        console.error("Erro silencioso ao contar view:", e);
      }
    };
    handleViewCount();

    const savedOrderId = localStorage.getItem(`order_${id}`);
    if (savedOrderId) {
      setOrderId(savedOrderId);
      setStep('checkout');
      const checkOrder = async () => {
        const { data } = await supabase.from('orders').select('status, receipt_url, buyer_name').eq('id', savedOrderId).single();
        if (data) {
          setOrderStatus(data.status);
          if (data.status === 'paid') setCurrentReceipt('confirmed');
          else if (data.receipt_url) setCurrentReceipt(data.receipt_url);
          if (data.buyer_name) setBuyerName(data.buyer_name);
        }
      };
      checkOrder();
    }
  }, [id]);

  // --- 2. CARREGAMENTO DOS DADOS DA CAMPANHA ---
  useEffect(() => {
    if (!id) return
    const fetchData = async () => {
      try {
        const { data: cp } = await supabase.from('campaigns').select('*').eq('id', id).single()
        if (!cp) return
        setCampaign(cp)
        
        const { data: pd } = await supabase.from('products').select('*').eq('campaign_id', id).single()
        setProduct(pd)
        
        const { data: sl } = await supabase.from('profiles').select('*').eq('id', cp.creator_id).single()
        setSeller(sl)

        if (pd?.variations) {
          const defaults: any = {}
          Object.keys(pd.variations).forEach(key => {
            if (pd.variations[key]?.length > 0) {
              defaults[key] = pd.variations[key][0]
            }
          })
          setSelectedVariations(defaults)
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  // --- 3. REALTIME STATUS DO PEDIDO ---
  useEffect(() => {
    if (!orderId) return;
    const subscription = supabase
      .channel(`status-order-${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, (payload) => {
        setOrderStatus(payload.new.status);
        if (payload.new.status === 'paid') {
          setCurrentReceipt('confirmed');
        } else if (payload.new.status === 'rejected') {
          setCurrentReceipt(null); 
        }
      }).subscribe();
    return () => { supabase.removeChannel(subscription) };
  }, [orderId]);

  // --- 4. FUNÇÕES TELEGRAM ---
  const enviarNotificacaoTelegram = async (order: any) => {
    const token = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;
    const mensagem = `💰 *NOVO PEDIDO NO COMPRAZAP!*\n--------------------------------\n📦 *Produto:* ${campaign?.title}\n👤 *Cliente:* ${order.buyer_name}\n🏠 *Apto:* ${order.buyer_apto}\n🔢 *Qtd:* ${order.quantity}x\n💵 *Total:* R$ ${(product.price * order.quantity).toFixed(2)}\n--------------------------------\n📱 *Contato:* ${order.buyer_contact}`;
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: mensagem, parse_mode: 'Markdown' })
      });
    } catch (err) { console.error("Erro Telegram:", err); }
  };

  const enviarComprovanteTelegram = async (imageUrl: string, buyer: string, oId: string) => {
    const token = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;
    await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId, photo: imageUrl,
        caption: `🧐 *VALIDAR COMPROVANTE*\n👤 Cliente: ${buyer}\n\nAceita este pagamento?`,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: "✅ Aceitar", callback_data: `confirm_${oId}` }, { text: "❌ Recusar", callback_data: `reject_${oId}` }]] }
      })
    });
  };

  // --- 5. HANDLERS (AÇÕES) ---
  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const orderData = { campaign_id: id, product_id: product?.id, buyer_contact: contact, buyer_name: buyerName, buyer_apto: buyerApto, status: 'pending', selected_variations: selectedVariations, quantity: quantity }
      const { data, error } = await supabase.from('orders').insert(orderData).select().single()
      if (error) throw error
      if (data) {
        setOrderId(data.id); localStorage.setItem(`order_${id}`, data.id); 
        setStep('checkout'); enviarNotificacaoTelegram(data);
      }
    } catch (err: any) { alert(err.message) } finally { setLoading(false) }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !orderId) return
    setUploading(true)
    const file = e.target.files[0]
    const fileName = `receipts/${orderId}-${Date.now()}`
    const { error: upErr } = await supabase.storage.from('comprovantes').upload(fileName, file)
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from('comprovantes').getPublicUrl(fileName)
      await supabase.from('orders').update({ receipt_url: publicUrl, status: 'pending' }).eq('id', orderId)
      await enviarComprovanteTelegram(publicUrl, buyerName, orderId);
      setCurrentReceipt(publicUrl)
    }
    setUploading(false)
  }

  const calculateTotal = () => (product?.price || 0) * quantity

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white font-black uppercase text-xs tracking-[0.3em] animate-pulse text-emerald-600">
       <div className="w-6 h-6 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
       Lanai Loading...
    </div>
  )

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 selection:bg-emerald-100 pb-20">
      <div className="mx-auto max-w-md bg-white min-h-screen shadow-lg overflow-hidden pb-20 rounded-b-[40px]">
        
        {/* IMAGEM TOP - 16:9 FIXO COM EFEITO GLASS */}
        <div className="relative w-full aspect-video bg-stone-100 overflow-hidden">
          {campaign?.image_url ? (
            <img 
              src={campaign.image_url} 
              alt="Capa da Campanha" 
              className="w-full h-full object-cover transition-transform duration-1000 hover:scale-105" 
            />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl bg-stone-100 text-stone-300">🖼️</div>
          )}
          
          {/* OVERLAY GLASS NO TÍTULO */}
          <div className="absolute bottom-4 left-4 right-4 bg-white/60 backdrop-blur-lg p-5 rounded-2xl border border-white/20 shadow-xl">
            <h1 className="text-2xl font-black text-stone-950 leading-tight italic tracking-tighter">{campaign?.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-stone-700 text-[10px] font-bold uppercase tracking-[0.2em]">Oferta de: {seller?.full_name}</span>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-10">
          <div className="bg-stone-50/50 p-6 rounded-3xl border border-stone-100">
            <p className="text-stone-700 text-sm font-medium leading-relaxed">{campaign?.description}</p>
          </div>

          {step === 'identificacao' && (
            <div className="space-y-6 animate-in fade-in duration-500 text-center">
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold italic tracking-tight text-stone-950">Olá, Vizinho!</h2>
                <p className="text-[11px] font-bold text-stone-500 uppercase tracking-widest">Para começar, precisamos de te identificar.</p>
              </div>
              <input 
                type="text" placeholder="WhatsApp ou E-mail" 
                className="w-full rounded-2xl bg-white p-5 text-stone-950 placeholder:text-stone-300 outline-none border border-stone-100 focus:border-emerald-300 transition-all font-medium text-center"
                value={contact} onChange={e => setContact(e.target.value)}
              />
              <button onClick={() => setStep('reserva')} className="w-full rounded-full bg-emerald-600 p-6 font-black text-white shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all uppercase text-xs tracking-[0.2em]">
                VER PRODUTO E RESERVAR
              </button>
            </div>
          )}

          {step === 'reserva' && (
            <form onSubmit={handleOrder} className="space-y-8 animate-in slide-in-from-right duration-500">
              {product?.variations && Object.keys(product.variations).map(key => (
                <div key={key} className="space-y-4">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] ml-2">{key}</label>
                  <div className="flex flex-wrap gap-3">
                    {product.variations[key].map((v: string) => (
                      <button 
                        key={v} type="button"
                        onClick={() => setSelectedVariations({...selectedVariations, [key]: v})}
                        className={`px-6 py-4 rounded-xl text-xs font-black transition-all border ${
                          selectedVariations[key] === v 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' 
                          : 'bg-white text-stone-500 border-stone-100 hover:border-stone-200'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between rounded-2xl bg-stone-50 p-5 border border-stone-100">
                <span className="font-black uppercase text-[10px] tracking-widest text-stone-600">Quantidade</span>
                <div className="flex items-center gap-6 text-emerald-700">
                  <button type="button" onClick={() => setQuantity(q => q > 1 ? q - 1 : 1)} className="h-10 w-10 rounded-full bg-white shadow font-black text-xl hover:bg-emerald-50 active:scale-90">-</button>
                  <span className="font-black text-xl w-6 text-center text-stone-950">{quantity}</span>
                  <button type="button" onClick={() => setQuantity(q => q + 1)} className="h-10 w-10 rounded-full bg-white shadow font-black text-xl hover:bg-emerald-50 active:scale-90">+</button>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-stone-100">
                <input placeholder="Seu Nome Completo" required className="w-full rounded-xl bg-white p-5 font-medium outline-none border border-stone-100 focus:border-emerald-200" value={buyerName} onChange={e => setBuyerName(e.target.value)} />
                <input placeholder="Apto / Unidade (ex: 402)" required className="w-full rounded-xl bg-white p-5 font-medium outline-none border border-stone-100 focus:border-emerald-200" value={buyerApto} onChange={e => setBuyerApto(e.target.value)} />
              </div>

              <button type="submit" className="w-full rounded-full bg-emerald-600 p-6 font-black text-white shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all uppercase text-xs tracking-[0.2em]">
                CONFIRMAR R$ {calculateTotal().toFixed(2)}
              </button>
            </form>
          )}

          {step === 'checkout' && (
            <div className="space-y-8 animate-in zoom-in duration-500">
              <div className="rounded-[32px] bg-stone-950 p-8 text-white shadow-2xl text-center border-4 border-white">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-6">Pague agora via Pix</p>
                <div className="mx-auto mb-8 inline-block rounded-2xl bg-white p-4 shadow-inner">
                  <QRCodeSVG value={campaign?.pix_key || ''} size={180} />
                </div>
                
                <div className="flex justify-between items-center px-2">
                   <span className="text-stone-400 text-[10px] font-bold uppercase tracking-tight">TOTAL A PAGAR</span>
                   <span className="text-3xl font-black italic">R$ {calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="rounded-[32px] bg-white p-8 border-2 border-dashed border-stone-200 text-center">
                {currentReceipt === 'confirmed' ? (
                   <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col items-center">
                     <span className="text-3xl mb-3">✅</span>
                     <p className="text-emerald-900 font-black text-sm uppercase tracking-widest">PAGAMENTO CONFIRMADO!</p>
                     <p className="text-emerald-700 text-[10px] font-bold mt-1">O vizinho vendedor já está a preparar o seu pedido.</p>
                   </div>
                ) : (
                  <>
                    {/* ALERTA DE REJEIÇÃO ESTILIZADO */}
                    {orderStatus === 'rejected' && (
                      <div className="mb-6 p-5 bg-red-50 rounded-2xl border border-red-100 flex flex-col items-center">
                        <span className="text-2xl mb-1.5">⚠️</span>
                        <p className="text-red-700 font-black text-[10px] uppercase tracking-widest leading-tight text-center">
                          Comprovante rejeitado, por favor submeta outro válido.
                        </p>
                      </div>
                    )}

                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-6">Envie o Comprovativo</p>
                    <div className="relative group">
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      <div className="w-full py-5 bg-stone-50 text-emerald-700 rounded-full font-black text-[11px] uppercase border border-stone-100 group-hover:border-emerald-200 transition-all flex items-center justify-center gap-2">
                        {uploading ? 'A SUBIR...' : currentReceipt ? 'SUBIR OUTRO' : 'ANEXAR COMPROVATIVO'}
                      </div>
                    </div>
                    
                    {currentReceipt && !uploading && orderStatus === 'pending' && <p className="mt-4 text-[9px] font-black text-emerald-600 animate-pulse uppercase tracking-widest italic">Aguardando Aprovação do Vizinho...</p>}
                  </>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
       <p className="mt-10 text-center text-[10px] font-black text-stone-300 uppercase tracking-widest pb-10">
        CompraZap⚡ Lanai
      </p>
    </div>
  )
}