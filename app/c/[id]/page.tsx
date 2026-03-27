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

    // Lógica de Visualização Única
    const handleViewCount = async () => {
      const viewKey = `viewed_${id}`;
      const alreadyViewed = localStorage.getItem(viewKey);

      if (!alreadyViewed) {
        // Incrementa no Supabase via RPC (ou update simples se o RPC não existir)
        const { error } = await supabase.rpc('increment_campaign_views', { row_id: id });
        
        // Se o RPC falhar ou não estiver criado, marcamos localmente de qualquer forma para não tentar sempre
        localStorage.setItem(viewKey, 'true');
      }
    };
    handleViewCount();

    // Recupera pedido em aberto
    const savedOrderId = localStorage.getItem(`order_${id}`);
    if (savedOrderId) {
      setOrderId(savedOrderId);
      setStep('checkout');
      const checkOrder = async () => {
        const { data } = await supabase.from('orders').select('status, receipt_url, buyer_name').eq('id', savedOrderId).single();
        if (data) {
          if (data.status === 'paid') setCurrentReceipt('confirmed');
          else if (data.receipt_url) setCurrentReceipt(data.receipt_url);
          if (data.buyer_name) setBuyerName(data.buyer_name);
        }
      };
      checkOrder();
    }
  }, [id]);

  // --- 2. CARREGAMENTO DOS DADOS ---
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
            if (pd.variations[key]?.length > 0) defaults[key] = pd.variations[key][0]
          })
          setSelectedVariations(defaults)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  // --- 3. REALTIME STATUS ---
  useEffect(() => {
    if (!orderId) return;
    const subscription = supabase
      .channel(`status-order-${orderId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, (payload) => {
        if (payload.new.status === 'paid') {
          alert("🎉 Pagamento confirmado pelo vendedor!");
          setCurrentReceipt('confirmed');
        } else if (payload.new.status === 'rejected') {
          alert("⚠️ Comprovante inválido. Por favor, envie novamente.");
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
    } catch (err) { console.error(err); }
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
      await supabase.from('orders').update({ receipt_url: publicUrl }).eq('id', orderId)
      await enviarComprovanteTelegram(publicUrl, buyerName, orderId);
      setCurrentReceipt(publicUrl)
    }
    setUploading(false)
  }

  const calculateTotal = () => (product?.price || 0) * quantity

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white font-black uppercase text-xs tracking-widest animate-pulse">Lanai Loading...</div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 pb-20">
      <div className="mx-auto max-w-md bg-white min-h-screen shadow-2xl overflow-hidden">
        
        {/* IMAGEM PADRONIZADA (ASPECT RATIO 16:9) */}
        <div className="relative w-full aspect-video bg-slate-200 overflow-hidden">
          {campaign?.image_url ? (
            <img 
              src={campaign.image_url} 
              alt="Capa da Campanha" 
              className="w-full h-full object-cover transition-transform duration-1000 hover:scale-105" 
            />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl">🎁</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <h1 className="text-3xl font-black text-white leading-tight italic tracking-tighter">{campaign?.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em]">Por: {seller?.full_name}</span>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-10">
          <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
            <p className="text-slate-600 text-sm font-medium leading-relaxed">{campaign?.description}</p>
          </div>

          {step === 'identificacao' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="space-y-2 text-center">
                <h2 className="text-xl font-black italic tracking-tight">Quem está pedindo?</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Apenas para o vendedor se organizar</p>
              </div>
              <input 
                type="text" placeholder="Seu WhatsApp ou E-mail" 
                className="w-full rounded-[24px] bg-slate-100 p-5 text-slate-900 placeholder:text-slate-400 outline-none border-2 border-transparent focus:border-slate-900 font-bold transition-all"
                value={contact} onChange={e => setContact(e.target.value)}
              />
              <button onClick={() => setStep('reserva')} className="w-full rounded-[30px] bg-slate-900 p-6 font-black text-white shadow-2xl shadow-slate-200 active:scale-95 transition-all uppercase text-sm tracking-widest">
                VER PRODUTO
              </button>
            </div>
          )}

          {step === 'reserva' && (
            <form onSubmit={handleOrder} className="space-y-8 animate-in slide-in-from-right duration-500">
              {product?.variations && Object.keys(product.variations).map(key => (
                <div key={key} className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">{key}</label>
                  <div className="flex flex-wrap gap-3">
                    {product.variations[key].map((v: string) => (
                      <button 
                        key={v} type="button"
                        onClick={() => setSelectedVariations({...selectedVariations, [key]: v})}
                        className={`px-6 py-4 rounded-2xl text-xs font-black transition-all border-2 ${
                          selectedVariations[key] === v 
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xl' 
                          : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between rounded-[32px] bg-slate-900 p-6 text-white shadow-xl">
                <span className="font-black uppercase text-[10px] tracking-widest">Quantidade</span>
                <div className="flex items-center gap-6">
                  <button type="button" onClick={() => setQuantity(q => q > 1 ? q - 1 : 1)} className="h-10 w-10 rounded-full bg-white/10 font-black text-xl hover:bg-white/20">-</button>
                  <span className="font-black text-xl w-6 text-center">{quantity}</span>
                  <button type="button" onClick={() => setQuantity(q => q + 1)} className="h-10 w-10 rounded-full bg-white/10 font-black text-xl hover:bg-white/20">+</button>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <input placeholder="Seu Nome" required className="w-full rounded-[24px] bg-slate-100 p-5 font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all" value={buyerName} onChange={e => setBuyerName(e.target.value)} />
                <input placeholder="Unidade / Apto" required className="w-full rounded-[24px] bg-slate-100 p-5 font-bold outline-none border-2 border-transparent focus:border-blue-500 transition-all" value={buyerApto} onChange={e => setBuyerApto(e.target.value)} />
              </div>

              <button type="submit" className="w-full rounded-[30px] bg-green-600 p-6 font-black text-white shadow-2xl shadow-green-100 uppercase text-sm tracking-widest">
                RESERVAR R$ {calculateTotal().toFixed(2)}
              </button>
            </form>
          )}

          {step === 'checkout' && (
            <div className="space-y-8 animate-in zoom-in duration-500">
              <div className="rounded-[40px] bg-slate-900 p-8 text-white shadow-2xl text-center">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 mb-6">Pague agora via Pix</p>
                <div className="mx-auto mb-8 inline-block rounded-[32px] bg-white p-6 shadow-inner">
                  <QRCodeSVG value={campaign?.pix_key || ''} size={200} />
                </div>
                <div className="bg-white/5 p-5 rounded-3xl border border-white/10 mb-8 select-all active:bg-white/10 transition-all cursor-copy">
                   <p className="text-[9px] text-white/40 font-black uppercase mb-2">Chave Pix Copia e Cola</p>
                   <p className="font-mono text-[10px] break-all text-blue-300 leading-tight">{campaign?.pix_key}</p>
                </div>
                <div className="flex justify-between items-center px-2">
                   <span className="text-white/40 text-[10px] font-black uppercase tracking-tighter">Total a Pagar</span>
                   <span className="text-3xl font-black italic">R$ {calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="rounded-[32px] bg-white p-8 border-2 border-dashed border-slate-200 text-center">
                {currentReceipt === 'confirmed' ? (
                   <div className="p-6 bg-green-50 rounded-2xl border-2 border-green-200 flex flex-col items-center">
                     <span className="text-4xl mb-3">✅</span>
                     <p className="text-green-800 font-black text-sm uppercase tracking-widest">Pagamento Confirmado!</p>
                     <p className="text-green-600 text-[10px] font-bold mt-1">O vendedor já foi notificado.</p>
                   </div>
                ) : (
                  <>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Envie o Comprovante</p>
                    <div className="relative group">
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      <div className="w-full py-5 bg-slate-100 rounded-2xl font-black text-[10px] text-slate-600 uppercase border-2 border-transparent group-hover:border-slate-900 transition-all flex items-center justify-center gap-2">
                        <span>📸</span> {uploading ? 'SUBINDO...' : currentReceipt ? 'SUBIR OUTRO' : 'ANEXAR COMPROVANTE'}
                      </div>
                    </div>
                    {currentReceipt && !uploading && <p className="mt-4 text-[9px] font-black text-blue-600 animate-pulse uppercase tracking-widest italic">Aguardando validação do vizinho...</p>}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="mt-10 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest">
        CompraZap ⚡ Lanai
      </p>
    </div>
  )
}