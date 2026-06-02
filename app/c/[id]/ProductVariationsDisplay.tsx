import React from 'react';

interface Variation {
  id: number;
  name: string;
  price: number;
}

interface ProductVariationsDisplayProps {
  product: { variations: Variation[] } | null;
  pastelColors: string[];
  tempSelection: Variation | null;
  setTempSelection: (variation: Variation) => void;
  isInteractive: boolean; // New prop to control interactivity
  tempQty: number;
  setTempQty: (qty: number | ((prevQty: number) => number)) => void;
  onAddItem: () => void;
}

const ProductVariationsDisplay: React.FC<ProductVariationsDisplayProps> = ({
  product,
  pastelColors,
  tempSelection,
  setTempSelection,
  isInteractive,
  tempQty,
  setTempQty,
  onAddItem,
}) => {
  if (!product?.variations || product.variations.length === 0) {
    return null;
  }

  return (
    <div style={{ background: 'white', padding: 15, borderRadius: 20, border: '1px solid #eee', marginBottom: '15px' }}>
      <p style={{ fontSize: 9, fontWeight: 900, color: '#999', marginBottom: 12, textAlign: 'center', textTransform: 'uppercase' }}>
        OPÇÕES DISPONÍVEIS
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {product.variations.map((v: Variation, index: number) => (
          <button
            key={index}
            onClick={() => isInteractive && setTempSelection(v)}
            disabled={!isInteractive}
            style={{
              padding: '10px 15px',
              borderRadius: '12px',
              border: tempSelection?.name === v.name ? '2px solid #059669' : '1px solid #e2e8f0',
              fontSize: '12px',
              fontWeight: 'bold',
              backgroundColor: tempSelection?.name === v.name ? '#059669' : pastelColors[index % pastelColors.length],
              color: tempSelection?.name === v.name ? 'white' : '#475569',
              transition: 'all 0.2s ease',
              minWidth: '120px',
              boxShadow: tempSelection?.name === v.name ? '0 4px 6px -1px rgba(5, 150, 105, 0.2)' : 'none',
              cursor: isInteractive ? 'pointer' : 'default',
              opacity: isInteractive ? 1 : 0.6,
            }}
          >
            {v.name}<br />
            <span style={{ fontSize: '13px', fontWeight: 900, color: tempSelection?.name === v.name ? 'white' : '#059669' }}>
              R$ {v.price}
            </span>
          </button>
        ))}
      </div>
      {isInteractive && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 25, marginTop: 20 }}>
            <button onClick={() => setTempQty(q => Math.max(1, q - 1))} style={{ width: 35, height: 35, borderRadius: '50%', border: '1px solid #ddd', background: 'white' }}>-</button>
            <span style={{ fontWeight: 900, fontSize: 18 }}>{tempQty}</span>
            <button onClick={() => setTempQty(q => q + 1)} style={{ width: 35, height: 35, borderRadius: '50%', border: '1px solid #ddd', background: 'white' }}>+</button>
          </div>
          <button onClick={onAddItem} style={{ width: '100%', padding: '14px', borderRadius: '50px', backgroundColor: '#000', color: 'white', fontWeight: '900', border: 'none', cursor: 'pointer', marginTop: '20px', fontSize: '13px' }}>
            ADICIONAR À LISTA
          </button>
        </>
      )}
    </div>
  );
};

export default ProductVariationsDisplay;