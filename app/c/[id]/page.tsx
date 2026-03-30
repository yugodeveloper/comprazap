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

  const [step, setStep] = useState<'identificacao' | 'reserva' | 'checkout'>('identificacao')
  const [contact, setContact] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [buyerApto, setBuyerApto] = useState('')
  const [orderId, setOrderId] = useState<string | null>(null)
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({})
  const [quantity, setQuantity] = useState(1)
  const [uploading, setUploading] = useState(false)
  const [currentReceipt, setCurrentReceipt] = useState<string | null>(null)

  // Estilo padrão para todos os inputs (Garante que não vaze para a direita)
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '18px',
    borderRadius: '15px',
    border: '1px solid #e7e5e4',
    marginBottom: '15px',
    textAlign: 'center',
    outline: 'none',
    boxSizing: 'border-box', // Crucial para não vazar
    fontSize: '16px',
    fontFamily: 'inherit'
  };

  useEffect(() => {
    if (!id) return;
    const handleViewCount = async () => {
      try {
        const viewKey = `viewed_${id}`;
        if (!localStorage.getItem(viewKey)) {
          await supabase.rpc('increment_campaign_views', { row_id: id });
          localStorage.setItem(viewKey, 'true');
        }
      } catch (e) { console.error(e); }
    };
    handleViewCount();

    const savedOrderId = localStorage.getItem(`order_${id}`);
    if (savedOrderId) {
      setOrderId(savedOrderId);
      setStep('checkout');
      supabase.from('orders').select('status, receipt_url, buyer_name').eq('id', savedOrderId).single().then(({ data }) => {
        if (data) {
          setOrderStatus(data.status);
          if (data.status === 'paid') setCurrentReceipt('confirmed');
          else if (data.receipt_url) setCurrentReceipt(data.receipt_url);
          if (data.buyer_name) setBuyerName(data.buyer_name);
        }
      });
    }
  }, [id]);

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
      } finally { setLoading(false) }
    }
    fetchData()
  }, [id])

  useEffect(() => {
    if (!orderId) return;
    const subscription = supabase.channel(`status-${orderId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, (payload) => {
      setOrderStatus(payload.new.status);
      if (payload.new.status === 'paid') setCurrentReceipt('confirmed');
      if (payload.new.status === 'rejected') setCurrentReceipt(null);
    }).subscribe();
    return () => { supabase.removeChannel(subscription) };
  }, [orderId]);

  const handleOrder = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const orderData = { campaign_id: id, product_id: product?.id, buyer_contact: contact, buyer_name: buyerName, buyer_apto: buyerApto, status: 'pending', selected_variations: selectedVariations, quantity: quantity }
    const { data } = await supabase.from('orders').insert(orderData).select().single()
    if (data) {
      setOrderId(data.id); localStorage.setItem(`order_${id}`, data.id); setStep('checkout');
    }
    setLoading(false);
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
      setCurrentReceipt(publicUrl)
    }
    setUploading(false)
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', fontWeight: 'bold', color: '#059669' }}>Lanai Loading...</div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafaf9', color: '#1c1917', paddingBottom: '80px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '450px', margin: '0 auto', backgroundColor: 'white', minHeight: '100vh', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        
        <div style={{ position: 'relative', width: '100%', height: '250px', backgroundColor: '#f5f5f4', overflow: 'hidden' }}>
          {campaign?.image_url ? (
            <img 
              src={campaign.image_url} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              alt="Capa" 
            />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>🖼️</div>
          )}
          
          <div style={{ position: 'absolute', bottom: '15px', left: '15px', right: '15px', backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.3)' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '900', fontStyle: 'italic', color: '#0c0a09' }}>{campaign?.title}</h1>
            <p style={{ margin: '5px 0 0 0', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#444' }}>Por: {seller?.full_name}</p>
          </div>
        </div>

        <div style={{ padding: '30px' }}>
          <div style={{ backgroundColor: '#f5f5f4', padding: '20px', borderRadius: '20px', marginBottom: '30px' }}>
            <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#444' }}>{campaign?.description}</p>
          </div>

          {step === 'identificacao' && (
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '900', fontStyle: 'italic', marginBottom: '5px' }}>Olá, Vizinho!</h2>
              <p style={{ fontSize: '11px', color: '#78716c', marginBottom: '20px', fontWeight: 'bold', textTransform: 'uppercase' }}>Identifique-se com seu WhatsApp</p>
              <input 
                type="tel" 
                placeholder="(00) 00000-0000" 
                style={inputStyle}
                value={contact} 
                onChange={e => setContact(e.target.value)}
              />
              <button onClick={() => setStep('reserva')} style={{ width: '100%', padding: '20px', borderRadius: '50px', backgroundColor: '#059669', color: 'white', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: '12px', letterSpacing: '1px' }}>
                VER PRODUTO E RESERVAR
              </button>
            </div>
          )}

          {step === 'reserva' && (
            <form onSubmit={handleOrder} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {product?.variations && Object.keys(product.variations).map(key => (
                <div key={key}>
                  <label style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', color: '#a8a29e', marginBottom: '10px', display: 'block' }}>{key}</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {product.variations[key].map((v: string) => (
                      <button 
                        key={v} type="button"
                        onClick={() => setSelectedVariations({...selectedVariations, [key]: v})}
                        style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid #e7e5e4', fontSize: '12px', fontWeight: 'bold', backgroundColor: selectedVariations[key] === v ? '#059669' : 'white', color: selectedVariations[key] === v ? 'white' : '#78716c' }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', backgroundColor: '#f5f5f4', borderRadius: '15px' }}>
                <span style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }}>Quantidade</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <button type="button" onClick={() => setQuantity(q => q > 1 ? q - 1 : 1)} style={{ width: '35px', height: '35px', borderRadius: '50%', border: 'none', backgroundColor: 'white', fontWeight: 'bold', cursor: 'pointer' }}>-</button>
                  <span style={{ fontWeight: '900', fontSize: '18px' }}>{quantity}</span>
                  <button type="button" onClick={() => setQuantity(q => q + 1)} style={{ width: '35px', height: '35px', borderRadius: '50%', border: 'none', backgroundColor: 'white', fontWeight: 'bold', cursor: 'pointer' }}>+</button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <input placeholder="Seu Nome Completo" required style={inputStyle} value={buyerName} onChange={e => setBuyerName(e.target.value)} />
                <input placeholder="Apto / Bloco" required style={inputStyle} value={buyerApto} onChange={e => setBuyerApto(e.target.value)} />
              </div>

              <button type="submit" style={{ width: '100%', padding: '20px', borderRadius: '50px', backgroundColor: '#059669', color: 'white', fontWeight: '900', border: 'none', cursor: 'pointer', fontSize: '12px' }}>
                CONFIRMAR R$ {((product?.price || 0) * quantity).toFixed(2)}
              </button>
            </form>
          )}

          {step === 'checkout' && (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div style={{ backgroundColor: '#0c0a09', padding: '30px', borderRadius: '30px', color: 'white' }}>
                <p style={{ fontSize: '10px', fontWeight: '900', color: '#10b981', marginBottom: '20px' }}>PAGUE VIA PIX</p>
                <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '20px', display: 'inline-block', marginBottom: '20px' }}>
                  <QRCodeSVG value={campaign?.pix_key || ''} size={150} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px' }}>
                  <span style={{ fontSize: '10px', color: '#78716c' }}>TOTAL</span>
                  <span style={{ fontWeight: '900', fontSize: '24px' }}>R$ {((product?.price || 0) * quantity).toFixed(2)}</span>
                </div>
              </div>

              <div style={{ padding: '25px', border: '2px dashed #e7e5e4', borderRadius: '25px' }}>
                {currentReceipt === 'confirmed' ? (
                  <div style={{ color: '#059669', fontWeight: 'bold' }}>✅ PAGAMENTO CONFIRMADO!</div>
                ) : (
                  <>
                    {orderStatus === 'rejected' && (
                      <div style={{ marginBottom: '15px', color: '#dc2626', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>⚠️ Comprovante rejeitado, por favor submeta outro válido.</div>
                    )}
                    <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#a8a29e', textTransform: 'uppercase', marginBottom: '15px' }}>Anexe o Comprovante</p>
                    <input type="file" accept="image/*" onChange={handleFileUpload} />
                    {uploading && <p style={{ fontSize: '10px', color: '#059669', marginTop: '10px' }}>Subindo...</p>}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}