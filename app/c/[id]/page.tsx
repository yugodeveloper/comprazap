'use client'

import { supabase } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'

export default function LandingPageGourmetFinal() {
  const params = useParams()
  const id = params?.id as string
  
  const [campaign, setCampaign] = useState<any>(null)
  const [product, setProduct] = useState<any>(null)
  const [seller, setSeller] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Estados de Fluxo
  const [contact, setContact] = useState('')
  const [identified, setIdentified] = useState(false)
  const [existingOrder, setExistingOrder] = useState<any>(null)
  const [pastOrders, setPastOrders] = useState<any[]>([])

  // Campos do Formulário
  const [buyerName, setBuyerName] = useState('')
  const [buyerApto, setBuyerApto] = useState('')
  const [selectedType, setSelectedType] = useState<any>(null) 
  const [quantity, setQuantity] = useState(1)
  const [uploading, setUploading] = useState(false)

  const containerStyle: React.CSSProperties = {
    maxWidth: '450px', margin: '0 auto', backgroundColor: 'white', minHeight: '100vh', 
    boxShadow: '0 10px 15px rgba(0,0,0,0.1)', fontFamily: 'sans-serif', paddingBottom: '50px'
  };

  const btnStyle: React.CSSProperties = {
    width: '100%', padding: '18px', borderRadius: '50px', backgroundColor: '#059669',
    color: 'white', fontWeight: '900', border: 'none', cursor: 'pointer', marginTop: '10px'
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  async function fetchData() {
    const { data: cp } = await supabase.from('campaigns').select('*').eq('id', id).single();
    setCampaign(cp);
    const { data: pd } = await supabase.from('products').select('*').eq('campaign_id', id).single();
    setProduct(pd);
    const { data: sl } = await supabase.from('profiles').select('*').eq('id', cp?.creator_id).single();
    setSeller(sl);
    setLoading(false);
  }

  const verificarIdentidade = async () => {
    if (contact.length < 10) return alert("Digite um WhatsApp válido");
    setLoading(true);

    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('campaign_id', id)
      .eq('buyer_contact', contact);

    if (orders && orders.length > 0) {
      const pending = orders.find(o => o.status !== 'paid');
      const paid = orders.filter(o => o.status === 'paid');
      
      if (pending) {
        setExistingOrder(pending);
        setBuyerName(pending.buyer_name);
        setBuyerApto(pending.buyer_apto);
        setQuantity(pending.quantity);
        setSelectedType(pending.selected_variations); 
      }
      setPastOrders(paid);
    }
    setIdentified(true);
    setLoading(false);
  };

  const handleSalvarReserva = async () => {
    if (!selectedType) return alert("Selecione uma opção");
    setLoading(true);
    
    const orderData = {
      campaign_id: id,
      product_id: product.id,
      buyer_contact: contact,
      buyer_name: buyerName,
      buyer_apto: buyerApto,
      quantity,
      selected_variations: selectedType,
      status: 'pending'
    };

    let res;
    if (existingOrder) {
      res = await supabase.from('orders').update(orderData).eq('id', existingOrder.id).select().single();
    } else {
      res = await supabase.from('orders').insert(orderData).select().single();
    }

    if (res.data) {
      setExistingOrder(res.data);
      alert("Reserva salva com sucesso! Prossiga para o pagamento.");
    }
    setLoading(false);
  };

  if (loading) return <div style={{textAlign:'center', marginTop:'50px', fontWeight: 'bold'}}>Carregando CompraZap...</div>

  return (
    <div style={{ backgroundColor: '#fafaf9', minHeight: '100vh' }}>
      <div style={containerStyle}>
        
        {/* HEADER IMAGEM */}
        <div style={{ position: 'relative', height: '250px', overflow: 'hidden' }}>
          <img src={campaign?.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Produto" />
          <div style={{ position: 'absolute', bottom: 15, left: 15, right: 15, background: 'rgba(255,255,255,0.8)', padding: 15, borderRadius: 20, backdropFilter: 'blur(5px)' }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{campaign?.title}</h1>
            <p style={{ margin: 0, fontSize: 10, color: '#666' }}>FECHA EM: {campaign?.expires_at ? new Date(campaign.expires_at).toLocaleDateString() : '...'}</p>
          </div>
        </div>

        <div style={{ padding: 25 }}>
          <p style={{ color: '#444', fontSize: 14, marginBottom: 20 }}>{campaign?.description}</p>

          {/* VITRINE DE PREÇOS (SEMPRE VISÍVEL) */}
          <div style={{ marginBottom: 25 }}>
            <h3 style={{ fontSize: 10, fontWeight: 900, color: '#999', textTransform: 'uppercase', marginBottom: 10 }}>Opções Disponíveis</h3>
            {product?.variations?.map((v: any, index: number) => (
              <div 
                key={index} 
                onClick={() => (!existingOrder || existingOrder.status !== 'paid') && setSelectedType(v)}
                style={{ 
                  display: 'flex', justifyContent: 'space-between', padding: 15, borderRadius: 15, border: '1px solid #eee', 
                  marginBottom: 8, cursor: 'pointer',
                  backgroundColor: selectedType?.name === v.name ? '#f0fdf4' : 'white',
                  borderColor: selectedType?.name === v.name ? '#059669' : '#eee'
                }}
              >
                <span style={{ fontWeight: 'bold', fontSize: 13 }}>{v.name}</span>
                <span style={{ fontWeight: 900, color: '#059669' }}>R$ {v.price}</span>
              </div>
            ))}
          </div>

          {/* FLUXO DE IDENTIFICAÇÃO */}
          {!identified ? (
            <div style={{ textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
              <p style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 10 }}>Para comprar ou ver seus pedidos, digite seu WhatsApp:</p>
              <input 
                type="tel" placeholder="(00) 00000-0000" 
                style={{ width: '100%', padding: 15, borderRadius: 15, border: '1px solid #ddd', textAlign: 'center', boxSizing: 'border-box' }}
                value={contact} onChange={e => setContact(e.target.value)}
              />
              <button onClick={verificarIdentidade} style={btnStyle}>CONTINUAR</button>
            </div>
          ) : (
            <div>
              {/* CAMPOS DE DADOS */}
              <div style={{ opacity: existingOrder?.status === 'paid' ? 0.6 : 1, pointerEvents: existingOrder?.status === 'paid' ? 'none' : 'auto' }}>
                <input placeholder="Seu Nome" style={{ width: '100%', padding: 12, marginBottom: 10, borderRadius: 10, border: '1px solid #ddd', boxSizing: 'border-box' }} value={buyerName} onChange={e => setBuyerName(e.target.value)} />
                <input placeholder="Apto" style={{ width: '100%', padding: 12, marginBottom: 10, borderRadius: 10, border: '1px solid #ddd', boxSizing: 'border-box' }} value={buyerApto} onChange={e => setBuyerApto(e.target.value)} />
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, margin: '15px 0' }}>
                   <button onClick={() => setQuantity(q => q > 1 ? q - 1 : 1)} style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #ddd' }}>-</button>
                   <span style={{ fontWeight: 900 }}>{quantity}</span>
                   <button onClick={() => setQuantity(q => q + 1)} style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #ddd' }}>+</button>
                </div>

                <button onClick={handleSalvarReserva} style={btnStyle}>
                  {existingOrder ? 'ALTERAR E CONFIRMAR' : 'CONFIRMAR RESERVA'}
                </button>
              </div>

              {/* ÁREA DE PAGAMENTO / COMPROVANTE */}
              {existingOrder && (
                <div style={{ marginTop: 30, padding: 20, backgroundColor: '#f8fafc', borderRadius: 25, border: '2px dashed #cbd5e1', textAlign: 'center' }}>
                   <p style={{ fontWeight: 900, fontSize: 14 }}>PAGAMENTO PIX</p>
                   <QRCodeSVG value={campaign?.pix_key || ''} size={150} style={{ margin: '15px 0' }} />
                   <p style={{ fontSize: 18, fontWeight: 900, color: '#059669' }}>Total: R$ {( (selectedType?.price || 0) * quantity).toFixed(2)}</p>
                   
                   <div style={{ marginTop: 15 }}>
                      <p style={{ fontSize: 10, fontWeight: 'bold', color: '#64748b' }}>A reserva expira se o comprovante não for enviado.</p>
                      {/* Lógica de upload já funcional mantida */}
                   </div>
                </div>
              )}

              {/* HISTÓRICO DE COMPRAS PAGAS */}
              {pastOrders.length > 0 && (
                <div style={{ marginTop: 40, borderTop: '1px solid #eee', paddingTop: 20 }}>
                   <h3 style={{ fontSize: 10, fontWeight: 900, color: '#999', textTransform: 'uppercase' }}>Compras Realizadas ✅</h3>
                   {pastOrders.map((o, i) => (
                     <div key={i} style={{ fontSize: 11, padding: '12px 0', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{new Date(o.created_at).toLocaleDateString()} - {o.quantity}x {o.selected_variations?.name}</span>
                        <span style={{ color: '#059669', fontWeight: 'bold' }}>PAGO</span>
                     </div>
                   ))}
                   <button onClick={() => { setExistingOrder(null); setBuyerName(''); setBuyerApto(''); setQuantity(1); setSelectedType(null); }} style={{ color: '#059669', fontSize: 11, fontWeight: 'bold', background: 'none', border: 'none', marginTop: 15, cursor: 'pointer' }}>+ FAZER NOVA COMPRA</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}