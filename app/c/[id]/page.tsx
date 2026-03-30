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
  const [loading, setLoading] = useState(true)
  
  // Fluxo de Etapas: 'itens' -> 'identificacao' -> 'dados' -> 'concluido'
  const [step, setStep] = useState<'itens' | 'identificacao' | 'dados' | 'concluido'>('itens')
  
  // Dados do Comprador
  const [contact, setContact] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [buyerApto, setBuyerApto] = useState('')
  
  // Carrinho
  const [tempSelection, setTempSelection] = useState<any>(null)
  const [tempQty, setTempQty] = useState(1)
  const [itemsList, setItemsList] = useState<any[]>([])
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null)

  const containerStyle: React.CSSProperties = { maxWidth: '450px', margin: '0 auto', backgroundColor: 'white', minHeight: '100vh', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', fontFamily: 'sans-serif', paddingBottom: '80px' };
  const btnStyle: React.CSSProperties = { width: '100%', padding: '18px', borderRadius: '50px', backgroundColor: '#059669', color: 'white', fontWeight: '900', border: 'none', cursor: 'pointer', marginTop: '10px' };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '15px', borderRadius: '15px', border: '1px solid #ddd', marginBottom: '10px', boxSizing: 'border-box', textAlign: 'center', fontSize: '16px' };

  useEffect(() => { if (id) fetchData(); }, [id]);

  async function fetchData() {
    const { data: cp } = await supabase.from('campaigns').select('*').eq('id', id).single();
    setCampaign(cp);
    const { data: pd } = await supabase.from('products').select('*').eq('campaign_id', id).single();
    
    if (pd?.variations && typeof pd.variations === 'string') {
        pd.variations = pd.variations.split(',').map((v: string) => ({ name: v.trim(), price: pd.price || 0 }));
    }
    setProduct(pd);
    setLoading(false);
  }

  const adicionarAoPedido = () => {
    if (!tempSelection) return alert("Selecione um item!");
    const novoItem = { id: Date.now(), name: tempSelection.name, price: tempSelection.price, qty: tempQty, total: tempSelection.price * tempQty };
    setItemsList([...itemsList, novoItem]);
    setTempQty(1);
    setTempSelection(null);
  };

  const removerDoPedido = (itemId: number) => {
    setItemsList(itemsList.filter(i => i.id !== itemId));
  };

  const totalGeral = itemsList.reduce((acc, curr) => acc + curr.total, 0);

  // --- LOGICA DE IDENTIFICAÇÃO ---
  const handleIdentificacao = async () => {
    if (contact.length < 10) return alert("WhatsApp inválido");
    setLoading(true);

    // 1. Tenta buscar se ele já tem um pedido NESTA campanha
    const { data: currentOrder } = await supabase.from('orders').select('*').eq('campaign_id', id).eq('buyer_contact', contact).maybeSingle();

    // 2. Tenta buscar o ÚLTIMO nome/apto dele em QUALQUER campanha (Memória)
    const { data: lastGlobalOrder } = await supabase.from('orders').select('buyer_name, buyer_apto').eq('buyer_contact', contact).order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (currentOrder) {
      setExistingOrderId(currentOrder.id);
      if (itemsList.length === 0 && Array.isArray(currentOrder.selected_variations)) {
        setItemsList(currentOrder.selected_variations);
      }
    }

    // Pré-preenche se encontrou histórico
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
    const orderData = {
      campaign_id: id, product_id: product.id, buyer_contact: contact,
      buyer_name: buyerName, buyer_apto: buyerApto, quantity: 1,
      selected_variations: itemsList, status: 'pending'
    };

    if (existingOrderId) await supabase.from('orders').update(orderData).eq('id', existingOrderId);
    else {
      const { data } = await supabase.from('orders').insert(orderData).select().single();
      setExistingOrderId(data.id);
    }
    setStep('concluido');
    setLoading(false);
  };

  if (loading) return <div style={{textAlign:'center', marginTop:50, fontWeight:'bold'}}>Processando...</div>

  return (
    <div style={{ backgroundColor: '#fafaf9', minHeight: '100vh' }}>
      <div style={containerStyle}>
        
        {/* HEADER */}
        <div style={{ height: '180px', backgroundColor: '#eee', overflow: 'hidden', position: 'relative' }}>
          <img src={campaign?.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Campanha" />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', color: 'white' }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{campaign?.title}</h1>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          
          {/* STEP 1: MONTAGEM DO CARRINHO */}
          {step === 'itens' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: 'white', padding: 20, borderRadius: 25, border: '1px solid #eee' }}>
                <p style={{ fontSize: 10, fontWeight: 900, color: '#999', marginBottom: 15, textAlign: 'center' }}>ADICIONE OS ITENS</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {product?.variations?.map((v: any, index: number) => (
                    <button key={index} onClick={() => setTempSelection(v)}
                      style={{ padding: '12px 18px', borderRadius: '15px', border: '1px solid #ddd', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                        backgroundColor: tempSelection?.name === v.name ? '#059669' : 'white',
                        color: tempSelection?.name === v.name ? 'white' : '#444'
                      }}>
                      {v.name}<br/><span style={{fontSize: 10}}>R$ {v.price}</span>
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30, marginTop: 25 }}>
                    <button onClick={() => setTempQty(q => Math.max(1, q-1))} style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #ddd', fontSize: 20 }}>-</button>
                    <span style={{ fontWeight: 900, fontSize: 20 }}>{tempQty}</span>
                    <button onClick={() => setTempQty(q => q+1)} style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid #ddd', fontSize: 20 }}>+</button>
                </div>
                <button onClick={adicionarAoPedido} style={{ ...btnStyle, backgroundColor: '#000', marginTop: 25 }}>ADICIONAR À LISTA</button>
              </div>

              {itemsList.length > 0 && (
                <div style={{ background: '#f8fafc', padding: 20, borderRadius: 25 }}>
                  <p style={{ fontSize: 10, fontWeight: 900, color: '#999', marginBottom: 15 }}>LISTA DE COMPRAS</p>
                  {itemsList.map((item) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #e2e8f0' }}>
                      <div><span style={{ fontWeight: 900 }}>{item.qty}x</span> {item.name}</div>
                      <div style={{ display:'flex', alignItems:'center', gap: 15 }}>
                        <span style={{ fontWeight: 'bold', color: '#059669' }}>R$ {item.total.toFixed(2)}</span>
                        <button onClick={() => removerDoPedido(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', fontWeight: 900, fontSize: 20, marginTop: 10 }}>Total: R$ {totalGeral.toFixed(2)}</div>
                  <button onClick={() => setStep('identificacao')} style={btnStyle}>AVANÇAR PARA IDENTIFICAÇÃO</button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: WHATSAPP */}
          {step === 'identificacao' && (
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setStep('itens')} style={{ float: 'left', background: 'none', border: 'none', color: '#999' }}>← Voltar</button>
              <h3 style={{ fontWeight: 900, marginTop: 40 }}>Seu WhatsApp</h3>
              <p style={{ fontSize: 12, color: '#666', marginBottom: 20 }}>Para salvar seu pedido no sistema.</p>
              <input type="tel" placeholder="(00) 00000-0000" style={inputStyle} value={contact} onChange={e => setContact(e.target.value)} />
              <button onClick={handleIdentificacao} style={btnStyle}>CONTINUAR</button>
            </div>
          )}

          {/* STEP 3: NOME E APTO (COM MEMÓRIA) */}
          {step === 'dados' && (
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setStep('identificacao')} style={{ float: 'left', background: 'none', border: 'none', color: '#999' }}>← Voltar</button>
              <h3 style={{ fontWeight: 900, marginTop: 40 }}>Quase lá!</h3>
              <p style={{ fontSize: 13, fontWeight: 'bold', color: '#059669', marginBottom: 25 }}>📱 {contact}</p>
              
              <input placeholder="Seu Nome Completo" style={inputStyle} value={buyerName} onChange={e => setBuyerName(e.target.value)} />
              <input placeholder="Apto / Unidade" style={inputStyle} value={buyerApto} onChange={e => setBuyerApto(e.target.value)} />
              
              <button onClick={concluirPedido} style={btnStyle}>CONCLUIR E PAGAR</button>
            </div>
          )}

          {/* STEP 4: PIX E CONCLUÍDO */}
          {step === 'concluido' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ background: '#059669', color: 'white', padding: 20, borderRadius: 25, marginBottom: 20 }}>
                <p style={{ fontWeight: 900, margin: 0 }}>PEDIDO CONFIRMADO! ✅</p>
                <p style={{ fontSize: 12, opacity: 0.8 }}>Faça o Pix para garantir sua vaga.</p>
              </div>

              <div style={{ background: 'white', padding: 25, borderRadius: 30, border: '2px solid #f1f5f9', marginBottom: 20 }}>
                <QRCodeSVG value={campaign?.pix_key || ''} size={180} />
                <p style={{ fontWeight: 900, fontSize: 24, color: '#059669', margin: '15px 0' }}>R$ {totalGeral.toFixed(2)}</p>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, fontSize: 11, wordBreak: 'break-all', border: '1px solid #e2e8f0' }}>
                   <b>Chave Pix:</b><br/>{campaign?.pix_key}
                </div>
              </div>

              <div style={{ marginBottom: 25 }}>
                <p style={{ fontSize: 12, fontWeight: 'bold' }}>Envie o comprovante abaixo:</p>
                <input type="file" style={{ fontSize: 12 }} />
              </div>
              
              <button onClick={() => setStep('itens')} style={{ background: 'none', border: 'none', color: '#666', fontSize: 13, fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer' }}>ALTERAR PEDIDO</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}