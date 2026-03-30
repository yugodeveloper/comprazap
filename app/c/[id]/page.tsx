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
  
  const [contact, setContact] = useState('')
  const [identified, setIdentified] = useState(false)
  const [existingOrder, setExistingOrder] = useState<any>(null)
  const [pastOrders, setPastOrders] = useState<any[]>([])

  const [buyerName, setBuyerName] = useState('')
  const [buyerApto, setBuyerApto] = useState('')
  
  // NOVA LÓGICA: Objeto que guarda { "Nome da Cuca": quantidade }
  const [cart, setCart] = useState<Record<string, number>>({})

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
    
    if (pd && pd.variations) {
      if (typeof pd.variations === 'string') {
        pd.variations = pd.variations.split(',').map((v: string) => ({
          name: v.trim(),
          price: pd.price || 0
        }));
      }
    } else if (pd) {
      pd.variations = [{ name: pd.name, price: pd.price || 0 }];
    }
    setProduct(pd);

    const { data: sl } = await supabase.from('profiles').select('*').eq('id', cp?.creator_id).single();
    setSeller(sl);
    setLoading(false);
  }

  // Função para alterar quantidade no carrinho
  const updateCart = (itemName: string, delta: number) => {
    setCart(prev => {
      const currentQty = prev[itemName] || 0;
      const newQty = Math.max(0, currentQty + delta);
      return { ...prev, [itemName]: newQty };
    });
  };

  // Cálculo do Total Geral
  const calculateTotal = () => {
    if (!product?.variations) return 0;
    return product.variations.reduce((acc: number, v: any) => {
      return acc + (v.price * (cart[v.name] || 0));
    }, 0);
  };

  const totalGeral = calculateTotal();

  const verificarIdentidade = async () => {
    if (contact.length < 10) return alert("Digite um WhatsApp válido");
    setLoading(true);

    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('campaign_id', id)
      .eq('buyer_contact', contact);

    if (orders && orders.length > 0) {
      const pending = orders.find((o: any) => o.status !== 'paid');
      const paid = orders.filter((o: any) => o.status === 'paid');
      
      if (pending) {
        setExistingOrder(pending);
        setBuyerName(pending.buyer_name);
        setBuyerApto(pending.buyer_apto);
        // Se for o formato novo de carrinho (objeto), carrega. Se não, ignora.
        if (pending.selected_variations && typeof pending.selected_variations === 'object') {
          setCart(pending.selected_variations);
        }
      }
      setPastOrders(paid);
    }
    setIdentified(true);
    setLoading(false);
  };

  const handleSalvarReserva = async () => {
    if (totalGeral === 0) return alert("Selecione pelo menos um item");
    setLoading(true);
    
    const orderData = {
      campaign_id: id,
      product_id: product.id,
      buyer_contact: contact,
      buyer_name: buyerName,
      buyer_apto: buyerApto,
      quantity: 1, // A quantidade agora é controlada dentro do objeto 'cart'
      selected_variations: cart, // Enviamos o objeto { "Cuca": 2, ... }
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
      alert("Pedido atualizado com sucesso! 🚀");
    }
    setLoading(false);
  };

  if (loading) return <div style={{textAlign:'center', marginTop:'50px', fontWeight: 'bold'}}>Carregando CompraZap...</div>

  return (
    <div style={{ backgroundColor: '#fafaf9', minHeight: '100vh' }}>
      <div style={containerStyle}>
        
        {/* HEADER */}
        <div style={{ position: 'relative', height: '250px', overflow: 'hidden' }}>
          <img src={campaign?.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Capa" />
          <div style={{ position: 'absolute', bottom: 15, left: 15, right: 15, background: 'rgba(255,255,255,0.8)', padding: 15, borderRadius: 20, backdropFilter: 'blur(5px)' }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{campaign?.title}</h1>
            <p style={{ margin: 0, fontSize: 10, color: '#666' }}>EXPIRA EM: {campaign?.expires_at ? new Date(campaign.expires_at).toLocaleDateString() : '...'}</p>
          </div>
        </div>

        <div style={{ padding: 25 }}>
          <p style={{ color: '#444', fontSize: 14, marginBottom: 25 }}>{campaign?.description}</p>

          {/* LISTA DE ITENS COM CONTROLE DE QUANTIDADE */}
          <div style={{ marginBottom: 25 }}>
            <h3 style={{ fontSize: 10, fontWeight: 900, color: '#999', textTransform: 'uppercase', marginBottom: 15 }}>Escolha seus itens:</h3>
            
            {product?.variations?.map((v: any, index: number) => (
              <div 
                key={index} 
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '15px 0', borderBottom: '1px solid #f1f1f1'
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 'bold', fontSize: 14 }}>{v.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#059669', fontWeight: '900' }}>R$ {v.price}</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button 
                    onClick={() => updateCart(v.name, -1)}
                    style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #ddd', backgroundColor: 'white', fontWeight: 'bold' }}
                  > - </button>
                  
                  <span style={{ fontWeight: 900, fontSize: 16, minWidth: '20px', textAlign: 'center' }}>
                    {cart[v.name] || 0}
                  </span>

                  <button 
                    onClick={() => updateCart(v.name, 1)}
                    style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #ddd', backgroundColor: 'white', fontWeight: 'bold' }}
                  > + </button>
                </div>
              </div>
            ))}
          </div>

          {/* TOTALIZADOR FIXO */}
          {totalGeral > 0 && (
            <div style={{ backgroundColor: '#f0fdf4', padding: 15, borderRadius: 15, marginBottom: 20, border: '1px solid #dcfce7', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'bold', fontSize: 12, color: '#166534' }}>TOTAL DO PEDIDO</span>
              <span style={{ fontWeight: '900', fontSize: 16, color: '#166534' }}>R$ {totalGeral.toFixed(2)}</span>
            </div>
          )}

          {/* IDENTIFICAÇÃO */}
          {!identified ? (
            <div style={{ textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
              <p style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 10 }}>Identifique-se com seu WhatsApp para confirmar:</p>
              <input 
                type="tel" placeholder="(00) 00000-0000" 
                style={{ width: '100%', padding: 15, borderRadius: 15, border: '1px solid #ddd', textAlign: 'center', boxSizing: 'border-box' }}
                value={contact} onChange={e => setContact(e.target.value)}
              />
              <button onClick={verificarIdentidade} style={btnStyle}>CONTINUAR</button>
            </div>
          ) : (
            <div>
              <div style={{ opacity: existingOrder?.status === 'paid' ? 0.6 : 1 }}>
                <input placeholder="Seu Nome" style={{ width: '100%', padding: 12, marginBottom: 10, borderRadius: 10, border: '1px solid #ddd', boxSizing: 'border-box' }} value={buyerName} onChange={e => setBuyerName(e.target.value)} />
                <input placeholder="Apto" style={{ width: '100%', padding: 12, marginBottom: 10, borderRadius: 10, border: '1px solid #ddd', boxSizing: 'border-box' }} value={buyerApto} onChange={e => setBuyerApto(e.target.value)} />

                <button onClick={handleSalvarReserva} style={btnStyle}>
                  {existingOrder ? 'ALTERAR PEDIDO' : 'CONFIRMAR PEDIDO'}
                </button>
              </div>

              {/* PIX */}
              {existingOrder && (
                <div style={{ marginTop: 30, padding: 20, backgroundColor: '#f8fafc', borderRadius: 25, border: '2px dashed #cbd5e1', textAlign: 'center' }}>
                   <p style={{ fontWeight: 900, fontSize: 14 }}>PAGAMENTO PIX</p>
                   <QRCodeSVG value={campaign?.pix_key || ''} size={150} style={{ margin: '15px 0' }} />
                   <p style={{ fontSize: 20, fontWeight: 900, color: '#059669' }}>R$ {totalGeral.toFixed(2)}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}