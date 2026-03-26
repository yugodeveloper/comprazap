import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Atenção: Use a Service Role Key aqui!
)

export async function POST(req: Request) {
  const body = await req.json()

  // Verifica se é um clique em botão (callback_query)
  if (body.callback_query) {
    const action = body.callback_query.data // "confirm_ID" ou "reject_ID"
    const [status, orderId] = action.split('_')
    const chatId = body.callback_query.message.chat.id
    const messageId = body.callback_query.message.message_id

    const novoStatus = status === 'confirm' ? 'paid' : 'rejected'
    const emoji = status === 'confirm' ? '✅' : '❌'

    // 1. Atualiza o Supabase
    const { error } = await supabase
      .from('orders')
      .update({ status: novoStatus })
      .eq('id', orderId)

    if (error) return NextResponse.json({ error: error.message })

    // 2. Edita a mensagem no Telegram para confirmar que você processou
    const textoFinal = body.callback_query.message.caption + `\n\n${emoji} *STATUS: ${novoStatus.toUpperCase()}*`
    
    await fetch(`https://api.telegram.org/bot${process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN}/editMessageCaption`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        caption: textoFinal,
        parse_mode: 'Markdown'
      })
    })
  }

  return NextResponse.json({ ok: true })
}