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
  const [orderStatus, setOrderStatus] = useState<string>('pending') // NOVO: Controle de status real
  
  const [step, setStep] = useState<'identificacao' | 'reserva' | 'checkout'>('identificacao')
  const [contact, setContact] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [buyerApto, setBuyerApto] = useState('')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [uploading, setUploading] = useState(false)
  const [currentReceipt, setCurrentReceipt] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return;

    // 1. Contador de Views Únicas
    const handleView = async () => {
      const viewKey = `viewed_${id}`;
      if (!localStorage.getItem(viewKey)) {
        await supabase.rpc('increment_campaign_views', { row_id: id });
        localStorage.setItem(viewKey, 'true');
      }
    };
    handleView();

    // 2. Recuperar Pedido
    const savedOrderId = localStorage.getItem(`order_${id}`);
    if (savedOrderId) {
      setOrderId(savedOrderId);
      setStep('checkout');
      const checkOrder = async () => {
        const { data } = await supabase.from('orders').select('*').eq('id', savedOrderId).single();
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

  // ... (Efeito de Realtime e FetchData mantidos) ...

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const orderData = { campaign_id: id, product_id: product?.id, buyer_contact: contact, buyer_name: buyerName, buyer_apto: buyerApto, status: 'pending', quantity: quantity }
      const { data, error } = await supabase.from('orders').insert(orderData).select().single()
      if (error) throw error
      if (data) {
        setOrderId(data.id); 
        localStorage.setItem(`order_${id}`, data.id); 
        setStep('checkout');
        // GARANTIA: Enviar ao Telegram IMEDIATAMENTE após criar o pedido
        await enviarNotificacaoTelegram(data);
      }
    } catch (err: any) { alert(err.message) } finally { setLoading(false) }
  }

  // ... (Funções de Upload e Telegram mantidas) ...

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="mx-auto max-w-md bg-white min-h-screen shadow-2xl">
        
        {/* IMAGEM TOP - 16:9 FIXO */}
        <div className="relative w-full aspect-video bg-slate-200 overflow-hidden">
          {campaign?.image_url && <img src={campaign.image_url} className="w-full h-full object-cover" alt="" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <h1 className="absolute bottom-6 left-6 right-6 text-3xl font-black text-white italic">{campaign?.title}</h1>
        </div>

        <div className="p-8 space-y-8">
          {step === 'checkout' && (
            <div className="space-y-8 animate-in zoom-in duration-500">
              <div className="rounded-[40px] bg-slate-900 p-8 text-white shadow-2xl text-center">
                <p className="text-[10px] font-black uppercase text-blue-400 mb-6 tracking-widest">Pague via Pix</p>
                <div className="mx-auto mb-6 bg-white p-4 rounded-3xl inline-block">
                  <QRCodeSVG value={campaign?.pix_key || ''} size={180} />
                </div>
                <p className="text-2xl font-black italic">R$ {(product?.price * quantity).toFixed(2)}</p>
              </div>

              <div className="rounded-[32px] bg-white p-8 border-2 border-dashed border-slate-200 text-center">
                {currentReceipt === 'confirmed' ? (
                   <div className="p-4 bg-green-50 rounded-2xl border-2 border-green-200">
                     <p className="text-green-800 font-black text-sm uppercase">✅ Pagamento Confirmado!</p>
                   </div>
                ) : (
                  <>
                    {/* CORREÇÃO MENSAGEM REJEIÇÃO */}
                    {orderStatus === 'rejected' && (
                      <div className="mb-6 p-4 bg-red-50 rounded-2xl border border-red-100 flex flex-col items-center">
                        <span className="text-xl mb-1">⚠️</span>
                        <p className="text-red-600 font-black text-[10px] uppercase tracking-widest leading-tight">
                          Comprovante rejeitado, por favor submeta outro válido.
                        </p>
                      </div>
                    )}

                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Envie o Comprovante</p>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="fileUp" />
                    <label htmlFor="fileUp" className="block w-full py-5 bg-slate-100 rounded-2xl font-black text-[10px] text-slate-600 uppercase cursor-pointer">
                      {uploading ? 'SUBINDO...' : 'ANEXAR COMPROVANTE'}
                    </label>
                  </>
                )}
              </div>
            </div>
          )}
          {/* ... Outros passos Identification/Reserva ... */}
        </div>
      </div>
    </div>
  )
}