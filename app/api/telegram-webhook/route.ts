import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  if (!supabaseServiceKey) {
    console.error("SERVICE ROLE KEY faltando!");
    return NextResponse.json({ error: "Configuração incompleta" }, { status: 500 });
  }

  const body = await req.json()

  if (body.callback_query) {
    const action = body.callback_query.data // "approve_ID" ou "reject_ID"
    const [status, orderId] = action.split('_')
    const chatId = body.callback_query.message.chat.id
    const messageId = body.callback_query.message.message_id

    // Suporta tanto 'confirm' quanto 'approve' vindo do botão
    const isApproved = status === 'confirm' || status === 'approve';
    const novoStatus = isApproved ? 'paid' : 'rejected'
    const emoji = isApproved ? '✅' : '❌'

    // 1. Atualiza o Supabase
    const { error } = await supabase
      .from('orders')
      .update({ status: novoStatus })
      .eq('id', orderId)

    if (error) return NextResponse.json({ error: error.message })

    // 2. Edita a legenda da FOTO (Caption) no Telegram
    const oldCaption = body.callback_query.message.caption || ''
    const textoFinal = oldCaption + `\n\n${emoji} *STATUS: ${novoStatus.toUpperCase()}*`
    
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