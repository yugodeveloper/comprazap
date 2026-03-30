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
  const [uploading, setUploading] = useState(false)
  
  const [step, setStep] = useState<'itens' | 'identificacao' | 'dados' | 'concluido'>('itens')
  const [contact, setContact] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [buyerApto, setBuyerApto] = useState('')
  const [itemsList, setItemsList] = useState<any[]>([])
  const [existingOrder, setExistingOrder] = useState<any>(null)
  const [orderStatus, setOrderStatus] = useState<string>('pending')
  const [pastOrders, setPastOrders] = useState<any[]>([]) // Lista de pedidos pagos
  const [tempSelection, setTempSelection] = useState<any>(null)
  const [tempQty, setTempQty] = useState(1)

  const containerStyle: React.CSSProperties = { maxWidth: '450px', margin: '0 auto', backgroundColor: 'white', minHeight: '100vh', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', fontFamily: 'sans-serif', paddingBottom: '80px' };
  const btnStyle: React.CSSProperties = { width: '100%', padding: '18px', borderRadius: '50px', backgroundColor: '#059669', color: 'white', fontWeight: '900', border: 'none', cursor: 'pointer', marginTop: '10px' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '15px', borderRadius: '15px', border: '1px solid #ddd', marginBottom: '10px', boxSizing: 'border-box', textAlign: 'center', fontSize: '16px' };

  useEffect(() => { if (id) fetchData(); }, [id]);

  useEffect(() => {
    if (!existingOrder?.id) return;
    const channel = supabase.channel(`order-status-${existingOrder.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${existingOrder.id}` }, (payload) => {
        setOrderStatus(payload.new.status);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [existingOrder?.id]);

  async function fetchData() {
    const { data: cp } = await supabase.from('campaigns').select('*').eq('id', id).single();
    setCampaign(cp);
    const { data: pd } = await supabase.from('products').select('*').eq('campaign_id', id).single();
    if (pd?.variations && typeof pd.variations === 'string') {
        pd.variations = pd.variations.split(',').map((v: string) => ({ name: v.trim(), price: pd.price || 0 }));
    }
    setProduct(pd);
    const { data: sl } = await supabase.from('profiles').select('*').eq('id', cp?.creator_id).single();
    setSeller(sl);
    setLoading(false);
  }

  const totalGeral = itemsList.reduce((acc, curr) => acc + curr.total, 0);

  const handleIdentificacao = async () => {
    if (contact.length < 10) return alert("WhatsApp inválido");
    setLoading(true);
    
    // Busca pedidos desta campanha para este contato
    const { data: orders } = await supabase.from('orders').select('*').eq('campaign_id', id).eq('buyer_contact', contact).order('created_at', { ascending: false });
    
    // Busca o último endereço global para facilitar a vida do morador
    const { data: lastGlobalOrder } = await supabase.from('orders').select('buyer_name, buyer_apto').eq('buyer_contact', contact).order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (orders && orders.length > 0) {
      const pending = orders.find((o: any) => o.status !== 'paid');
      const paidOnes = orders.filter((o: any) => o.status === 'paid');
      
      setPastOrders(paidOnes);

      if (pending) {
        setExistingOrder(pending);
        setOrderStatus(pending.status);
        if (itemsList.length === 0 && Array.isArray(pending.selected_variations)) setItemsList(pending.selected_variations);
      }
    }

    if (lastGlobalOrder) { 
      setBuyerName(lastGlobalOrder.buyer_name || ''); 
      setBuyerApto(lastGlobalOrder.buyer_apto || ''); 
    }
    
    setStep('dados');
    setLoading(false);
  };

  const concluirPedido = async () => {
    if (!buyerName || !buyerApto) return alert("Preencha Nome e Unidade");
    setLoading(true);
    const orderData = { campaign_id: id, product_id: product.id, buyer_contact: contact, buyer_name: buyerName, buyer_apto: buyerApto, quantity: 1, selected_variations: itemsList, status: 'pending' };
    
    let savedOrder;
    if (existingOrder && orderStatus !== 'paid') { 
      const { data } = await supabase.from('orders').update(orderData).eq('id', existingOrder.id).select().single(); 
      savedOrder = data; 
    } else { 
      const { data } = await supabase.from('orders').insert(orderData).select().single(); 
      savedOrder = data; 
    }
    
    setExistingOrder(savedOrder);
    setOrderStatus(savedOrder.status);
    setStep('concluido');
    setLoading(false);
  };

  const handleNewOrder = () => {
    setExistingOrder(null);
    setOrderStatus('pending');
    setItemsList([]);
    setStep('itens');
  };

  if (loading) return <div style={{textAlign:'center', marginTop:50, fontWeight:'bold', color: '#059669'}}>Lanai Loading...</div>

  return (
    <div style={{ backgroundColor: '#fafaf9', minHeight: '100vh' }}>
      <div style={containerStyle}>
        
        <div style={{ height: '180px', backgroundColor: '#eee', overflow: 'hidden', position: 'relative' }}>
          <img src={campaign?.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', color: 'white' }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{campaign?.title}</h1>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          
          {step === 'itens' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: 'white', padding: 20, borderRadius: 25, border: '1px solid #eee' }}>
                <p style={{ fontSize: 10, fontWeight: 900, color: '#999', marginBottom: 15, textAlign: 'center' }}>MONTE SEU NOVO PEDIDO</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {product?.variations?.map((v: any, index: number) => (
                    <button key={index} onClick={() => setTempSelection(v)} style={{ padding: '12px 18px', borderRadius: '15px', border: '1px solid #ddd', fontSize: '13px', fontWeight: 'bold', backgroundColor: tempSelection?.name === v.name ? '#059669' : 'white', color: tempSelection?.name === v.name ? 'white' : '#444' }}>{v.name}<br/><span style={{fontSize: 10}}>R$ {v.price}</span></button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30, marginTop: 25 }}>
                    <button onClick={() => setTempQty(q => Math.max(1, q-1))} style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #ddd', fontSize: 20 }}>-</button>
                    <span style={{ fontWeight: 900, fontSize: 20 }}>{tempQty}</span>
                    <button onClick={() => setTempQty(q => q+1)} style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #ddd', fontSize: 20 }}>+</button>
                </div>
                <button onClick={() => { if (!tempSelection) return alert("Selecione um item!"); setItemsList([...itemsList, { id: Date.now(), name: tempSelection.name, price: tempSelection.price, qty: tempQty, total: tempSelection.price * tempQty }]); setTempQty(1); setTempSelection(null); }} style={{ ...btnStyle, backgroundColor: '#000', marginTop: 25 }}>ADICIONAR À LISTA</button>
              </div>

              {itemsList.length > 0 && (
                <div style={{ background: '#f8fafc', padding: 20, borderRadius: 25 }}>
                  <p style={{ fontSize: 10, fontWeight: 900, color: '#999', marginBottom: 15 }}>LISTA ATUAL</p>
                  {itemsList.map((item) => ( <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}> <div><span style={{ fontWeight: 900 }}>{item.qty}x</span> {item.name}</div> <div style={{ display:'flex', alignItems:'center', gap: 15 }}> <span style={{ fontWeight: 'bold', color: '#059669' }}>R$ {item.total.toFixed(2)}</span> <button onClick={() => setItemsList(itemsList.filter(i => i.id !== item.id))} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer' }}>✕</button> </div> </div> ))}
                  <div style={{ textAlign: 'right', fontWeight: 900, fontSize: 20, marginTop: 10 }}>Subtotal: R$ {totalGeral.toFixed(2)}</div>
                  <button onClick={() => setStep('identificacao')} style={btnStyle}>FINALIZAR</button>
                </div>
              )}
            </div>
          )}

          {step === 'identificacao' && (
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setStep('itens')} style={{ float: 'left', background: 'none', border: 'none', color: '#999' }}>← Voltar</button>
              <h3 style={{ fontWeight: 900, marginTop: 40 }}>Seu WhatsApp</h3>
              <input type="tel" placeholder="(00) 00000-0000" style={inputStyle} value={contact} onChange={e => setContact(e.target.value)} />
              <button onClick={handleIdentificacao} style={btnStyle}>CONTINUAR</button>
            </div>
          )}

          {step === 'dados' && (
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setStep('identificacao')} style={{ float: 'left', background: 'none', border: 'none', color: '#999' }}>← Voltar</button>
              <h3 style={{ fontWeight: 900, marginTop: 40 }}>Dados de Entrega</h3>
              <p style={{ fontSize: 13, fontWeight: 'bold', color: '#059669', marginBottom: 25 }}>📱 {contact}</p>
              <input placeholder="Seu Nome Completo" style={inputStyle} value={buyerName} onChange={e => setBuyerName(e.target.value)} />
              <input placeholder="Unidade / Apto" style={inputStyle} value={buyerApto} onChange={e => setBuyerApto(e.target.value)} />
              <button onClick={concluirPedido} style={btnStyle}>CONFIRMAR RESERVA</button>

              {/* LISTA DE PEDIDOS JÁ CONCLUÍDOS */}
              {pastOrders.length > 0 && (
                <div style={{ marginTop: 40, textAlign: 'left', borderTop: '1px solid #eee', paddingTop: 20 }}>
                  <p style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 15 }}>Meus Pedidos Pagos ✅</p>
                  {pastOrders.map((order: any) => (
                    <div key={order.id} style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '15px', marginBottom: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b', marginBottom: '5px' }}>{new Date(order.created_at).toLocaleDateString()}</div>
                      {Array.isArray(order.selected_variations) ? order.selected_variations.map((item: any, idx: number) => (
                        <div key={idx} style={{ fontSize: '12px' }}>{item.qty}x {item.name}</div>
                      )) : <div style={{fontSize: '12px'}}>Pedido realizado</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'concluido' && (
            <div style={{ textAlign: 'center' }}>
              {orderStatus === 'paid' ? (
                <div style={{ background: '#dcfce7', color: '#166534', padding: 20, borderRadius: 25, marginBottom: 20, fontWeight: 'bold' }}>✅ Pedido Confirmado!</div>
              ) : orderStatus === 'rejected' ? (
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: 20, borderRadius: 25, marginBottom: 20, fontWeight: 'bold' }}>⚠️ Comprovante rejeitado, envie outro.</div>
              ) : existingOrder?.receipt_url ? (
                <div style={{ background: '#fef9c3', color: '#854d0e', padding: 20, borderRadius: 25, marginBottom: 20, fontWeight: 'bold' }}>⏳ Aguardando Vendedor...</div>
              ) : (
                <div style={{ background: '#059669', color: 'white', padding: 20, borderRadius: 25, marginBottom: 20 }}>RESERVA REALIZADA! ✅</div>
              )}

              <div style={{ background: 'white', padding: 25, borderRadius: 30, border: '2px solid #f1f5f9', marginBottom: 20 }}>
                <QRCodeSVG value={campaign?.pix_key || ''} size={180} />
                <p style={{ fontWeight: 900, fontSize: 24, color: '#059669', margin: '15px 0' }}>R$ {totalGeral.toFixed(2)}</p>
                <div style={{ background: '#f8fafc', padding: 10, borderRadius: 10, fontSize: 11 }}>{campaign?.pix_key}</div>
              </div>

              {orderStatus === 'paid' ? (
                <button onClick={handleNewOrder} style={{ ...btnStyle, backgroundColor: '#000' }}>Fazer Novo Pedido</button>
              ) : (
                <>
                  <div style={{ marginBottom: 25 }}>
                    <p style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 10 }}>Anexe o comprovante Pix:</p>
                    <input type="file" accept="image/*" disabled={uploading} style={{ fontSize: 12 }} />
                  </div>
                  <button onClick={() => setStep('itens')} style={{ background: 'none', border: 'none', color: '#666', fontSize: 13, fontWeight: 'bold', textDecoration: 'underline' }}>EDITAR PEDIDO</button>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}