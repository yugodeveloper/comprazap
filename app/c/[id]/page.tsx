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
      
      // PROTEÇÃO DE DADOS: Garante que variações seja um Array, mesmo que venha String do banco
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
      const pending = orders.find((o: any) => o.status !== 'paid');
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
    if (existingOrder && orderStatus !== 'paid') { 
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

  const containerStyle: React.CSSProperties = { maxWidth: '450px', margin: '0 auto', backgroundColor: 'white', minHeight: '100vh', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', fontFamily: 'sans-serif', paddingBottom: '80px' };
  const btnStyle: React.CSSProperties = { width: '100%', padding: '18px', borderRadius: '50px', backgroundColor: '#059669', color: 'white', fontWeight: '900', border: 'none', cursor: 'pointer', marginTop: '10px' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '15px', borderRadius: '15px', border: '1px solid #ddd', marginBottom: '10px', boxSizing: 'border-box', textAlign: 'center', fontSize: '16px' };

  if (loading) return <div style={{textAlign:'center', marginTop:50, fontWeight:'bold', color: '#059669'}}>Lanai Loading...</div>

  if (error) return (
    <div style={{textAlign:'center', marginTop:100, padding:20}}>
      <h1 style={{fontWeight:'900', fontStyle:'italic'}}>Ops! ⚡</h1>
      <p style={{fontSize:12, color:'#999'}}>Campanha não encontrada ou indisponível.</p>
      <button onClick={() => window.location.href='/'} style={btnStyle}>VOLTAR AO PORTAL</button>
    </div>
  );

  return (
    <div style={{ backgroundColor: '#fafaf9', minHeight: '100vh' }}>
      <div style={containerStyle}>
        
        <div style={{ height: '180px', backgroundColor: '#eee', overflow: 'hidden', position: 'relative' }}>
          {campaign?.image_url && <img src={campaign.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', color: 'white' }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{campaign?.title}</h1>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          
          {isExpired && step !== 'concluido' && (
            <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: 20, borderRadius: 20, textAlign: 'center', marginBottom: 20 }}>
              <p style={{ fontWeight: '900', margin: 0 }}>OFERTA ENCERRADA ❌</p>
              <p style={{ fontSize: 11, margin: 0 }}>Novas reservas não são mais aceitas.</p>
            </div>
          )}

          {step === 'identificacao' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '25px', marginBottom: '20px', border: '1px solid #f1f5f9' }}>
                <p style={{ color: '#475569', fontSize: 14, lineHeight: '1.6', margin: 0 }}>{campaign?.description}</p>
              </div>
              <h3 style={{ fontWeight: 900, marginTop: 20 }}>Olá! Qual seu WhatsApp?</h3>
              <input type="tel" placeholder="(00) 00000-0000" style={inputStyle} value={contact} onChange={e => setContact(e.target.value)} />
              <button onClick={handleIdentificacao} style={btnStyle}>ACESSAR</button>
            </div>
          )}

          {step === 'itens' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {isExpired ? (
                <button onClick={() => setStep('identificacao')} style={btnStyle}>VOLTAR</button>
              ) : (
                <>
                  <button onClick={() => setStep('identificacao')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#999', fontSize: 12 }}>← Mudar Telefone</button>
                  <div style={{ background: 'white', padding: 20, borderRadius: 25, border: '1px solid #eee' }}>
                    <p style={{ fontSize: 10, fontWeight: 900, color: '#999', marginBottom: 15, textAlign: 'center' }}>MONTE SEU PEDIDO</p>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {/* CORREÇÃO AQUI: Verificação Array.isArray para evitar erro no .map */}
                      {Array.isArray(product?.variations) && product.variations.map((v: any, index: number) => (
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
                      <div style={{ textAlign: 'right', fontWeight: 900, fontSize: 20, marginTop: 10 }}>Total: R$ {itemsList.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}</div>
                      <button onClick={() => setStep('dados')} style={btnStyle}>FINALIZAR PEDIDO</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {step === 'dados' && (
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setStep('itens')} style={{ float: 'left', background: 'none', border: 'none', color: '#999' }}>← Voltar</button>
              <h3 style={{ fontWeight: 900, marginTop: 40 }}>Onde entregamos?</h3>
              <p style={{ fontSize: 13, fontWeight: 'bold', color: '#059669', marginBottom: 25 }}>📱 {contact}</p>
              <input placeholder="Seu Nome Completo" style={inputStyle} value={buyerName} onChange={e => setBuyerName(e.target.value)} />
              <input placeholder="Unidade / Apto" style={inputStyle} value={buyerApto} onChange={e => setBuyerApto(e.target.value)} />
              <button onClick={concluirPedido} style={btnStyle}>CONFIRMAR RESERVA</button>
            </div>
          )}

          {step === 'concluido' && (
            <div style={{ textAlign: 'center' }}>
              {orderStatus === 'paid' ? (
                <div style={{ background: '#dcfce7', color: '#166534', padding: 20, borderRadius: 25, marginBottom: 20, fontWeight: 'bold' }}>✅ Pagamento aprovado!</div>
              ) : orderStatus === 'rejected' ? (
                <div style={{ background: '#fee2e2', color: '#991b1b', padding: 20, borderRadius: 25, marginBottom: 20, fontWeight: 'bold' }}>⚠️ Rejeitado. Envie um novo.</div>
              ) : existingOrder?.receipt_url ? (
                <div style={{ background: '#fef9c3', color: '#854d0e', padding: 20, borderRadius: 25, marginBottom: 20, fontWeight: 'bold' }}>⏳ Aguardando aprovação...</div>
              ) : (
                <div style={{ background: '#f1f5f9', color: '#475569', padding: 20, borderRadius: 25, marginBottom: 20, fontWeight: 'bold' }}>Aguardando o Pix...</div>
              )}

              <div style={{ background: 'white', padding: 25, borderRadius: 30, border: '2px solid #f1f5f9', marginBottom: 20 }}>
                <QRCodeSVG value={campaign?.pix_key || ''} size={180} />
                <p style={{ fontWeight: 900, fontSize: 24, color: '#059669', margin: '15px 0' }}>R$ {itemsList.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}</p>
                <div style={{ background: '#f8fafc', padding: 10, borderRadius: 10, fontSize: 11 }}>{campaign?.pix_key}</div>
              </div>

              {orderStatus === 'paid' ? (
                <button 
                  onClick={() => { if(isExpired) return alert("Campanha encerrada"); setExistingOrder(null); setOrderStatus('pending'); setItemsList([]); setStep('itens'); }} 
                  style={{ ...btnStyle, backgroundColor: '#000', opacity: isExpired ? 0.5 : 1 }}
                >
                  {isExpired ? 'Campanha Encerrada' : 'Fazer Novo Pedido'}
                </button>
              ) : (
                <div style={{ marginBottom: 25 }}>
                  <input type="file" accept="image/*" onChange={handleUploadComprovante} disabled={uploading} style={{ fontSize: 12 }} />
                </div>
              )}
              {orderStatus !== 'paid' && !isExpired && <button onClick={() => setStep('itens')} style={{ background: 'none', border: 'none', color: '#666', fontSize: 13, fontWeight: 'bold', textDecoration: 'underline' }}>EDITAR PEDIDO</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}