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
  const [itemsList, setItemsList] = useState<any[]>([])
  const [existingOrder, setExistingOrder] = useState<any>(null)
  const [orderStatus, setOrderStatus] = useState<string>('pending')
  const [pastOrders, setPastOrders] = useState<any[]>([])
  const [tempSelection, setTempSelection] = useState<any>(null)
  const [tempQty, setTempQty] = useState(1)

  // --- 🔴 INTEGRAÇÃO TELEGRAM ---
  const enviarNotificacaoTelegram = async (order: any, itens: any[]) => {
    const token = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN;
    const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;
    const itensMsg = itens.map(i => `${i.qty}x ${i.name}`).join(', ');
    const total = itens.reduce((acc, curr) => acc + curr.total, 0);
    const mensagem = `🛒 *NOVO PEDIDO NO COMPRAZAP!*\n--------------------------------\n📦 *Campanha:* ${campaign?.title}\n👤 *Cliente:* ${order.buyer_name}\n🏠 *Apto:* ${order.buyer_apto}\n🔢 *Itens:* ${itensMsg}\n💵 *Total:* R$ ${total.toFixed(2)}\n--------------------------------\n📱 *WhatsApp:* ${order.buyer_contact}`;
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

  // --- 🛠️ LÓGICA CORE ---
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

    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const isExpired = campaign?.expires_at ? new Date(campaign.expires_at) < new Date() : false;

  const handleIdentificacao = async () => {
    if (contact.length < 10) return alert("WhatsApp inválido");
    setLoading(true);
    const { data: orders } = await supabase.from('orders').select('*').eq('campaign_id', id).eq('buyer_contact', contact).order('created_at', { ascending: false });
    const { data: lastGlobalOrder } = await supabase.from('orders').select('buyer_name, buyer_apto').eq('buyer_contact', contact).order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (orders && orders.length > 0) {
      const pending = orders.find((o: any) => o.status !== 'paid' && o.status !== 'cancelled');
      setPastOrders(orders.filter((o: any) => o.status === 'paid'));
      if (pending) {
        setExistingOrder(pending);
        setOrderStatus(pending.status);
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
    const orderData = { campaign_id: id, product_id: product.id, buyer_contact: contact, buyer_name: buyerName, buyer_apto: buyerApto, quantity: 1, selected_variations: itemsList, status: 'pending' };
    
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
    if (!confirm("Cancelar este pedido e voltar para a vitrine?")) return;
    setLoading(true);
    try {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', existingOrder.id);
      setExistingOrder(null);
      setOrderStatus('pending');
      setItemsList([]);
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
      alert("Comprovante enviado!");
    }
    setUploading(false);
  };

  // --- COMPONENTES AUXILIARES ---
  const InfoBadge = ({label, value}: {label: string, value: string}) => (
    <div style={{ flex: 1, textAlign: 'center', padding: '10px 5px', borderRight: '1px solid #f1f5f9' }}>
      <p style={{ margin: 0, fontSize: '8px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: 0, fontSize: '11px', fontWeight: 900, color: '#1e293b' }}>{value}</p>
    </div>
  );

  const containerStyle: React.CSSProperties = { maxWidth: '450px', margin: '0 auto', backgroundColor: 'white', minHeight: '100vh', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', fontFamily: 'sans-serif', position: 'relative' };
  const btnStyle: React.CSSProperties = { width: '100%', padding: '18px', borderRadius: '50px', backgroundColor: '#059669', color: 'white', fontWeight: '900', border: 'none', cursor: 'pointer', marginTop: '10px' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '15px', borderRadius: '15px', border: '1px solid #ddd', marginBottom: '10px', boxSizing: 'border-box', textAlign: 'center', fontSize: '16px' };

  if (loading) return <div style={{textAlign:'center', marginTop:100, fontWeight:'bold', color: '#059669'}}>Carregando Oferta...</div>

  if (error) return (
    <div style={{textAlign:'center', marginTop:100, padding:20}}>
      <h1 style={{fontWeight:'900', fontStyle:'italic'}}>Ops! ⚡</h1>
      <p style={{fontSize:12, color:'#999'}}>Oferta não encontrada.</p>
      <button onClick={() => window.location.href='/'} style={btnStyle}>VOLTAR AO PORTAL</button>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#fafaf9', minHeight: '100vh' }}>
      <div style={containerStyle}>
        
        {/* CABEÇALHO */}
        <div style={{ height: '140px', backgroundColor: '#eee', overflow: 'hidden', position: 'relative' }}>
          {campaign?.image_url && <img src={campaign.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '15px 20px', background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', color: 'white' }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>{campaign?.title}</h1>
          </div>
        </div>

        {/* BARRA DE INFOS RÁPIDAS */}
        <div style={{ display: 'flex', backgroundColor: 'white', borderBottom: '1px solid #f1f5f9' }}>
          <InfoBadge label="Local" value="Cond. Lanai" />
          <InfoBadge label="Expira" value={campaign?.expires_at ? new Date(campaign.expires_at).toLocaleDateString('pt-BR') : '--'} />
          <InfoBadge label="Vizinhos" value={`${totalBuyers} já pediram`} />
        </div>

        <div style={{ padding: '15px 20px' }}>
          
          {isExpired && step !== 'concluido' && (
            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 15, textAlign: 'center', marginBottom: 15 }}>
              <p style={{ fontWeight: '900', margin: 0, fontSize: 12 }}>OFERTA ENCERRADA ❌</p>
            </div>
          )}

          {/* DESCRIÇÃO E VENDEDOR */}
          <div style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 15, marginBottom: 20 }}>
            <p style={{ color: '#475569', fontSize: 13, lineHeight: '1.4', margin: '0 0 10px 0' }}>{campaign?.description}</p>
            
            {/* NOVO: INFO VENDEDOR */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#059669', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900 }}>
                  {seller?.full_name?.charAt(0) || 'V'}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>Vendedor: {seller?.full_name?.split(' ')[0]}</span>
              </div>
              {seller?.phone && (
                <a 
                  href={`https://wa.me/55${seller.phone.replace(/\D/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ fontSize: 10, fontWeight: 900, color: '#059669', textDecoration: 'none', border: '1px solid #059669', padding: '4px 8px', borderRadius: 50 }}
                >
                  DÚVIDAS? 📱
                </a>
              )}
            </div>
          </div>

          {step === 'identificacao' && (
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ fontWeight: 900, marginBottom: 15, fontSize: 16 }}>Qual seu WhatsApp?</h3>
              <input type="tel" placeholder="(00) 00000-0000" style={inputStyle} value={contact} onChange={e => setContact(e.target.value)} />
              <button onClick={handleIdentificacao} style={btnStyle}>ACESSAR OFERTA</button>
            </div>
          )}

          {step === 'itens' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
              {!isExpired && (
                <>
                  <div style={{ background: 'white', padding: 15, borderRadius: 20, border: '1px solid #eee' }}>
                    <p style={{ fontSize: 9, fontWeight: 900, color: '#999', marginBottom: 12, textAlign: 'center', textTransform: 'uppercase' }}>O que você deseja?</p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {Array.isArray(product?.variations) && product.variations.map((v: any, index: number) => (
                        <button key={index} onClick={() => setTempSelection(v)} style={{ padding: '10px 15px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '12px', fontWeight: 'bold', backgroundColor: tempSelection?.name === v.name ? '#059669' : 'white', color: tempSelection?.name === v.name ? 'white' : '#444' }}>
                          {v.name}<br/><span style={{fontSize: 9, opacity: 0.8}}>R$ {v.price}</span>
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
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #dcfce7' }}> 
                          <div style={{fontSize: 13}}><span style={{ fontWeight: 900 }}>{item.qty}x</span> {item.name}</div> 
                          <div style={{ display:'flex', alignItems:'center', gap: 10 }}> 
                            <span style={{ fontWeight: 'bold', color: '#059669', fontSize: 13 }}>R$ {item.total.toFixed(2)}</span> 
                            <button onClick={() => setItemsList(itemsList.filter(i => i.id !== item.id))} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold' }}>✕</button> 
                          </div> 
                        </div> 
                      ))}
                      <div style={{ textAlign: 'right', fontWeight: 900, fontSize: 16, marginTop: 5 }}>Total: R$ {itemsList.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}</div>
                      <button onClick={() => setStep('dados')} style={btnStyle}>FINALIZAR PEDIDO</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {step === 'dados' && (
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setStep('itens')} style={{ float: 'left', background: 'none', border: 'none', color: '#999', fontSize: 12 }}>← Voltar</button>
              <h3 style={{ fontWeight: 900, marginTop: 30, fontSize: 16 }}>Onde entregamos?</h3>
              <p style={{ fontSize: 12, fontWeight: 'bold', color: '#059669', marginBottom: 20 }}>📱 {contact}</p>
              <input placeholder="Seu Nome Completo" style={inputStyle} value={buyerName} onChange={e => setBuyerName(e.target.value)} />
              <input placeholder="Unidade / Apto" style={inputStyle} value={buyerApto} onChange={e => setBuyerApto(e.target.value)} />
              <button onClick={concluirPedido} style={btnStyle}>CONFIRMAR RESERVA</button>
            </div>
          )}

          {step === 'concluido' && (
            <div style={{ textAlign: 'center' }}>
              {orderStatus === 'paid' ? (
                <div style={{ background: '#dcfce7', color: '#166534', padding: 12, borderRadius: 15, marginBottom: 15, fontWeight: 'bold', fontSize: 13 }}>✅ Pagamento aprovado!</div>
              ) : orderStatus === 'rejected' ? (
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 15, marginBottom: 15, fontWeight: 'bold', fontSize: 13 }}>⚠️ Rejeitado. Envie um novo.</div>
              ) : existingOrder?.receipt_url ? (
                <div style={{ background: '#fef9c3', color: '#854d0e', padding: 12, borderRadius: 15, marginBottom: 15, fontWeight: 'bold', fontSize: 13 }}>⏳ Aguardando aprovação...</div>
              ) : (
                <div style={{ background: '#f1f5f9', color: '#475569', padding: 12, borderRadius: 15, marginBottom: 15, fontWeight: 'bold', fontSize: 13 }}>Aguardando o Pix...</div>
              )}

              <div style={{ background: 'white', padding: 20, borderRadius: 25, border: '2px solid #f1f5f9', marginBottom: 15 }}>
                <QRCodeSVG value={campaign?.pix_key || ''} size={150} />
                <p style={{ fontWeight: 900, fontSize: 20, color: '#059669', margin: '10px 0' }}>R$ {itemsList.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}</p>
                <div style={{ background: '#f8fafc', padding: 8, borderRadius: 8, fontSize: 10, wordBreak: 'break-all' }}>{campaign?.pix_key}</div>
              </div>

              {orderStatus === 'paid' ? (
                <button 
                  onClick={() => { if(isExpired) return alert("Encerrada"); setExistingOrder(null); setOrderStatus('pending'); setItemsList([]); setStep('itens'); }} 
                  style={{ ...btnStyle, backgroundColor: '#000', opacity: isExpired ? 0.5 : 1 }}
                >
                  {isExpired ? 'Encerrada' : 'Fazer Novo Pedido'}
                </button>
              ) : (
                <div style={{ marginBottom: 20 }}>
                   <p style={{fontSize: 11, color: '#666', marginBottom: 8}}>Envie o comprovante abaixo:</p>
                  <input type="file" accept="image/*" onChange={handleUploadComprovante} disabled={uploading} style={{ fontSize: 11 }} />
                  
                  {!existingOrder?.receipt_url && (
                    <button onClick={handleCancelarCompra} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 12, fontWeight: 'bold', textDecoration: 'underline', marginTop: 20, display: 'block', width: '100%' }}>CANCELAR PEDIDO</button>
                  )}
                </div>
              )}
              
              {orderStatus !== 'paid' && !isExpired && !existingOrder?.receipt_url && (
                <button onClick={() => setStep('itens')} style={{ background: 'none', border: 'none', color: '#666', fontSize: 12, fontWeight: 'bold', textDecoration: 'underline' }}>EDITAR ITENS</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}