'use client'

import { supabase } from '../../../lib/supabase'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function GestaoCampanha() {
  const params = useParams()
  const id = params?.id as string
  const router = useRouter()
  
  const [campaign, setCampaign] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImg, setSelectedImg] = useState<string | null>(null)
  const [showReport, setShowReport] = useState(false)

  const fetchData = async () => {
    if (!id) return
    try {
      const { data: cp } = await supabase.from('campaigns').select('*').eq('id', id).single()
      setCampaign(cp)
      
      const { data: ords } = await supabase
        .from('orders')
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })
      setOrders(ords || [])
    } catch (err) {
      console.error("Erro ao carregar gestão:", err)
    } finally {
      setLoading(false)
    }
  }

  // ITEM 6: Notificar Telegram quando comprovante chegar
  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel(`gestao-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `campaign_id=eq.${id}` }, (payload) => {
        if (payload.new.receipt_url && !payload.old.receipt_url) {
            // Se chegou comprovante novo, podemos disparar um alerta aqui se o Telegram do cliente não funcionou
            console.log("Novo comprovante detectado!");
        }
        fetchData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  const handleStatus = async (orderId: string, newStatus: 'paid' | 'rejected' | 'cancelled') => {
    const confirmacao = newStatus === 'paid' ? "Confirmar este pagamento?" : newStatus === 'rejected' ? "Rejeitar este comprovante?" : "Cancelar pedido?";
    if (!confirm(confirmacao)) return;

    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (!error) {
      fetchData();
    }
  }

  const getWhatsAppLink = (order: any) => {
    const cleanPhone = order.buyer_contact.replace(/\D/g, "");
    const campaignUrl = `${window.location.origin}/c/${id}?w=${cleanPhone}`;
    let message = "";

    if (order.status === 'paid') {
      message = `Olá ${order.buyer_name}! Recebi seu pagamento do *${campaign?.title}*. Tudo certo! Acompanhe por aqui: 👉 ${campaignUrl}`;
    } else if (order.status === 'rejected') {
      message = `Olá ${order.buyer_name}! Tivemos um problema com seu comprovante no *${campaign?.title}*. Poderia enviar novamente pelo link? 👉 ${campaignUrl}`;
    } else {
      message = `Olá ${order.buyer_name}! Vi que você iniciou um pedido no *${campaign?.title}*. Pode finalizar por aqui? 👉 ${campaignUrl}`;
    }

    return `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
  }

  const pedidosPagos = orders.filter(o => o.status === 'paid');
  
  const resumoProducao: Record<string, number> = {};
  pedidosPagos.forEach(order => {
    if (Array.isArray(order.selected_variations)) {
      order.selected_variations.forEach((item: any) => {
        resumoProducao[item.name] = (resumoProducao[item.name] || 0) + item.qty;
      });
    }
  });

  const cardStyle: React.CSSProperties = { backgroundColor: 'white', padding: '20px', borderRadius: '25px', border: '1px solid #f5f5f4', marginBottom: '15px' };
  const btnEmerald: React.CSSProperties = { width: '100%', padding: '14px', backgroundColor: '#059669', color: 'white', borderRadius: '50px', border: 'none', fontWeight: '900', fontSize: '11px', textTransform: 'uppercase', cursor: 'pointer' };

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Carregando Gestão...</p></div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafaf9', padding: '15px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '450px', margin: '0 auto' }}>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', fontSize: '10px', fontWeight: '900', color: '#a8a29e', textTransform: 'uppercase' }}>← Painel</button>
          <button onClick={() => setShowReport(!showReport)} style={{ fontSize: '9px', fontWeight: '900', backgroundColor: showReport ? '#ef4444' : '#059669', color: 'white', padding: '8px 15px', borderRadius: '50px', border: 'none' }}>
            {showReport ? 'FECHAR RELATÓRIO' : 'RELATÓRIO DE ENTREGAS 📋'}
          </button>
        </header>

        {showReport ? (
          <div style={{ animation: 'fadein 0.3s' }}>
            <div style={{ ...cardStyle, border: '2px solid #059669' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '900', marginBottom: '15px' }}>Lista de Produção</h2>
              {Object.entries(resumoProducao).map(([name, qty]) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f5f4' }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{name}</span>
                  <span style={{ fontWeight: '900', color: '#059669' }}>{qty} un.</span>
                </div>
              ))}
            </div>

            <h2 style={{ fontSize: '10px', fontWeight: '900', color: '#a8a29e', textTransform: 'uppercase', margin: '20px 0 10px 10px' }}>Roteiro de Entrega</h2>
            {pedidosPagos.map(order => (
              <div key={order.id} style={{ ...cardStyle, padding: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f5f5f4', paddingBottom: '8px', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '900', color: '#059669' }}>{order.buyer_apto}</span>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>{order.buyer_name}</span>
                </div>
                {Array.isArray(order.selected_variations) && order.selected_variations.map((item: any, idx: number) => (
                  <div key={idx} style={{ fontSize: '12px', padding: '2px 0' }}>• {item.qty}x {item.name}</div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <>
            <div style={{ ...cardStyle, textAlign: 'center' }}>
              <h1 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '15px' }}>{campaign?.title}</h1>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div style={{ backgroundColor: '#f5f5f4', padding: '10px', borderRadius: '15px' }}>
                  <p style={{ margin: 0, fontWeight: '900', fontSize: '16px' }}>{campaign?.views || 0}</p>
                  <p style={{ margin: 0, fontSize: '7px', fontWeight: '900', color: '#a8a29e' }}>VIEWS</p>
                </div>
                <div style={{ backgroundColor: '#f0fdf4', padding: '10px', borderRadius: '15px' }}>
                  <p style={{ margin: 0, fontWeight: '900', fontSize: '16px', color: '#059669' }}>{orders.filter(o => o.status !== 'cancelled').length}</p>
                  <p style={{ margin: 0, fontSize: '7px', fontWeight: '900', color: '#a8a29e' }}>PEDIDOS</p>
                </div>
                <div style={{ backgroundColor: '#0c0a09', padding: '10px', borderRadius: '15px' }}>
                  <p style={{ margin: 0, fontWeight: '900', fontSize: '16px', color: 'white' }}>{pedidosPagos.length}</p>
                  <p style={{ margin: 0, fontSize: '7px', fontWeight: '900', color: '#a8a29e' }}>PAGOS</p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px' }}>
              {orders.map(order => (
                <div key={order.id} style={{ ...cardStyle, opacity: order.status === 'cancelled' ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: '900', fontSize: '14px' }}>{order.buyer_name}</p>
                      <p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', color: '#a8a29e' }}>Unidade {order.buyer_apto}</p>
                      <a href={getWhatsAppLink(order)} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#059669', fontWeight: 'bold', textDecoration: 'none', display: 'block', marginTop: '4px' }}>📱 WhatsApp</a>
                    </div>
                    {/* ITEM 7: TRADUÇÃO DE STATUS */}
                    <div style={{ fontSize: '8px', fontWeight: '900', padding: '4px 10px', borderRadius: '50px', 
                      backgroundColor: order.status === 'paid' ? '#dcfce7' : order.status === 'rejected' ? '#fee2e2' : order.status === 'cancelled' ? '#f5f5f4' : '#fef9c3', 
                      color: order.status === 'paid' ? '#166534' : order.status === 'rejected' ? '#991b1b' : order.status === 'cancelled' ? '#a8a29e' : '#854d0e' }}>
                      {order.status === 'paid' ? 'PAGO' : order.status === 'rejected' ? 'RECUSADO' : order.status === 'cancelled' ? 'CANCELADO' : 'PENDENTE'}
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '12px', padding: '8px', backgroundColor: '#fafaf9', borderRadius: '10px' }}>
                    {Array.isArray(order.selected_variations) && order.selected_variations.map((v: any) => `${v.qty}x ${v.name}`).join(', ')}
                    {order.observations && <div style={{marginTop: 5, color: '#059669', fontStyle: 'italic'}}>📝 {order.observations}</div>}
                  </div>

                  {order.receipt_url && order.status !== 'cancelled' && (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                      <div onClick={() => setSelectedImg(order.receipt_url)} style={{ width: '60px', height: '60px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #059669', cursor: 'pointer' }}>
                        <img src={order.receipt_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Pix" />
                      </div>
                      <p style={{ fontSize: '9px', color: '#a8a29e' }}>Clique para ampliar</p>
                    </div>
                  )}

                  {order.status === 'pending' && order.receipt_url && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleStatus(order.id, 'paid')} style={btnEmerald}>CONFIRMAR PIX</button>
                      <button onClick={() => handleStatus(order.id, 'rejected')} style={{ ...btnEmerald, backgroundColor: '#ef4444', width: 'auto', padding: '14px 20px' }}>✖</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {selectedImg && (
          <div onClick={() => setSelectedImg(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <img src={selectedImg} style={{ maxWidth: '100%', maxHeight: '90%', borderRadius: '15px', boxShadow: '0 0 30px rgba(0,0,0,0.5)' }} />
          </div>
        )}

      </div>
    </div>
  )
}