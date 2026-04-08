import { supabase } from '../../lib/supabase'
import { Metadata } from 'next'
import { Suspense } from 'react'
import LandingContent from './LandingContent'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const { data: cp } = await supabase.from('campaigns').select('*').eq('id', params.id).single();
  if (!cp) return { title: 'CompraZap⚡' };

  return {
    title: cp.title,
    description: cp.description?.substring(0, 160),
    openGraph: {
      title: cp.title,
      description: cp.description?.substring(0, 160),
      images: [{ url: cp.share_image || cp.image_url || '', width: 800, height: 1000 }],
      type: 'website',
    }
  }
}

export default async function LandingPage({ params }: { params: { id: string } }) {
  const { data: cp } = await supabase.from('campaigns').select('*').eq('id', params.id).single();
  return (
    <Suspense fallback={<div style={{textAlign:'center', marginTop:100}}>Carregando...</div>}>
      <LandingContent initialCampaign={cp} id={params.id} />
    </Suspense>
  );
}