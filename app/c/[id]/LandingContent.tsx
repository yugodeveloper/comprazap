'use client'

import { supabase } from '../../lib/supabase'
import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'

export default function LandingContent({ initialCampaign, id }: { initialCampaign: any, id: string }) {
  const searchParams = useSearchParams()
  const autoPhone = searchParams.get('w')
  
  const [campaign, setCampaign] = useState<any>(initialCampaign)
  const [product, setProduct] = useState<any>(null)
  const [seller, setSeller] = useState<any>(null)
  const [loading, setLoading] = useState(true)
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const maskPhone = (v: string) => v.replace(/\D/g, "").replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").replace(/(-\d{4})(\d+?)$/, "$1");

  useEffect(() => { if (id) fetchData(); }, [id]);

  async function fetchData() {
    try {
      const { data: pd } = await supabase.from('products').select('*').eq('campaign_id', id).single();
      setProduct(pd);
      const { data: sl } = await supabase.from('profiles').select('*').eq('id', campaign?.creator_id).single();
      setSeller(sl);
      const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('campaign_id', id).neq('status', 'cancelled');
      setTotalBuyers(count || 0);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  const identificarUsuario = async (phoneToAuth: string) => {
    if (!phoneToAuth || phoneToAuth.length < 10) return;
    setLoading(true);
    const { data: orders } = await supabase.from('orders').select('*').eq('campaign_id', id).eq('buyer_contact', phoneToAuth).order('created_at', { ascending: false });
    if (orders && orders.length > 0) {
      const pending = orders.find((o: any) => o.status !== 'paid' && o.status !== 'cancelled');
      if (pending) { 
        setExistingOrder(pending); setOrderStatus(pending.status); setBuyerName(pending.buyer_name); setBuyerApto(pending.buyer_apto);
        setItemsList(pending.selected_variations); setStep('concluido');
      } else { setStep('itens'); }
    } else { setStep('itens'); }
    setLoading(false);
  };

  const concluirPedido = async () => {
    const orderData = { campaign_id: id, product_id: product.id, buyer_contact: contact, buyer_name: buyerName, buyer_apto: buyerApto, quantity: 1, selected_variations: itemsList, status: 'pending', observations };
    const { data } = await supabase.from('orders').upsert(existingOrder?.id ? { id: existingOrder.id, ...orderData } : orderData).select().single();
    setExistingOrder(data); setStep('concluido');
  };

  const gallery = campaign?.image_gallery || [];

  return (
    <div style={{ backgroundColor: '#fafaf9', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '450px', margin: '0 auto', backgroundColor: 'white' }}>
        <div style={{ height: '140px', position: 'relative', overflow: 'hidden' }}>
          {(campaign?.image_url || gallery[0]) && <img src={campaign?.image_url || gallery[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          <div style={{ position: 'absolute', bottom: 0, padding: '15px', background: 'linear-gradient(transparent, black)', color: 'white', width: '100%' }}>
            <h1 style={{ margin: 0, fontSize: 18 }}>{campaign?.title}</h1>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          {gallery.length > 0 && (
            <div style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', gap: 10, borderRadius: 15 }}>
              {gallery.map((img: any, i: number) => (
                <img key={i} src={img} style={{ minWidth: '100%', height: '350px', objectFit: 'contain', scrollSnapAlign: 'start', backgroundColor: '#f9f9f9' }} />
              ))}
            </div>
          )}

          <p style={{ marginTop: 20, whiteSpace: 'pre-wrap', color: '#444' }}>{campaign?.description}</p>

          {step === 'identificacao' && (
            <div style={{ textAlign: 'center', marginTop: 30 }}>
              <input type="tel" placeholder="WhatsApp" style={{ width: '100%', padding: '15px', borderRadius: '15px', border: '1px solid #ddd' }} value={contact} onChange={e => setContact(maskPhone(e.target.value))} />
              <button onClick={() => identificarUsuario(contact)} style={{ width: '100%', padding: '15px', backgroundColor: '#059669', color: 'white', borderRadius: '50px', border: 'none', fontWeight: '900', marginTop: 10 }}>ACESSAR OFERTA</button>
            </div>
          )}

          {step === 'itens' && (
            <div style={{ marginTop: 30 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {product?.variations?.map((v: any, i: number) => (
                  <button key={i} onClick={() => setTempSelection(v)} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '10px', backgroundColor: tempSelection?.name === v.name ? '#059669' : 'white', color: tempSelection?.name === v.name ? 'white' : 'black' }}>
                    {v.name} - R$ {v.price}
                  </button>
                ))}
              </div>
              <button onClick={() => setItemsList([...itemsList, { ...tempSelection, qty: 1, total: tempSelection.price }])} style={{ width: '100%', padding: '15px', backgroundColor: 'black', color: 'white', borderRadius: '50px', marginTop: 20 }}>ADICIONAR</button>
              {itemsList.length > 0 && <button onClick={() => setStep('dados')} style={{ width: '100%', padding: '15px', backgroundColor: '#059669', color: 'white', borderRadius: '50px', marginTop: 10 }}>PRÓXIMO PASSO</button>}
            </div>
          )}

          {step === 'dados' && (
            <div style={{ marginTop: 30 }}>
              <input placeholder="Seu Nome" style={{ width: '100%', padding: '15px', borderRadius: '15px', border: '1px solid #ddd', marginBottom: 10 }} value={buyerName} onChange={e => setBuyerName(e.target.value)} />
              <input placeholder="Unidade" style={{ width: '100%', padding: '15px', borderRadius: '15px', border: '1px solid #ddd' }} value={buyerApto} onChange={e => setBuyerApto(e.target.value)} />
              <button onClick={concluirPedido} style={{ width: '100%', padding: '15px', backgroundColor: '#059669', color: 'white', borderRadius: '50px', marginTop: 20 }}>CONFIRMAR PEDIDO</button>
            </div>
          )}

          {step === 'concluido' && (
            <div style={{ textAlign: 'center', marginTop: 30 }}>
              <h2>Pedido Realizado!</h2>
              <QRCodeSVG value={campaign?.pix_key} size={200} />
              <p>Valor: R$ {itemsList.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}