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
  const [error, setError] = useState(false)
  const [totalBuyers, setTotalBuyers] = useState(0)
  
  const [step, setStep] = useState<'identificacao' | 'itens' | 'dados' | 'concluido'>('identificacao')
  const [contact, setContact] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [buyerApto, setBuyerApto] = useState('')
  const [observations, setObservations] = useState('')
  const [itemsList, setItemsList] = useState<any[]>([])
  const [existingOrder, setExistingOrder] = useState<any>(null)
  const [orderStatus, setOrderStatus] = useState<string>('pending')
  const [pastOrders, setPastOrders] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [tempSelection, setTempSelection] = useState<any>(null)
  const [tempQty, setTempQty] = useState(1)

  const maskPhone = (value: string) => {
    return value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .replace(/(-\d{4})(\d+?)$/, "$1");
  };

  const copyPix = () => {
    if (campaign?.pix_key) {
      navigator.clipboard.writeText(campaign.pix_key);
      alert("Chave Pix copiada! ✅");
    }
  };

  const handleLogout = () => {
    setContact('');
    setBuyerName('');
    setBuyerApto('');
    setPastOrders([]);
    setItemsList([]);
    setExistingOrder(null);
    setStep('identificacao');
  };

  const enviarNotificacaoTelegram = async (order: any, itens: any[]) => {
    const token = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;
    const itensMsg = itens.map(i => `${i.qty}x ${i.name}`).join(', ');
    const total = itens.reduce((acc, curr) => acc + curr.total, 0);
    const obsMsg = order.observations ? `\n📝 *Obs:* ${order.observations}` : "";
    const mensagem = `🛒 *NOVO PEDIDO NO COMPRAZAP!*\n--------------------------------\n📦 *Campanha:* ${campaign?.title}\n👤 *Cliente:* ${order.buyer_name}\n🏠 *Apto:* ${order.buyer_apto}\n🔢 *Itens:* ${itensMsg}${obsMsg}\n💵 *Total:* R$ ${total.toFixed(2)}\n--------------------------------\n📱 *WhatsApp:* ${order.buyer_contact}`;
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: mensagem, parse_mode: 'Markdown' })
      });
    } catch (err) { console.error("Erro Telegram:", err); }
  };

  const enviarComprovanteTelegram = async (imageUrl: string, buyer: string, oId: string, total: number) => {
    const token = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId, 
          photo: imageUrl,
          caption: `🧐 *VALIDAR COMPROVANTE*\n👤 Cliente: ${buyer}\n💰 Valor: R$ ${total.toFixed(2)}\n\nAceita este pagamento?`,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: "✅ Aceitar", callback_data: `confirm_${oId}` }, { text: "❌ Recusar", callback_data: `reject_${oId}` }]] }
        })
      });
    } catch (err) { console.error("Erro foto Telegram:", err); }
  };

  useEffect(() => { if (id) fetchData(); }, [id]);

  useEffect(() => {
    if (!existingOrder?.id) return;
    const channel = supabase.channel(`order-status-${existingOrder.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${existingOrder.id}` }, (payload) => {
        setOrderStatus(payload.new.status);
        if (payload.new.receipt_url) setExistingOrder((prev: any) => ({ ...prev, receipt_url: payload.new.receipt_url }));
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [existingOrder?.id]);

  async function fetchData() {
    try {
      const { data: cp, error: cpErr } = await supabase.from('campaigns').select('*').eq('id', id).single();
      if (cpErr || !cp) { setError(true); setLoading(false); return; }
      setCampaign(cp);

      const { data: pd } = await supabase.from('products').select('*').eq('campaign_id', id).single();
      if (pd) {
        if (pd.variations && typeof pd.variations === 'string') {
          pd.variations = pd.variations.split(',').map((v: string) => ({ name: v.trim(), price: pd.price || 0 }));
        } else if (!pd.variations) {
          pd.variations = [];
        }
      }
      setProduct(pd);

      const { data: sl } = await supabase.from('profiles').select('*').eq('id', cp?.creator_id).single();
      setSeller(sl);

      const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('campaign_id', id).neq('status', 'cancelled');
      setTotalBuyers(count || 0);

    } catch (e) { setError(true); } finally { setLoading(false); }
  }

  const handleIdentificacao = async () => {
    if (contact.length < 14) return alert("WhatsApp inválido");
    setLoading(true);
    const { data: orders } = await supabase.from('orders').select('*').eq('campaign_id', id).eq('buyer_contact', contact).order('created_at', { ascending: false });
    const { data: lastGlobalOrder } = await supabase.from('orders').select('buyer_name, buyer_apto').eq('buyer_contact', contact).order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (orders && orders.length > 0) {
      const pending = orders.find((o: any) => o.status !== 'paid' && o.status !== 'cancelled');
      setPastOrders(orders.filter((o: any) => o.status === 'paid')); 
      if (pending) {
        setExistingOrder(pending);
        setOrderStatus(pending.status);
        setObservations(pending.observations || '');
        setBuyerName(pending.buyer_name || '');
        setBuyerApto(pending.buyer_apto || '');
        if (Array.isArray(pending.selected_variations)) {
          setItemsList(pending.selected_variations);
          setStep('concluido');
          setLoading(false);
          return;
        }
      }
    }
    if (lastGlobalOrder) { setBuyerName(lastGlobalOrder.buyer_name || ''); setBuyerApto(lastGlobalOrder.buyer_apto || ''); }
    setStep('itens');
    setLoading(false);
  };

  const concluirPedido = async () => {
    if (!buyerName || !buyerApto) return alert("Preencha Nome e Unidade");
    setLoading(true);
    const orderData = { campaign_id: id, product_id: product.id, buyer_contact: contact, buyer_name: buyerName, buyer_apto: buyerApto, quantity: 1, selected_variations: itemsList, status: 'pending', observations: observations };
    
    let savedOrder;
    if (existingOrder && orderStatus !== 'paid' && orderStatus !== 'cancelled') { 
      const { data } = await supabase.from('orders').update(orderData).eq('id', existingOrder.id).select().single(); 
      savedOrder = data; 
    } else { 
      const { data } = await supabase.from('orders').insert(orderData).select().single(); 
      savedOrder = data; 
    }
    
    setExistingOrder(savedOrder);
    setOrderStatus(savedOrder.status);
    await enviarNotificacaoTelegram(savedOrder, itemsList);
    setStep('concluido');
    setLoading(false);
  };

  const handleCancelarCompra = async () => {
    if (!existingOrder) return;
    if (!confirm("Cancelar este pedido?")) return;
    setLoading(true);
    try {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', existingOrder.id);
      setExistingOrder(null);
      setOrderStatus('pending');
      setItemsList([]);
      setObservations('');
      setStep('itens');
    } catch (e) { alert("Erro ao cancelar"); }
    finally { setLoading(false); }
  };

  const handleUploadComprovante = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !existingOrder) return;
    setUploading(true);
    const file = e.target.files[0];
    const fileName = `receipts/${existingOrder.id}-${Date.now()}`;
    const { error: upErr } = await supabase.storage.from('comprovantes').upload(fileName, file);
    if (!upErr) {
      const { data: { publicUrl } } = supabase.storage.from('comprovantes').getPublicUrl(fileName);
      await supabase.from('orders').update({ receipt_url: publicUrl, status: 'pending' }).eq('id', existingOrder.id);
      setExistingOrder((prev: any) => ({ ...prev, receipt_url: publicUrl }));
      setOrderStatus('pending');
      const total = itemsList.reduce((acc, curr) => acc + curr.total, 0);
      await enviarComprovanteTelegram(publicUrl, buyerName, existingOrder.id, total);
      alert("Comprovante enviado! ✅");
    }
    setUploading(false);
  };

  const InfoBadge = ({label, value}: {label: string, value: string}) => (
    <div style={{ flex: 1, textAlign: 'center', padding: '10px 5px', borderRight: '1px solid #f1f5f9' }}>
      <p style={{ margin: 0, fontSize: '8px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '11px', fontWeight: 900, color: '#1e293b' }}>{value}</p>
    </div>
  );

  const containerStyle: React.CSSProperties = { maxWidth: '450px', margin: '0 auto', backgroundColor: 'white', minHeight: '100vh', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', fontFamily: 'sans-serif', position: 'relative' };
  const btnStyle: React.CSSProperties = { width: '100%', padding: '18px', borderRadius: '50px', backgroundColor: '#059669', color: 'white', fontWeight: '900', border: 'none', cursor: 'pointer', marginTop: '10px' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '15px', borderRadius: '15px', border: '1px solid #ddd', marginBottom: '10px', boxSizing: 'border-box', textAlign: 'center', fontSize: '16px' };

  if (loading) return <div style={{textAlign:'center', marginTop:100, fontWeight:'bold', color: '#059669'}}>Carregando...</div>

  return (
    <div style={{ backgroundColor: '#fafaf9', minHeight: '100vh' }}>
      <div style={containerStyle}>
        
        <div style={{ height: '140px', backgroundColor: '#eee', overflow: 'hidden', position: 'relative' }}>
          {campaign?.image_url && <img src={campaign.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '15px 20px', background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', color: 'white' }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>{campaign?.title}</h1>
          </div>
        </div>

        <div style={{ display: 'flex', backgroundColor: 'white', borderBottom: '1px solid #f1f5f9' }}>
          <InfoBadge label="Local" value="Cond. Lanai" />
          <InfoBadge label="Expira" value={campaign?.expires_at ? new Date(campaign.expires_at).toLocaleDateString('pt-BR') : '--'} />
          <InfoBadge label="Vizinhos" value={`${totalBuyers} já pediram`} />
        </div>

        <div style={{ padding: '15px 20px' }}>
          
          <div style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 15, marginBottom: 20 }}>
            <p style={{ color: '#475569', fontSize: 13, lineHeight: '1.4', margin: '0 0 10px 0' }}>{campaign?.description}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#059669', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900 }}>{seller?.full_name?.charAt(0)}</div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Vendedor: {seller?.full_name?.split(' ')[0]}</span>
              </div>
              {seller?.phone && <a href={`https://wa.me/55${seller.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ fontSize: 10, fontWeight: 900, color: '#059669', textDecoration: 'none', border: '1px solid #059669', padding: '4px 8px', borderRadius: 50 }}>DÚVIDAS? 📱</a>}
            </div>
          </div>

          {step === 'identificacao' && (
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontWeight: 900, marginBottom: 15, fontSize: 16 }}>Qual seu WhatsApp?</h3>
              <input type="tel" placeholder="(00) 00000-0000" style={inputStyle} value={contact} onChange={e => setContact(maskPhone(e.target.value))} />
              <button onClick={handleIdentificacao} style={btnStyle}>ACESSAR OFERTA</button>
            </div>
          )}

          {(step !== 'identificacao') && (
            <div style={{ backgroundColor: '#059669', color: 'white', padding: '12px 15px', borderRadius: '15px', marginBottom: '20px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{fontSize: '11px'}}>
                      <p style={{margin: 0, fontWeight: 900}}>{buyerName || 'Vizinho'}</p>
                      <p style={{margin: 0, opacity: 0.8}}>{buyerApto ? `Unidade ${buyerApto}` : 'Identificando...'}</p>
                      <p style={{margin: '2px 0 0 0', fontWeight: 900, fontSize: '10px'}}>{contact}</p>
                  </div>
                  <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: '9px', fontWeight: 900, padding: '5px 10px', borderRadius: '50px', cursor: 'pointer' }}>ALTERAR</button>
               </div>
               
               {pastOrders.length > 0 && (
                 <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', marginTop: 10, paddingTop: 10 }}>
                    <button 
                      onClick={() => setShowHistory(!showHistory)} 
                      style={{ background: 'none', border: 'none', color: 'white', fontSize: '10px', fontWeight: 900, padding: 0, textDecoration: 'underline', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                    >
                      🛒 Pedidos anteriores desta campanha ({pastOrders.length}) {showHistory ? '▲' : '▼'}
                    </button>
                    
                    {showHistory && (
                      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {pastOrders.map((order: any) => (
                          <div key={order.id} style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '10px', fontSize: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                              <span>{new Date(order.created_at).toLocaleDateString()}</span>
                              <span style={{ fontWeight: 900 }}>R$ {order.selected_variations?.reduce((acc:any, curr:any) => acc + curr.total, 0).toFixed(2)}</span>
                            </div>
                            <div style={{ opacity: 0.8, fontStyle: 'italic' }}>
                              {order.selected_variations?.map((v: any) => `${v.qty}x ${v.name}`).join(', ')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
               )}
            </div>
          )}

          {step === 'itens' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              <div style={{ background: 'white', padding: 15, borderRadius: 20, border: '1px solid #eee' }}>
                <p style={{ fontSize: 9, fontWeight: 900, color: '#999', marginBottom: 12, textAlign: 'center', textTransform: 'uppercase' }}>O QUE VOCÊ DESEJA?</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {Array.isArray(product?.variations) && product.variations.map((v: any, index: number) => (
                    <button key={index} onClick={() => setTempSelection(v)} style={{ padding: '10px 15px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', backgroundColor: tempSelection?.name === v.name ? '#059669' : 'white', color: tempSelection?.name === v.name ? 'white' : '#444', transition: 'all 0.2s' }}>
                      {v.name}<br/>
                      <span style={{fontSize: '13px', fontWeight: 900, color: tempSelection?.name === v.name ? 'white' : '#059669'}}>R$ {v.price}</span>
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 25, marginTop: 20 }}>
                    <button onClick={() => setTempQty(q => Math.max(1, q-1))} style={{ width: 35, height: 35, borderRadius: '50%', border: '1px solid #ddd', fontSize: 18, background: 'white' }}>-</button>
                    <span style={{ fontWeight: 900, fontSize: 18 }}>{tempQty}</span>
                    <button onClick={() => setTempQty(q => q+1)} style={{ width: 35, height: 35, borderRadius: '50%', border: '1px solid #ddd', fontSize: 18, background: 'white' }}>+</button>
                </div>
                <button onClick={() => { if (!tempSelection) return alert("Selecione um item!"); setItemsList([...itemsList, { id: Date.now(), name: tempSelection.name, price: tempSelection.price, qty: tempQty, total: tempSelection.price * tempQty }]); setTempQty(1); setTempSelection(null); }} style={{ ...btnStyle, backgroundColor: '#000', padding: 14, fontSize: 13, marginTop: 20 }}>ADICIONAR À LISTA</button>
              </div>

              {itemsList.length > 0 && (
                <div style={{ background: '#f0fdf4', padding: 15, borderRadius: 20, border: '1px solid #dcfce7' }}>
                  {itemsList.map((item) => ( 
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}> 
                      <div style={{fontSize: 13}}><span style={{ fontWeight: 900 }}>{item.qty}x</span> {item.name}</div> 
                      <div style={{ display:'flex', alignItems:'center', gap: 10 }}> <span style={{ fontWeight: 'bold', color: '#059669', fontSize: 13 }}>R$ {item.total.toFixed(2)}</span> <button onClick={() => setItemsList(itemsList.filter(i => i.id !== item.id))} style={{ background: 'none', border: 'none', color: '#ef4444' }}>✕</button> </div> 
                    </div> 
                  ))}
                  <div style={{ textAlign: 'right', fontWeight: 900, fontSize: 16 }}>Total: R$ {itemsList.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}</div>
                  <textarea placeholder="Observações (opcional)..." style={{width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #bbf7d0', fontSize: '12px', marginTop: 10, fontFamily: 'sans-serif', outline: 'none'}} rows={2} value={observations} onChange={e => setObservations(e.target.value)} />
                  <button onClick={() => setStep('dados')} style={btnStyle}>PRÓXIMO PASSO</button>
                </div>
              )}
            </div>
          )}

          {step === 'dados' && (
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setStep('itens')} style={{ float: 'left', background: 'none', border: 'none', color: '#999', fontSize: 12 }}>← Mudar Pedido</button>
              <h3 style={{ fontWeight: 900, marginTop: 30, fontSize: 16 }}>Confirmar Entrega</h3>
              
              <div style={{marginBottom: 25}}>
                <input placeholder="Seu Nome Completo" style={inputStyle} value={buyerName} onChange={e => setBuyerName(e.target.value)} />
                <input placeholder="Unidade / Apto" style={inputStyle} value={buyerApto} onChange={e => setBuyerApto(e.target.value)} />
              </div>

              {/* RESUMO DO PEDIDO ABAIXO DOS CAMPOS */}
              <div style={{ background: 'white', padding: '15px', borderRadius: '20px', border: '1px solid #eee', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <p style={{ fontSize: '10px', fontWeight: 900, color: '#999', margin: 0 }}>RESUMO DO PEDIDO</p>
                    <button onClick={() => setStep('itens')} style={{ background: 'none', border: 'none', color: '#059669', fontSize: '10px', fontWeight: 900, textDecoration: 'underline' }}>ALTERAR</button>
                  </div>
                  
                  {itemsList.map((item) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
                       <span>{item.qty}x {item.name}</span>
                       <span style={{ fontWeight: 700 }}>R$ {item.total.toFixed(2)}</span>
                    </div>
                  ))}
                  
                  <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontWeight: 900 }}>
                    <span>TOTAL</span>
                    <span style={{ color: '#059669', fontSize: '16px' }}>R$ {itemsList.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}</span>
                  </div>
              </div>

              <button onClick={concluirPedido} style={btnStyle}>CONFIRMAR PEDIDO</button>
            </div>
          )}

          {step === 'concluido' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                background: orderStatus === 'paid' ? '#dcfce7' : orderStatus === 'rejected' ? '#fee2e2' : '#f1f5f9', 
                color: orderStatus === 'paid' ? '#166534' : orderStatus === 'rejected' ? '#991b1b' : '#475569',
                padding: 12, borderRadius: 15, marginBottom: 15, fontWeight: 'bold', fontSize: 13 
              }}>
                {orderStatus === 'paid' ? '✅ Pagamento Aprovado!' : orderStatus === 'rejected' ? '⚠️ Comprovante Recusado' : 'Aguardando Pagamento'}
              </div>

              {orderStatus === 'paid' ? (
                <div style={{ background: 'white', padding: 30, borderRadius: 30, border: '2px solid #059669', marginBottom: 20 }}>
                  <p style={{ fontWeight: 900, fontSize: 18, color: '#059669' }}>
                    R$ {itemsList.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)} confirmado no Pix {campaign?.pix_key}
                  </p>
                </div>
              ) : (
                <div style={{ background: 'white', padding: 20, borderRadius: 25, border: '2px solid #f1f5f9', marginBottom: 15 }}>
                  <QRCodeSVG value={campaign?.pix_key || ''} size={150} />
                  <p style={{ fontWeight: 900, fontSize: 20, color: '#059669', margin: '10px 0' }}>R$ {itemsList.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#f8fafc', padding: '8px 12px', borderRadius: 8 }}>
                    <span style={{ fontSize: 10, wordBreak: 'break-all', color: '#64748b' }}>{campaign?.pix_key}</span>
                    <button onClick={copyPix} style={{ background: '#059669', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 5, fontSize: 9, fontWeight: 900, cursor: 'pointer' }}>COPIAR</button>
                  </div>
                </div>
              )}

              {orderStatus === 'paid' ? (
                <button onClick={() => { setExistingOrder(null); setOrderStatus('pending'); setItemsList([]); setObservations(''); setStep('itens'); }} style={{ ...btnStyle, backgroundColor: '#000' }}>Fazer Novo Pedido</button>
              ) : (
                <div style={{ marginBottom: 20 }}>
                   <p style={{fontSize: 11, color: '#666', marginBottom: 8}}>Envie o comprovante abaixo:</p>
                  <input type="file" accept="image/*" onChange={handleUploadComprovante} disabled={uploading} style={{ fontSize: 11 }} />
                  {!existingOrder?.receipt_url && <button onClick={handleCancelarCompra} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, fontWeight: 'bold', textDecoration: 'underline', marginTop: 20, display: 'block', width: '100%' }}>CANCELAR PEDIDO</button>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}