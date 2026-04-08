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
  const [uploading, setUploading] = useState(false)
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
  const [isReady, setIsReady] = useState(false);

  const maskPhone = (v: string) => v.replace(/\D/g, "").replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").replace(/(-\d{4})(\d+?)$/, "$1");
  const copyPix = () => { if (campaign?.pix_key) { navigator.clipboard.writeText(campaign.pix_key); alert("Chave Pix copiada! ✅"); } };

  // Carrossel Infinito com Clones
  const gallery = campaign?.image_gallery || [];
  const loopItems = gallery.length > 1 ? [gallery[gallery.length - 1], ...gallery, gallery[0]] : gallery;

  useEffect(() => {
    if (gallery.length > 1 && scrollRef.current && !isReady) {
      scrollRef.current.scrollLeft = scrollRef.current.clientWidth;
      setIsReady(true);
    }
  }, [gallery, isReady]);

  const handleScroll = () => {
    if (scrollRef.current && gallery.length > 1) {
      const { scrollLeft, clientWidth, scrollWidth } = scrollRef.current;
      if (scrollLeft <= 0) scrollRef.current.scrollTo({ left: scrollWidth - (2 * clientWidth) });
      else if (scrollLeft >= scrollWidth - clientWidth) scrollRef.current.scrollTo({ left: clientWidth });
      const index = Math.round(scrollLeft / clientWidth) - 1;
      if (index >= 0 && index < gallery.length) setActiveIndex(index);
    }
  };

  useEffect(() => {
    if (gallery.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      if (scrollRef.current) scrollRef.current.scrollBy({ left: scrollRef.current.clientWidth, behavior: 'smooth' });
    }, 5000);
    return () => clearInterval(interval);
  }, [gallery, isPaused]);

  const navScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const width = scrollRef.current.clientWidth;
      scrollRef.current.scrollBy({ left: direction === 'right' ? width : -width, behavior: 'smooth' });
      setIsPaused(true); setTimeout(() => setIsPaused(false), 8000);
    }
  };

  // Logica de Dados
  useEffect(() => { if (id) fetchData(); }, [id]);
  
  async function fetchData() {
    try {
      if (!campaign) {
        const { data: cp } = await supabase.from('campaigns').select('*').eq('id', id).single();
        setCampaign(cp);
      }
      const { data: pd } = await supabase.from('products').select('*').eq('campaign_id', id).single();
      if (pd && pd.variations && typeof pd.variations === 'string') {
          pd.variations = pd.variations.split(',').map((v: string) => ({ name: v.trim(), price: pd.price || 0 }));
      }
      setProduct(pd);
      const { data: sl } = await supabase.from('profiles').select('*').eq('id', campaign?.creator_id || initialCampaign?.creator_id).single();
      setSeller(sl);
      const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('campaign_id', id).neq('status', 'cancelled');
      setTotalBuyers(count || 0);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  const identificarUsuario = async (phoneToAuth: string) => {
    if (!phoneToAuth || phoneToAuth.length < 10) return;
    setLoading(true);
    try {
      const { data: orders } = await supabase.from('orders').select('*').eq('campaign_id', id).eq('buyer_contact', phoneToAuth).order('created_at', { ascending: false });
      const { data: lastGlobalOrder } = await supabase.from('orders').select('buyer_name, buyer_apto').eq('buyer_contact', phoneToAuth).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (orders && orders.length > 0) {
        const pending = orders.find((o: any) => o.status !== 'paid' && o.status !== 'cancelled');
        setPastOrders(orders.filter((o: any) => o.status === 'paid')); 
        if (pending) {
          setExistingOrder(pending); setOrderStatus(pending.status); setObservations(pending.observations || '');
          setBuyerName(pending.buyer_name || ''); setBuyerApto(pending.buyer_apto || '');
          setItemsList(pending.selected_variations); setStep('concluido');
          setLoading(false); return;
        }
      }
      if (lastGlobalOrder) { setBuyerName(lastGlobalOrder.buyer_name || ''); setBuyerApto(lastGlobalOrder.buyer_apto || ''); }
      setStep('itens');
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const concluirPedido = async () => {
    if (!buyerName || !buyerApto) return alert("Preencha Nome e Unidade");
    setLoading(true);
    const orderData = { campaign_id: id, product_id: product.id, buyer_contact: contact, buyer_name: buyerName, buyer_apto: buyerApto, quantity: 1, selected_variations: itemsList, status: 'pending', observations };
    const { data: savedOrder } = await supabase.from('orders').upsert(existingOrder?.id ? { id: existingOrder.id, ...orderData } : orderData).select().single();
    setExistingOrder(savedOrder);
    // Notificação Telegram (Omitida aqui para brevidade, mas deve ser mantida se você tiver o código)
    setStep('concluido'); setLoading(false);
  };

  const handleCancelarCompra = async () => {
    if (!existingOrder || !confirm("Cancelar?")) return;
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', existingOrder.id);
    setExistingOrder(null); setItemsList([]); setStep('itens');
  };

  if (loading && !autoPhone) return <div style={{textAlign:'center', marginTop:100, fontWeight:'bold', color: '#059669'}}>Carregando...</div>

  return (
    <div style={{ backgroundColor: '#fafaf9', minHeight: '100vh' }}>
      <div style={{ maxWidth: '450px', margin: '0 auto', backgroundColor: 'white', minHeight: '100vh', boxShadow: '0 10px 15px rgba(0,0,0,0.1)', fontFamily: 'sans-serif' }}>
        <div style={{ height: '140px', position: 'relative', overflow: 'hidden', backgroundColor: '#eee' }}>
          {campaign?.image_url && <img src={campaign.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '15px 20px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', color: 'white' }}>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>{campaign?.title}</h1>
          </div>
        </div>

        <div style={{ padding: '15px 20px' }}>
          {gallery.length > 0 && (
            <div style={{ marginBottom: 25, position: 'relative' }}>
              <div ref={scrollRef} onScroll={handleScroll} onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)} onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)} style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', borderRadius: '25px', gap: 0 }}>
                {loopItems.map((img: string, i: number) => (
                  <div key={i} style={{ minWidth: '100%', height: '400px', scrollSnapAlign: 'start', flexShrink: 0, backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src={img} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>
                ))}
              </div>
              <button onClick={() => navScroll('left')} style={{ position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)', backgroundColor: 'white', border: '1px solid #eee', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', zIndex: 10 }}>‹</button>
              <button onClick={() => navScroll('right')} style={{ position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)', backgroundColor: 'white', border: '1px solid #eee', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', zIndex: 10 }}>›</button>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 15 }}>
                {gallery.map((_: any, i: number) => (
                  <div key={i} style={{ width: activeIndex === i ? 18 : 6, height: 6, borderRadius: '10px', backgroundColor: '#059669', opacity: activeIndex === i ? 1 : 0.2, transition: 'all 0.3s ease' }}></div>
                ))}
              </div>
            </div>
          )}

          <p style={{ whiteSpace: 'pre-wrap', color: '#475569', fontSize: 13, lineHeight: '1.5' }}>{campaign?.description}</p>

          {step === 'identificacao' && (
            <div style={{ textAlign: 'center', marginTop: 30 }}>
              <input type="tel" placeholder="WhatsApp" style={{ width: '100%', padding: '15px', borderRadius: '15px', border: '1px solid #ddd', textAlign: 'center', fontWeight: 'bold' }} value={contact} onChange={e => setContact(maskPhone(e.target.value))} />
              <button onClick={() => identificarUsuario(contact)} style={{ width: '100%', padding: '15px', backgroundColor: '#059669', color: 'white', borderRadius: '50px', border: 'none', fontWeight: '900', marginTop: 10 }}>ACESSAR OFERTA</button>
            </div>
          )}

          {step === 'itens' && (
            <div style={{ marginTop: 30 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                {product?.variations?.map((v: any, i: number) => (
                  <button key={i} onClick={() => setTempSelection(v)} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: '12px', backgroundColor: tempSelection?.name === v.name ? '#059669' : 'white', color: tempSelection?.name === v.name ? 'white' : 'black' }}>
                    {v.name}<br/><b>R$ {v.price}</b>
                  </button>
                ))}
              </div>
              <button onClick={() => { if(!tempSelection) return; setItemsList([...itemsList, { ...tempSelection, id: Date.now(), qty: 1, total: tempSelection.price }]); setTempSelection(null); }} style={{ width: '100%', padding: '15px', backgroundColor: 'black', color: 'white', borderRadius: '50px', marginTop: 20, fontWeight: 900 }}>ADICIONAR À LISTA</button>
              {itemsList.length > 0 && (
                <div style={{marginTop: 20, background: '#f0fdf4', padding: 15, borderRadius: 15}}>
                  {itemsList.map(it => <div key={it.id} style={{display:'flex', justifyContent:'space-between', marginBottom: 5}}><span>{it.name}</span><b>R$ {it.total}</b></div>)}
                  <button onClick={() => setStep('dados')} style={{ width: '100%', padding: '15px', backgroundColor: '#059669', color: 'white', borderRadius: '50px', marginTop: 15, fontWeight: 900 }}>PRÓXIMO PASSO</button>
                </div>
              )}
            </div>
          )}

          {step === 'dados' && (
            <div style={{ marginTop: 30 }}>
              <input placeholder="Nome" style={{ width: '100%', padding: '15px', borderRadius: '15px', border: '1px solid #ddd', marginBottom: 10 }} value={buyerName} onChange={e => setBuyerName(e.target.value)} />
              <input placeholder="Unidade" style={{ width: '100%', padding: '15px', borderRadius: '15px', border: '1px solid #ddd' }} value={buyerApto} onChange={e => setBuyerApto(e.target.value)} />
              <button onClick={concluirPedido} style={{ width: '100%', padding: '15px', backgroundColor: '#059669', color: 'white', borderRadius: '50px', marginTop: 20, fontWeight: 900 }}>CONFIRMAR PEDIDO</button>
            </div>
          )}

          {step === 'concluido' && (
            <div style={{ textAlign: 'center', marginTop: 30 }}>
              <QRCodeSVG value={campaign?.pix_key || ''} size={200} />
              <p style={{fontSize: 20, fontWeight: 900, color: '#059669', marginTop: 15}}>Total: R$ {itemsList.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}</p>
              <button onClick={copyPix} style={{ width: '100%', padding: '15px', backgroundColor: '#059669', color: 'white', borderRadius: '50px', border: 'none', fontWeight: '900' }}>COPIAR PIX</button>
              <button onClick={handleCancelarCompra} style={{background:'none', border:'none', color:'red', textDecoration:'underline', marginTop:20}}>Cancelar Pedido</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}