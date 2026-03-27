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

  // --- CARREGAR DADOS ---
  const fetchData = async () => {
    if (!id) return
    try {
      // 1. Dados da Campanha (incluindo views)
      const { data: cp } = await supabase.from('campaigns').select('*').eq('id', id).single()
      setCampaign(cp)
      
      // 2. Todos os pedidos desta campanha
      const { data: ords } = await supabase
        .from('orders')
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })
      setOrders(ords || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    // Escuta em tempo real para novos pedidos ou comprovantes subidos
    const channel = supabase
      .channel(`gestao-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `campaign_id=eq.${id}` }, () => {
        fetchData()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  // --- AÇÕES DO VENDEDOR ---
  const handleStatus = async (orderId: string, newStatus: 'paid' | 'rejected' | 'pending') => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (!error) {
      // Opcional: Aqui podes disparar um fetch para o bot do Telegram avisar o cliente, 
      // mas o Realtime na LP já avisará o vizinho instantaneamente.
      fetchData()
    }
  }

  const totalPaid = orders.filter(o => o.status === 'paid').length
  const totalPending = orders.filter(o => o.status === 'pending').length

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black uppercase text-xs animate-pulse">Carregando Gestão...</div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <div className="max-w-md mx-auto p-6 space-y-8">
        
        {/* HEADER E MÉTRICAS */}
        <header className="space-y-6">
          <button onClick={() => router.push('/')} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 transition-all">
            ← Voltar ao Portal
          </button>
          
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
            <h1 className="text-2xl font-black italic tracking-tighter leading-tight mb-6">{campaign?.title}</h1>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-3xl">
                <p className="text-xl font-black">{campaign?.views || 0}</p>
                <p className="text-[8px] font-black uppercase text-slate-400">Visitas</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-3xl">
                <p className="text-xl font-black text-blue-600">{orders.length}</p>
                <p className="text-[8px] font-black uppercase text-slate-400">Pedidos</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-3xl">
                <p className="text-xl font-black text-green-600">{totalPaid}</p>
                <p className="text-[8px] font-black uppercase text-slate-400">Pagos</p>
              </div>
            </div>
          </div>
        </header>

        {/* LISTA DE PEDIDOS */}
        <section className="space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-2">
            Pedidos Recentes ({orders.length})
          </h2>

          {orders.length === 0 ? (
            <div className="bg-white p-12 rounded-[40px] text-center border-2 border-dashed border-slate-200">
              <p className="text-xs font-bold text-slate-400 italic">Nenhum pedido ainda. Divulgue o link!</p>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-black text-sm">{order.buyer_name}</p>
                    <p className="text-[10px] font-bold text-slate-400">{order.buyer_apto} • Qtd: {order.quantity}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${
                    order.status === 'paid' ? 'bg-green-100 text-green-600' : 
                    order.status === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                  }`}>
                    {order.status === 'paid' ? 'Pago' : order.status === 'rejected' ? 'Recusado' : 'Pendente'}
                  </span>
                </div>

                {/* COMPROVANTE */}
                {order.receipt_url ? (
                  <div className="space-y-3">
                    <a href={order.receipt_url} target="_blank" className="block w-full h-32 rounded-2xl overflow-hidden border border-slate-100">
                      <img src={order.receipt_url} className="w-full h-full object-cover" alt="Comprovante" />
                    </a>
                    
                    {order.status !== 'paid' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleStatus(order.id, 'paid')}
                          className="flex-1 bg-green-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-green-100"
                        >
                          ✅ Confirmar
                        </button>
                        <button 
                          onClick={() => handleStatus(order.id, 'rejected')}
                          className="flex-1 bg-red-50 text-red-500 py-3 rounded-xl font-black text-[10px] uppercase border border-red-100"
                        >
                          ❌ Recusar
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-3 px-4 bg-slate-50 rounded-xl text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase italic">Aguardando comprovante...</p>
                  </div>
                )}
              </div>
            ))
          )}
        </section>

      </div>
    </div>
  )
}