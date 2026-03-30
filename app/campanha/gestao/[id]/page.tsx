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
  const [selectedImg, setSelectedImg] = useState<string | null>(null) // Para o Modal da foto

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
      : "Rejeitar este comprovante? O vizinho será avisado para enviar outro.";

    if (!confirm(confirmacao)) return;

    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    } else {
      alert("Erro ao atualizar status: " + error.message)
    }
  }

  // --- ESTILOS FIXOS ANTI-CACHE ---
  const cardStyle: React.CSSProperties = { backgroundColor: 'white', padding: '25px', borderRadius: '32px', border: '1px solid #f5f5f4', marginBottom: '15px' };
  const badgeStyle = (status: string): React.CSSProperties => ({
    fontSize: '9px', fontWeight: '900', padding: '5px 12px', borderRadius: '50px', textTransform: 'uppercase',
    backgroundColor: status === 'paid' ? '#dcfce7' : status === 'rejected' ? '#fee2e2' : '#fef9c3',
    color: status === 'paid' ? '#166534' : status === 'rejected' ? '#991b1b' : '#854d0e'
  });

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' }}>
      <p style={{ fontWeight: '900', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '3px', color: '#059669' }}>Carregando Painel...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafaf9', padding: '20px', fontFamily: 'sans-serif', color: '#1c1917' }}>
      <div style={{ maxWidth: '450px', margin: '0 auto' }}>
        
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', fontSize: '10px', fontWeight: '900', color: '#a8a29e', textTransform: 'uppercase', cursor: 'pointer' }}>← Voltar</button>
          <span style={{ fontSize: '9px', fontWeight: '900', backgroundColor: '#0c0a09', color: 'white', padding: '6px 15px', borderRadius: '50px', textTransform: 'uppercase', letterSpacing: '1px' }}>Gestão de Vendas</span>
        </header>

        {/* MÉTRICAS GOURMET */}
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '900', fontStyle: 'italic', margin: '0 0 20px 0', color: '#0c0a09' }}>{campaign?.title}</h1>
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
              <p style={{ margin: 0, fontWeight: '900', fontSize: '18px', color: 'white' }}>{orders.filter(o => o.status === 'paid').length}</p>
              <p style={{ margin: 0, fontSize: '8px', fontWeight: '900', color: '#a8a29e' }}>PAGOS</p>
            </div>
          </div>
        </div>

        {/* LISTA DE PEDIDOS */}
        <div style={{ marginTop: '30px' }}>
          <h2 style={{ fontSize: '10px', fontWeight: '900', color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '2px', paddingLeft: '15px', marginBottom: '15px' }}>Pedidos Recentes</h2>
          
          {orders.map(order => (
            <div key={order.id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '15px' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: '900', fontSize: '15px' }}>{order.buyer_name}</p>
                  <p style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', color: '#a8a29e' }}>{order.buyer_apto} • {new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <div style={badgeStyle(order.status)}>
                  {order.status === 'paid' ? 'Aprovado' : order.status === 'rejected' ? 'Recusado' : 'Pendente'}
                </div>
              </div>

              {/* LISTA DE ITENS DO PEDIDO (Novo formato de lista) */}
              <div style={{ backgroundColor: '#fafaf9', padding: '12px', borderRadius: '15px', marginBottom: '15px' }}>
                 {Array.isArray(order.selected_variations) ? order.selected_variations.map((item: any, idx: number) => (
                    <div key={idx} style={{ fontSize: '11px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{item.qty}x {item.name}</span>
                        <span>R$ {item.total?.toFixed(2)}</span>
                    </div>
                 )) : <p style={{ fontSize: '11px' }}>Pedido: {order.quantity} un.</p>}
              </div>

              {order.receipt_url ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* MINIATURA DO COMPROVANTE */}
                  <div 
                    onClick={() => setSelectedImg(order.receipt_url)}
                    style={{ width: '80px', height: '80px', borderRadius: '15px', overflow: 'hidden', border: '2px solid #059669', cursor: 'pointer', position: 'relative' }}
                  >
                    <img src={order.receipt_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Comprovante" />
                    <div style={{ position: 'absolute', bottom: 0, width: '100%', background: 'rgba(5, 150, 105, 0.8)', color: 'white', fontSize: '8px', textAlign: 'center', fontWeight: '900', padding: '2px 0' }}>VER FOTO</div>
                  </div>
                  
                  {order.status !== 'paid' && (
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button 
                        onClick={() => handleStatus(order.id, 'paid')}
                        style={{ flex: 1, backgroundColor: '#059669', color: 'white', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900', fontSize: '11px', textTransform: 'uppercase', cursor: 'pointer' }}
                      >
                        Confirmar
                      </button>
                      <button 
                        onClick={() => handleStatus(order.id, 'rejected')}
                        style={{ backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', padding: '15px', borderRadius: '15px', fontWeight: '900', fontSize: '11px', textTransform: 'uppercase', cursor: 'pointer' }}
                      >
                        Recusar
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: '15px', backgroundColor: '#fafaf9', borderRadius: '15px', textAlign: 'center', border: '1px dashed #e7e5e4' }}>
                  <p style={{ margin: 0, fontSize: '9px', fontWeight: '900', color: '#d6d3d1', textTransform: 'uppercase' }}>Aguardando Pix...</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* MODAL LIGHTBOX PARA A FOTO */}
        {selectedImg && (
          <div 
            onClick={() => setSelectedImg(null)}
            style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
          >
            <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '80%' }}>
              <img src={selectedImg} style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }} />
              <p style={{ color: 'white', textAlign: 'center', fontWeight: '900', marginTop: '15px', fontSize: '12px' }}>CLIQUE PARA FECHAR</p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}