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

  const fetchData = async () => {
    if (!id) return
    try {
      // Busca a campanha para pegar as Views
      const { data: cp } = await supabase.from('campaigns').select('*').eq('id', id).single()
      setCampaign(cp)
      
      // Busca as ordens
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
    // Realtime para o vendedor ver os pedidos chegando
    const channel = supabase
      .channel(`gestao-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `campaign_id=eq.${id}` }, () => {
        fetchData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  // --- AÇÃO DE MODERAR PAGAMENTO ---
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
      // Atualiza a lista local imediatamente
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    } else {
      alert("Erro ao atualizar status: " + error.message)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <p className="font-black text-[10px] uppercase tracking-widest animate-pulse">Carregando Painel...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <div className="max-w-md mx-auto p-6 space-y-8">
        
        <header className="flex justify-between items-center">
          <button onClick={() => router.push('/')} className="text-[10px] font-black uppercase text-slate-400">← Voltar</button>
          <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded-full uppercase tracking-tighter">Painel do Vendedor</span>
        </header>

        {/* CARD DE MÉTRICAS */}
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
          <h1 className="text-2xl font-black italic tracking-tighter mb-6">{campaign?.title}</h1>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-4 rounded-3xl text-center">
              <p className="text-xl font-black">{campaign?.views || 0}</p>
              <p className="text-[8px] font-black text-slate-400 uppercase">Visitas</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-3xl text-center">
              <p className="text-xl font-black text-blue-600">{orders.length}</p>
              <p className="text-[8px] font-black text-slate-400 uppercase">Pedidos</p>
            </div>
            <div className="bg-green-50 p-4 rounded-3xl text-center">
              <p className="text-xl font-black text-green-600">{orders.filter(o => o.status === 'paid').length}</p>
              <p className="text-[8px] font-black text-slate-400 uppercase">Pagos</p>
            </div>
          </div>
        </div>

        {/* LISTA DE PEDIDOS */}
        <div className="space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Moderação de Pagamentos</h2>
          
          {orders.map(order => (
            <div key={order.id} className="bg-white p-6 rounded-[32px] border border-slate-100 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-black text-sm">{order.buyer_name}</p>
                  <p className="text-[10px] font-bold text-slate-400">{order.buyer_apto} • Un: {order.quantity}</p>
                </div>
                <div className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${
                  order.status === 'paid' ? 'bg-green-100 text-green-600' : 
                  order.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                }`}>
                  {order.status === 'paid' ? 'Pago' : order.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                </div>
              </div>

              {order.receipt_url ? (
                <div className="space-y-4">
                  <a href={order.receipt_url} target="_blank" className="block w-full h-40 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
                    <img src={order.receipt_url} className="w-full h-full object-cover" alt="Comprovante" />
                  </a>
                  
                  {order.status !== 'paid' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleStatus(order.id, 'paid')}
                        className="flex-1 bg-green-600 text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-green-100"
                      >
                        Confirmar
                      </button>
                      <button 
                        onClick={() => handleStatus(order.id, 'rejected')}
                        className="px-6 bg-red-50 text-red-500 py-4 rounded-xl font-black text-[10px] uppercase"
                      >
                        Recusar
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-4 bg-slate-50 rounded-2xl text-center">
                  <p className="text-[9px] font-black text-slate-300 uppercase italic">Aguardando comprovante...</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}