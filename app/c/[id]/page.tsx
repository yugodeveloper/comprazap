import { supabase } from '../../lib/supabase'
import { Metadata } from 'next'
import { Suspense } from 'react'
import LandingContent from './LandingContent'

type Props = {
  params: { id: string }
}

// 1. GERADOR DE METADADOS (O QUE O WHATSAPP LÊ)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data: cp } = await supabase.from('campaigns').select('*').eq('id', params.id).single();

  if (!cp) return { title: 'CompraZap⚡' };

  return {
    title: cp.title,
    description: cp.description?.substring(0, 160),
    openGraph: {
      title: cp.title,
      description: cp.description?.substring(0, 160),
      images: [cp.share_image || cp.image_url || ''],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: cp.title,
      description: cp.description?.substring(0, 160),
      images: [cp.share_image || cp.image_url || ''],
    }
  }
}

// 2. COMPONENTE PRINCIPAL (SERVER SIDE)
export default async function LandingPage({ params }: Props) {
  // Busca os dados da campanha no servidor para passar para o cliente
  const { data: cp } = await supabase.from('campaigns').select('*').eq('id', params.id).single();
  
  return (
    <Suspense fallback={<div style={{textAlign:'center', marginTop:100, color: '#059669', fontWeight: 'bold'}}>Carregando Oferta...</div>}>
      <LandingContent initialCampaign={cp} id={params.id} />
    </Suspense>
  );
}