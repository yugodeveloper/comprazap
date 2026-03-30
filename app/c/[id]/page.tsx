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
  
  // Fluxo de Identidade
  const [contact, setContact] = useState('')
  const [identified, setIdentified] = useState(false)
  const [existingOrder, setExistingOrder] = useState<any>(null)
  const [pastOrders, setPastOrders] = useState<any[]>([])
  const [buyerName, setBuyerName] = useState('')
  const [buyerApto, setBuyerApto] = useState('')

  // Interface de Seleção
  const [step, setStep] = useState<'montagem' | 'concluido'>('montagem')
  const [tempSelection, setTempSelection] = useState<any>(null) // {name, price}
  const [tempQty, setTempQty] = useState(1)
  const [itemsList, setItemsList] = useState<any[]>([])

  // Estilos Inline
  const containerStyle: React.CSSProperties = { maxWidth: '450px', margin: '0 auto', backgroundColor: 'white', minHeight: '100vh', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', fontFamily: 'sans-serif', paddingBottom: '80px' };
  const btnStyle: React.CSSProperties = { width: '100%', padding: '18px', borderRadius: '50px', backgroundColor: '#059669', color: 'white', fontWeight: '900', border: 'none', cursor: 'pointer', marginTop: '10px' };

  useEffect(() => { if (id) fetchData(); }, [id]);

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

  // --- LÓGICA DO CARRINHO ---
  const adicionarAoPedido = () => {
    if (!tempSelection) return alert("Selecione um tamanho/tipo primeiro!");
    const novoItem = {
      id: Date.now(),
      name: tempSelection.name,
      price: tempSelection.price,
      qty: tempQty,
      total: tempSelection.price * tempQty
    };
    setItemsList([...itemsList, novoItem]);
    setTempQty(1); // Reseta para o próximo
  };

  const removerDoPedido = (itemId: number) => {
    setItemsList(itemsList.filter(i => i.id !== itemId));
  };

  const totalGeral = itemsList.reduce((acc, curr) => acc + curr.total, 0);

  const verificarIdentidade = async () => {
    if (contact.length < 10) return alert("WhatsApp inválido");
    setLoading(true);
    const { data: orders } = await supabase.from('orders').select('*').eq('campaign_id', id).eq('buyer_contact', contact);
    if (orders && orders.length > 0) {
      const pending = orders.find((o: any) => o.status !== 'paid');
      if (pending) {
        setExistingOrder(pending);
        setBuyerName(pending.buyer_name);
        setBuyerApto(pending.buyer_apto);
        if (Array.isArray(pending.selected_variations)) setItemsList(pending.selected_variations);
      }
      setPastOrders(orders.filter((o: any) => o.status === 'paid'));
    }
    setIdentified(true);
    setLoading(false);
  };

  const concluirPedido = async () => {
    if (itemsList.length === 0) return alert("Seu pedido está vazio!");
    if (!buyerName || !buyerApto) return alert("Preencha seu nome e apto");
    setLoading(true);
    const orderData = {
      campaign_id: id, product_id: product.id, buyer_contact: contact,
      buyer_name: buyerName, buyer_apto: buyerApto, quantity: 1,
      selected_variations: itemsList, status: 'pending'
    };
    if (existingOrder) await supabase.from('orders').update(orderData).eq('id', existingOrder.id);
    else {
      const { data } = await supabase.from('orders').insert(orderData).select().single();
      setExistingOrder(data);
    }
    setStep('concluido');
    setLoading(false);
  };

  if (loading) return <div style={{textAlign:'center', marginTop:50}}>Carregando...</div>

  return (
    <div style={{ backgroundColor: '#fafaf9', minHeight: '100vh' }}>
      <div style={containerStyle}>
        
        {/* HEADER */}
        <div style={{ height: '200px', backgroundColor: '#eee', overflow: 'hidden', position: 'relative' }}>
          <img src={campaign?.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', color: 'white' }}>
            <h1 style={{ margin: 0, fontSize: 22, fontStyle: 'italic', fontWeight: 900 }}>{campaign?.title}</h1>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          
          {step === 'montagem' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* SELEÇÃO DO PRODUTO */}
              <div style={{ background: 'white', padding: 15, borderRadius: 20, border: '1px solid #eee' }}>
                <p style={{ fontSize: 10, fontWeight: 900, color: '#999', marginBottom: 10 }}>1. ESCOLHA O TAMANHO/TIPO</p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {product?.variations?.map((v: any, index: number) => (
                    <button 
                      key={index}
                      onClick={() => setTempSelection(v)}
                      style={{ 
                        padding: '10px 15px', borderRadius: 10, border: '1px solid #ddd', fontSize: 12, fontWeight: 'bold',
                        backgroundColor: tempSelection?.name === v.name ? '#059669' : 'white',
                        color: tempSelection?.name === v.name ? 'white' : '#666'
                      }}
                    >
                      {v.name} - R$ {v.price}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                    <button onClick={() => setTempQty(q => Math.max(1, q-1))} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #ddd' }}>-</button>
                    <span style={{ fontWeight: 900 }}>{tempQty}</span>
                    <button onClick={() => setTempQty(q => q+1)} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #ddd' }}>+</button>
                  </div>
                  <button onClick={adicionarAoPedido} style={{ backgroundColor: '#000', color: 'white', padding: '10px 20px', borderRadius: 10, border: 'none', fontWeight: 'bold', fontSize: 12 }}>
                    ADICIONAR +
                  </button>
                </div>
              </div>

              {/* LISTA DO CARRINHO */}
              {itemsList.length > 0 && (
                <div style={{ background: '#f8fafc', padding: 20, borderRadius: 20 }}>
                  <p style={{ fontSize: 10, fontWeight: 900, color: '#999', marginBottom: 15 }}>SEU PEDIDO</p>
                  {itemsList.map((item) => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 13 }}>
                        <span style={{ fontWeight: 900 }}>{item.qty}x</span> {item.name}
                        <div style={{ fontSize: 10, color: '#059669', fontWeight: 'bold' }}>R$ {item.total.toFixed(2)}</div>
                      </div>
                      <button onClick={() => removerDoPedido(item.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', fontSize: 16 }}>✕</button>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', fontWeight: 900, fontSize: 18, marginTop: 10 }}>Total: R$ {totalGeral.toFixed(2)}</div>
                </div>
              )}

              {/* IDENTIFICAÇÃO E CONCLUSÃO */}
              <div style={{ borderTop: '1px solid #eee', paddingTop: 20 }}>
                {!identified ? (
                  <>
                    <input type="tel" placeholder="Seu WhatsApp" style={{ width: '100%', padding: 15, borderRadius: 15, border: '1px solid #ddd', textAlign: 'center', marginBottom: 10, boxSizing: 'border-box' }} value={contact} onChange={e => setContact(e.target.value)} />
                    <button onClick={verificarIdentidade} style={btnStyle}>IDENTIFICAR</button>
                  </>
                ) : (
                  <>
                    <input placeholder="Seu Nome" style={{ width: '100%', padding: 15, borderRadius: 15, border: '1px solid #ddd', marginBottom: 10, boxSizing: 'border-box' }} value={buyerName} onChange={e => setBuyerName(e.target.value)} />
                    <input placeholder="Apto" style={{ width: '100%', padding: 15, borderRadius: 15, border: '1px solid #ddd', marginBottom: 15, boxSizing: 'border-box' }} value={buyerApto} onChange={e => setBuyerApto(e.target.value)} />
                    <button onClick={concluirPedido} style={btnStyle}>CONCLUIR PEDIDO</button>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* PASSO: CONCLUÍDO (PAGAMENTO) */
            <div style={{ textAlign: 'center', animation: 'fade-in 0.5s' }}>
              <div style={{ background: '#059669', color: 'white', padding: 20, borderRadius: 20, marginBottom: 20 }}>
                <p style={{ fontWeight: 900, margin: 0 }}>PEDIDO REALIZADO!</p>
                <p style={{ fontSize: 12, opacity: 0.8 }}>Agora é só fazer o Pix para confirmar.</p>
              </div>

              <div style={{ background: 'white', padding: 20, borderRadius: 30, border: '1px solid #eee', marginBottom: 20 }}>
                <QRCodeSVG value={campaign?.pix_key || ''} size={150} />
                <p style={{ fontWeight: 900, fontSize: 22, color: '#059669', margin: '15px 0' }}>R$ {totalGeral.toFixed(2)}</p>
                <p style={{ fontSize: 10, color: '#999', marginBottom: 10 }}>Clique para copiar a chave:</p>
                <div style={{ background: '#f1f5f9', padding: 10, borderRadius: 10, fontSize: 10, wordBreak: 'break-all', fontWeight: 'bold' }}>{campaign?.pix_key}</div>
              </div>

              <input type="file" style={{ fontSize: 12, marginBottom: 20 }} />
              
              <button onClick={() => setStep('montagem')} style={{ background: 'none', border: 'none', color: '#666', fontSize: 12, fontWeight: 'bold', textDecoration: 'underline' }}>EDITAR PEDIDO</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}