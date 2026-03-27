'use client'
import { supabase } from '../../../lib/supabase'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function GestaoCampanha() {
  const { id } = useParams()
  const [orders, setOrders] = useState<any[]>([])
  const [campaign, setCampaign] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchOrders = async () => {
      // 1. Pega o ID do usuário logado manualmente no Portal
      const userId = localStorage.getItem('user_id')
      
      // 2. Busca os dados da campanha
      const { data: cp } = await supabase.from('campaigns').select('*').eq('id', id).single()
      
      // 3. Segurança: Só permite acesso se for o criador da campanha
      if (!userId || cp?.creator_id !== userId) {
        alert("Acesso negado ou sessão expirada.")
        router.push('/')
        return
      }
      setCampaign(cp)

      // 4. Busca as ordens desta campanha
      // Agora buscamos o nome e unidade direto do perfil vinculado (profiles)
      const { data: ords } = await supabase
        .from('orders')
        .select(`
          *,
          profiles:buyer_contact (full_name, unit)
        `)
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })
      
      setOrders(ords || [])
      setLoading(false)
    }
    fetchOrders()
  }, [id, router])

  const toggleStatus = async (orderId: string, currentStatus: string) => {
    // Mantemos a lógica de toggle, mas usando o status 'paid' que o Webhook do Telegram usa
    const newStatus = currentStatus === 'pending' ? 'paid' : 'pending'
    
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (!error) {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    }
  }

  if (loading) return <div className="p-10 text-center text-black font-black uppercase tracking-widest animate-pulse">Carregando pedidos...</div>

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.push('/')} className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2 hover:text-slate-900 transition-colors">
          ← Voltar ao Portal
        </button>
        
        <header className="mb-8">
          <h1 className="text-4xl font-black italic tracking-tighter text-slate-900">{campaign?.title}</h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mt-2">Painel de Gestão • Lanai</p>
        </header>

        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="p-20 bg-white rounded-[40px] text-center border-2 border-dashed border-slate-200">
               <p className="text-slate-300 font-black text-sm uppercase">Nenhum pedido recebido ainda.</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 transition-all hover:shadow-md">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    {/* Exibe o nome do perfil se existir, senão o nome salvo na ordem */}
                    <h3 className="text-xl font-black text-slate-900 leading-tight">
                      {order.profiles?.full_name || order.buyer_name || 'Vizinho'}
                    </h3>
                    <p className="text-xs font-black text-blue-600 uppercase tracking-widest mt-1">
                      {order.profiles?.unit || order.buyer_apto || 'Unidade não informada'}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2">📦 CONTATO: {order.buyer_contact}</p>
                  </div>
                  
                  <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    order.status === 'paid' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'
                  }`}>
                    {order.status === 'paid' ? '✅ Pago' : '⏳ Pendente'}
                  </span>
                </div>

                <div className="flex gap-3">
                  {order.receipt_url && (
                    <a 
                      href={order.receipt_url} target="_blank" rel="noreferrer"
                      className="flex-1 bg-slate-100 text-slate-900 py-4 rounded-2xl text-[10px] font-black text-center uppercase tracking-widest hover:bg-slate-200 transition-all"
                    >
                      Ver Comprovante 📄
                    </a>
                  )}
                  <button 
                    onClick={() => toggleStatus(order.id, order.status)}
                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      order.status === 'paid' 
                      ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                      : 'bg-slate-900 text-white shadow-xl shadow-slate-100 hover:scale-[1.02]'
                    }`}
                  >
                    {order.status === 'paid' ? 'Desmarcar Pagamento' : 'Confirmar Pix'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}