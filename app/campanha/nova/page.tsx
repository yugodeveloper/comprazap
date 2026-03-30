'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function NovaCampanha() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // Campos Principais
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [maxSales, setMaxSales] = useState('50')
  const [imageUrl, setImageUrl] = useState('')

  // LISTA DE VARIAÇÕES (Tipos e Preços)
  const [variations, setVariations] = useState([{ name: '', price: '' }])

  const addVariation = () => {
    setVariations([...variations, { name: '', price: '' }])
  }

  const removeVariation = (index: number) => {
    const newVars = variations.filter((_, i) => i !== index)
    setVariations(newVars)
  }

  const updateVariation = (index: number, field: 'name' | 'price', value: string) => {
    const newVars = [...variations]
    newVars[index][field] = value
    setVariations(newVars)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const userId = localStorage.getItem('user_id')
      if (!userId) throw new Error("Usuário não identificado. Faça login novamente.")

      // 1. Criar a Campanha
      const { data: camp, error: campErr } = await supabase
        .from('campaigns')
        .insert({
          title,
          description,
          pix_key: pixKey,
          expires_at: expiresAt,
          max_sales: parseInt(maxSales),
          image_url: imageUrl,
          creator_id: userId,
          status: 'active'
        })
        .select()
        .single()

      if (campErr) throw campErr

      // 2. Formatar Variações para JSON
      const formattedVariations = variations.map(v => ({
        name: v.name,
        price: parseFloat(v.price.replace(',', '.'))
      }))

      // 3. Criar o Produto (Usando o preço da primeira variação como base)
      const { error: prodErr } = await supabase
        .from('products')
        .insert({
          campaign_id: camp.id,
          name: title,
          price: formattedVariations[0].price,
          variations: formattedVariations 
        })

      if (prodErr) throw prodErr

      alert("Campanha lançada! 🚀")
      router.push('/')
    } catch (err: any) {
      alert("Erro: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Estilos Inline para evitar erro de build
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '15px', backgroundColor: 'white', borderRadius: '15px',
    border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', boxSizing: 'border-box'
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '450px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '25px' }}>
        
        <header style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <h1 style={{ fontSize: '18px', fontWeight: '900', fontStyle: 'italic', margin: 0 }}>Criar Oferta ⚡</h1>
        </header>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* INFO PRODUTO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Informações</label>
            <input placeholder="Título (ex: Cuca de Maçã)" required style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} />
            <textarea placeholder="Descrição rápida..." required style={{ ...inputStyle, height: '80px', resize: 'none' }} value={description} onChange={e => setDescription(e.target.value)} />
            <input placeholder="Link da foto do produto" style={inputStyle} value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
          </div>

          {/* TABELA DE PREÇOS DINÂMICA */}
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '25px', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '15px', textAlign: 'center' }}>Tipos, Tamanhos e Preços</label>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {variations.map((v, index) => (
                <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    placeholder="Ex: Grande / 1Kg" 
                    required 
                    style={{ ...inputStyle, padding: '10px', fontSize: '12px' }}
                    value={v.name}
                    onChange={(e) => updateVariation(index, 'name', e.target.value)}
                  />
                  <input 
                    placeholder="R$" 
                    required 
                    style={{ ...inputStyle, padding: '10px', fontSize: '12px', width: '80px', fontWeight: 'bold', color: '#059669' }}
                    value={v.price}
                    onChange={(e) => updateVariation(index, 'price', e.target.value)}
                  />
                  {variations.length > 1 && (
                    <button type="button" onClick={() => removeVariation(index)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                  )}
                </div>
              ))}
            </div>
            
            <button 
              type="button" 
              onClick={addVariation}
              style={{ width: '100%', marginTop: '15px', padding: '10px', border: '2px dashed #e2e8f0', borderRadius: '12px', backgroundColor: 'transparent', color: '#94a3b8', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', cursor: 'pointer' }}
            >
              + Adicionar Opção
            </button>
          </div>

          {/* CONFIGS FINAIS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', marginBottom: '5px', display: 'block' }}>DATA LIMITE</label>
                <input type="date" required style={inputStyle} value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
              </div>
              <div style={{ width: '100px' }}>
                <label style={{ fontSize: '9px', fontWeight: '900', color: '#94a3b8', marginBottom: '5px', display: 'block' }}>ESTOQUE</label>
                <input type="number" required style={inputStyle} value={maxSales} onChange={e => setMaxSales(e.target.value)} />
              </div>
            </div>
            <input placeholder="Chave Pix para Receber" required style={inputStyle} value={pixKey} onChange={e => setPixKey(e.target.value)} />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', padding: '20px', backgroundColor: '#059669', color: 'white', 
              borderRadius: '50px', border: 'none', fontWeight: '900', fontSize: '16px', 
              cursor: 'pointer', boxShadow: '0 10px 15px rgba(5, 150, 105, 0.2)',
              marginTop: '10px'
            }}
          >
            {loading ? 'PUBLICANDO...' : 'LANÇAR NO GRUPO 🚀'}
          </button>

        </form>
      </div>
    </div>
  )
}