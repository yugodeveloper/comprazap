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

  // Seleções Dinâmicas (Cuca, Café, etc)
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState(1)

  // Upload
  const [uploading, setUploading] = useState(false)
  const [currentReceipt, setCurrentReceipt] = useState<string | null>(null)

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

        // Inicializar variações genéricas (ex: Tamanho, Sabor)
        if (pd?.variations) {
          const defaults: any = {}
          Object.keys(pd.variations).forEach(key => {
            if (pd.variations[key] && pd.variations[key].length > 0) {
              defaults[key] = pd.variations[key][0]
            }
          })
          setSelectedVariations(defaults)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])
const enviarNotificacaoTelegram = async (order: any) => {
  const token = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN; // Usamos NEXT_PUBLIC para teste rápido
  const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;

  const mensagem = `
💰 *NOVO PEDIDO NO COMPRAZAP!*
--------------------------------
📦 *Produto:* ${campaign?.title}
👤 *Cliente:* ${order.buyer_name}
🏠 *Apto:* ${order.buyer_apto}
🔢 *Qtd:* ${order.quantity}x
✨ *Opções:* ${JSON.stringify(order.selected_variations)}
💵 *Total:* R$ ${(product.price * order.quantity).toFixed(2)}
--------------------------------
📱 *Contato:* ${order.buyer_contact}
  `;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: mensagem,
        parse_mode: 'Markdown'
      })
    });
  } catch (err) {
    console.error("Erro ao avisar Telegram:", err);
  }
};
  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const orderData = { 
        campaign_id: id, 
        product_id: product?.id, 
        buyer_contact: contact, 
        buyer_name: buyerName, 
        buyer_apto: buyerApto, 
        status: 'pending',
        selected_variations: selectedVariations, 
        quantity: quantity
      }

      const { data, error } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single()

      if (error) throw error
      if (data) {
        setOrderId(data.id)
        setStep('checkout')
        enviarNotificacaoTelegram(data);
      }
    } catch (err: any) {
      alert("Erro ao confirmar reserva: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !orderId) return
    setUploading(true)
    const file = e.target.files[0]
    const fileName = `${orderId}-${Date.now()}`

    const { error: upErr } = await supabase.storage.from('comprovantes').upload(fileName, file)
    
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from('comprovantes').getPublicUrl(fileName)
      await supabase.from('orders').update({ receipt_url: publicUrl }).eq('id', orderId)
      setCurrentReceipt(publicUrl)
    }
    setUploading(false)
  }

  const calculateTotal = () => (product?.price || 0) * quantity

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white text-slate-900 font-bold">
      Carregando oferta Lanai...
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100">
      <div className="mx-auto max-w-md bg-white min-h-screen shadow-2xl overflow-hidden">
        
        {/* HEADER COM IMAGEM */}
        <div className="relative h-72 w-full bg-slate-200">
          {campaign?.image_url ? (
            <img 
              src={campaign.image_url} 
              alt="Capa" 
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl">🎁</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <h1 className="text-2xl font-black text-white leading-tight">{campaign?.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Vizinho Vendedor: {seller?.full_name}</span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8">
          
          {/* DESCRIÇÃO */}
          <div className="border-b border-slate-100 pb-6">
            <p className="text-slate-500 text-sm leading-relaxed">{campaign?.description}</p>
          </div>

          {/* PASSO 1: IDENTIFICAÇÃO (Login Minimalista) */}
          {step === 'identificacao' && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <h2 className="text-lg font-bold text-slate-900">Para começar, seu contato:</h2>
              <input 
                type="text" 
                placeholder="E-mail ou WhatsApp" 
                className="w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600 transition-all font-medium"
                value={contact} 
                onChange={e => setContact(e.target.value)}
              />
              <button 
                onClick={() => setStep('reserva')}
                className="w-full rounded-2xl bg-slate-900 p-5 font-black text-white shadow-xl hover:bg-slate-800 active:scale-95 transition-all"
              >
                CONTINUAR PARA RESERVA
              </button>
            </div>
          )}

          {/* PASSO 2: FORMULÁRIO DE SELEÇÃO E DADOS */}
          {step === 'reserva' && (
            <form onSubmit={handleOrder} className="space-y-6 animate-in slide-in-from-right duration-500">
              
              {/* VARIAÇÕES DINÂMICAS (Ex: Sabor, Tamanho) */}
              {product?.variations && Object.keys(product.variations).map(key => (
                <div key={key} className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{key}</label>
                  <div className="flex flex-wrap gap-2">
                    {product.variations[key].map((v: string) => (
                      <button 
                        key={v} type="button"
                        onClick={() => setSelectedVariations({...selectedVariations, [key]: v})}
                        className={`px-5 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                          selectedVariations[key] === v 
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
                          : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* SELETOR DE QUANTIDADE */}
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4 border border-slate-100">
                <span className="font-bold text-slate-700">Quantidade</span>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => setQuantity(q => q > 1 ? q - 1 : 1)} className="h-10 w-10 rounded-full bg-white shadow-sm font-black border border-slate-200 text-slate-900 hover:bg-slate-50">-</button>
                  <span className="font-mono font-black text-lg text-slate-900 w-6 text-center">{quantity}</span>
                  <button type="button" onClick={() => setQuantity(q => q + 1)} className="h-10 w-10 rounded-full bg-white shadow-sm font-black border border-slate-200 text-slate-900 hover:bg-slate-50">+</button>
                </div>
              </div>

              {/* IDENTIFICAÇÃO FINAL */}
              <div className="space-y-4 pt-4 border-t border-slate-50">
                <input 
                  placeholder="Seu Nome Completo" 
                  required 
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600 font-medium" 
                  value={buyerName} onChange={e => setBuyerName(e.target.value)} 
                />
                <input 
                  placeholder="Apto / Unidade" 
                  required 
                  className="w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-600 font-medium" 
                  value={buyerApto} onChange={e => setBuyerApto(e.target.value)} 
                />
              </div>

              <button type="submit" className="w-full rounded-2xl bg-green-600 p-5 font-black text-white shadow-xl shadow-green-100 hover:bg-green-700 active:scale-95 transition-all">
                CONFIRMAR R$ {calculateTotal().toFixed(2)}
              </button>
            </form>
          )}

          {/* PASSO 3: CHECKOUT (PIX + QR CODE) */}
          {step === 'checkout' && (
            <div className="space-y-6 text-center animate-in zoom-in duration-500">
              <div className="rounded-[40px] bg-slate-900 p-8 text-white shadow-2xl">
                <p className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Pague agora via Pix</p>
                <div className="mx-auto mb-6 inline-block rounded-3xl bg-white p-4">
                  <QRCodeSVG value={campaign?.pix_key || ''} size={180} />
                </div>
                
                <div className="bg-slate-800 p-4 rounded-2xl mb-6 border border-slate-700">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Chave Copia e Cola</p>
                  <p className="font-mono text-xs break-all text-blue-300 select-all">{campaign?.pix_key}</p>
                </div>

                <div className="border-t border-white/10 pt-4 flex justify-between items-center px-2">
                   <span className="text-slate-400 text-xs font-bold">TOTAL A PAGAR</span>
                   <span className="text-2xl font-black">R$ {calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              {/* ÁREA DE COMPROVANTE */}
              <div className="rounded-3xl bg-white p-6 border-2 border-dashed border-slate-200">
                <p className="mb-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Enviar Comprovante</p>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-slate-900 file:text-white file:font-bold cursor-pointer" 
                />
                
                {currentReceipt && (
                  <div className="mt-4 p-4 bg-green-50 rounded-xl text-green-700 text-sm font-bold flex items-center justify-center gap-2">
                    ✅ Comprovante Recebido!
                  </div>
                )}
                
                {uploading && (
                  <p className="mt-4 animate-pulse text-xs text-blue-600 font-black uppercase">Enviando Arquivo...</p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
      <p className="mt-8 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest pb-10">
        CompraZap ⚡ Lanai
      </p>
    </div>
  )
}