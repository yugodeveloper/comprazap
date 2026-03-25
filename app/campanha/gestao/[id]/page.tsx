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
      const { data: { user } } = await supabase.auth.getUser()
      const { data: cp } = await supabase.from('campaigns').select('*').eq('id', id).single()
      
      if (!user || cp?.creator_id !== user.id) {
        router.push('/')
        return
      }
      setCampaign(cp)

      const { data: ords } = await supabase
        .from('orders')
        .select('*')
        .eq('campaign_id', id)
        .order('created_at', { ascending: false })
      
      setOrders(ords || [])
      setLoading(false)
    }
    fetchOrders()
  }, [id, router])

  const toggleStatus = async (orderId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'confirmed' : 'pending'
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
  }

  if (loading) return <div className="p-10 text-center text-black">Carregando pedidos...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.push('/')} className="text-blue-600 mb-6 font-bold flex items-center gap-2">
          ← Voltar ao Painel
        </button>
        
        <header className="mb-8">
          <h1 className="text-3xl font-black text-black">{campaign?.title}</h1>
          <p className="text-gray-500 font-medium">Gestão de Vendas - Lanai</p>
        </header>

        <div className="space-y-4">
          {orders.length === 0 && (
            <p className="text-center text-gray-400 py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
              Nenhuma reserva feita até o momento.
            </p>
          )}
          
          {orders.map((order) => (
            <div key={order.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-black text-black">{order.buyer_name || 'Vizinho Anônimo'}</h3>
                  <p className="text-sm text-blue-600 font-bold">{order.buyer_apto}</p>
                  <p className="text-xs text-gray-400 mt-1">Contato: {order.buyer_contact}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  order.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {order.status === 'confirmed' ? 'Pago' : 'Pendente'}
                </span>
              </div>

              <div className="flex gap-3">
                {order.receipt_url && (
                  <a 
                    href={order.receipt_url} target="_blank" rel="noreferrer"
                    className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl text-xs font-black text-center uppercase tracking-widest hover:bg-gray-200 transition-colors"
                  >
                    Ver Comprovante 📄
                  </a>
                )}
                <button 
                  onClick={() => toggleStatus(order.id, order.status)}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    order.status === 'confirmed' 
                    ? 'bg-red-50 text-red-600 border border-red-100' 
                    : 'bg-green-600 text-white shadow-lg shadow-green-100'
                  }`}
                >
                  {order.status === 'confirmed' ? 'Desmarcar Pagamento' : 'Confirmar Pix'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}