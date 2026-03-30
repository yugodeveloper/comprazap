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
  const [showReport, setShowReport] = useState(false) // Estado para o Relatório

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

  useEffect(() => {
    fetchData()
    const channel = supabase
      .channel(`gestao-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `campaign_id=eq.${id}` }, () => {
        fetchData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  const handleStatus = async (orderId: string, newStatus: 'paid' | 'rejected') => {
    const confirmacao = newStatus === 'paid' 
      ? "Confirmar este pagamento?" 
      : "Rejeitar este comprovante?";

    if (!confirm(confirmacao)) return;

    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    }
  }

  // --- LÓGICA DO RELATÓRIO ---
  const pedidosPagos = orders.filter(o => o.status === 'paid');
  
  // Total de itens por tipo (para produção)
  const resumoProducao: Record<string, number> = {};
  pedidosPagos.forEach(order => {
    if (Array.isArray(order.selected_variations)) {
      order.selected_variations.forEach((item: any) => {
        resumoProducao[item.name] = (resumoProducao[item.name] || 0) + item.qty;
      });
    }
  });

  const cardStyle: React.CSSProperties = { backgroundColor: 'white', padding: '25px', borderRadius: '32px', border: '1px solid #f5f5f4', marginBottom: '15px' };
  const btnEmerald: React.CSSProperties = { width: '100%', padding: '18px', backgroundColor: '#059669', color: 'white', borderRadius: '50px', border: 'none', fontWeight: '900', fontSize: '12px', textTransform: 'uppercase', cursor: 'pointer', letterSpacing: '1px' };

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Carregando...</p></div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafaf9', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '450px', margin: '0 auto' }}>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', fontSize: '10px', fontWeight: '900', color: '#a8a29e', textTransform: 'uppercase' }}>← Voltar</button>
          <button onClick={() => setShowReport(!showReport)} style={{ fontSize: '9px', fontWeight: '900', backgroundColor: showReport ? '#ef4444' : '#059669', color: 'white', padding: '8px 15px', borderRadius: '50px', border: 'none' }}>
            {showReport ? 'FECHAR RELATÓRIO' : 'GERAR RELATÓRIO 📋'}
          </button>
        </header>

        {showReport ? (
          /* --- TELA DE RELATÓRIO DE ENTREGAS --- */
          <div style={{ animation: 'fadein 0.5s' }}>
            <div style={{ ...cardStyle, border: '2px solid #059669' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '900', fontStyle: 'italic', marginBottom: '20px' }}>Lista de Produção</h2>
              {Object.entries(resumoProducao).map(([name, qty]) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f5f5f4' }}>
                  <span style={{ fontWeight: 'bold' }}>{name}</span>
                  <span style={{ fontWeight: '900', color: '#059669' }}>{qty} un.</span>
                </div>
              ))}
            </div>

            <h2 style={{ fontSize: '10px', fontWeight: '900', color: '#a8a29e', textTransform: 'uppercase', margin: '30px 0 15px 15px' }}>Entregas por Morador</h2>
            {pedidosPagos.map(order => (
              <div key={order.id} style={{ ...cardStyle, padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f5f5f4', paddingBottom: '10px', marginBottom: '10px' }}>
                  <span style={{ fontWeight: '900' }}>{order.buyer_apto}</span>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#666' }}>{order.buyer_name}</span>
                </div>
                {Array.isArray(order.selected_variations) && order.selected_variations.map((item: any, idx: number) => (
                  <div key={idx} style={{ fontSize: '13px', padding: '2px 0' }}>• {item.qty}x {item.name}</div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          /* --- TELA DE GESTÃO NORMAL --- */
          <>
            <div style={{ ...cardStyle, textAlign: 'center' }}>
              <h1 style={{ fontSize: '24px', fontWeight: '900', fontStyle: 'italic', marginBottom: '20px' }}>{campaign?.title}</h1>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div style={{ backgroundColor: '#f5f5f4', padding: '15px', borderRadius: '20px' }}>
                  <p style={{ margin: 0, fontWeight: '900', fontSize: '18px' }}>{campaign?.views || 0}</p>
                  <p style={{ margin: 0, fontSize: '8px', fontWeight: '900', color: '#a8a29e' }}>VIEWS</p>
                </div>
                <div style={{ backgroundColor: '#f0fdf4', padding: '15px', borderRadius: '20px' }}>
                  <p style={{ margin: 0, fontWeight: '900', fontSize: '18px', color: '#059669' }}>{orders.length}</p>
                  <p style={{ margin: 0, fontSize: '8px', fontWeight: '900', color: '#a8a29e' }}>PEDIDOS</p>
                </div>
                <div style={{ backgroundColor: '#0c0a09', padding: '15px', borderRadius: '20px' }}>
                  <p style={{ margin: 0, fontWeight: '900', fontSize: '18px', color: 'white' }}>{pedidosPagos.length}</p>
                  <p style={{ margin: 0, fontSize: '8px', fontWeight: '900', color: '#a8a29e' }}>PAGOS</p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '30px' }}>
              {orders.map(order => (
                <div key={order.id} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: '900', fontSize: '15px' }}>{order.buyer_name}</p>
                      <p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', color: '#a8a29e' }}>{order.buyer_apto}</p>
                    </div>
                    <div style={{ fontSize: '9px', fontWeight: '900', padding: '5px 12px', borderRadius: '50px', backgroundColor: order.status === 'paid' ? '#dcfce7' : '#fef9c3', color: order.status === 'paid' ? '#166534' : '#854d0e' }}>
                      {order.status === 'paid' ? 'APROVADO' : 'PENDENTE'}
                    </div>
                  </div>

                  {order.receipt_url && (
                    <div onClick={() => setSelectedImg(order.receipt_url)} style={{ width: '80px', height: '80px', borderRadius: '15px', overflow: 'hidden', border: '2px solid #059669', cursor: 'pointer', marginBottom: '15px' }}>
                      <img src={order.receipt_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}

                  {order.status !== 'paid' && order.receipt_url && (
                    <button onClick={() => handleStatus(order.id, 'paid')} style={btnEmerald}>CONFIRMAR PAGAMENTO</button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* MODAL DA FOTO */}
        {selectedImg && (
          <div onClick={() => setSelectedImg(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <img src={selectedImg} style={{ maxWidth: '90%', maxHeight: '80%', borderRadius: '20px' }} />
          </div>
        )}

      </div>
    </div>
  )
}