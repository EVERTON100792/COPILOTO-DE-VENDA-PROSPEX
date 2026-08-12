import { useState, useEffect, useRef } from 'react'
import { Modal, Button, Field } from './ui'
import { useApp } from '../services/store'
import { importFromMaps, extractDataFromImage } from '../services/mapsImport'

import type { ReactNode } from 'react'

const IMAGE_STEPS = [
  "Iniciando motores da IA...",
  "Lendo a imagem com Visão Computacional (OCR)...",
  "Analisando contexto e extraindo dados em lote...",
  "Finalizando estruturação JSON..."
]

const PROSPECT_STEPS = [
  "Validando dados das empresas...",
  "Buscando informações avançadas na Web...",
  "Avaliando nível de oportunidade (Lead Score)...",
  "Cadastrando todos no CRM..."
]

function PipelineUI({ steps, currentStep, title }: { steps: string[], currentStep: number, title: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', padding: '24px',
      background: 'var(--surface)', borderRadius: 'var(--radius)',
      border: '1px solid var(--border)', width: '100%',
      boxShadow: 'var(--shadow)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      transition: 'all 0.3s'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px',
        borderBottom: '1px dashed var(--border-soft)', paddingBottom: '16px'
      }}>
        <div style={{ position: 'relative', display: 'flex', width: '12px', height: '12px' }}>
          <div style={{
            position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
            background: 'var(--primary)', opacity: 0.75, animation: 'pulseDot 2s ease-in-out infinite'
          }}></div>
          <div style={{
            position: 'relative', width: '12px', height: '12px', borderRadius: '50%',
            background: 'var(--primary)', boxShadow: 'var(--primary-glow)'
          }}></div>
        </div>
        <span style={{
          color: 'var(--text)', fontWeight: 700, letterSpacing: '0.1em', fontSize: '13px',
          textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}>
          {title}
        </span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isDone = index < currentStep;
          return (
            <div key={index} style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              opacity: isDone || isActive ? 1 : 0.4,
              transform: isDone || isActive ? 'translateX(0)' : 'translateX(-12px)'
            }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                border: '2px solid', transition: 'all 0.5s', fontSize: '13px', fontWeight: 600,
                ...(isDone 
                  ? { background: 'var(--success-soft)', borderColor: 'var(--success)', color: 'var(--success)', boxShadow: '0 0 12px rgba(16, 185, 129, 0.2)' } 
                  : isActive
                  ? { background: 'var(--primary-soft)', borderColor: 'var(--primary)', color: 'var(--text)', boxShadow: 'var(--primary-glow)', transform: 'scale(1.15)' }
                  : { background: 'transparent', borderColor: 'var(--border)', color: 'var(--muted)' })
              }}>
                {isDone ? '✓' : isActive ? '⚡' : (index + 1)}
              </div>
              <span style={{
                fontSize: '14px', fontWeight: isActive ? 600 : 500, transition: 'color 0.5s',
                ...(isDone
                  ? { color: 'var(--muted)' }
                  : isActive
                  ? { color: 'var(--text)', textShadow: '0 0 10px rgba(255,255,255,0.3)' }
                  : { color: 'var(--muted-2)' })
              }}>
                {step}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export type BatchItemStatus = 'empty' | 'pasted' | 'extracting' | 'extracted' | 'prospecting' | 'done' | 'error';

export interface BatchItem {
  id: string;
  imagePreview: string | null;
  data: any | null;
  status: BatchItemStatus;
  error?: string;
}

interface MapsImportModalProps {
  open: boolean
  onClose: () => void
}

export function MapsImportModal({ open, onClose }: MapsImportModalProps) {
  const [batchSize, setBatchSize] = useState(1);
  const [items, setItems] = useState<BatchItem[]>([]);
  
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalPhase, setGlobalPhase] = useState<'idle' | 'extracting' | 'prospecting'>('idle');
  
  const [imageStep, setImageStep] = useState(0)
  const [prospectStep, setProspectStep] = useState(0)
  
  const cancelRef = useRef(false);
  const toast = useApp(s => s.toast);

  // Initialize/Reset
  useEffect(() => {
    if (!open) {
      cancelRef.current = true;
      setBatchSize(1);
      setItems([{ id: '0', imagePreview: null, data: null, status: 'empty' }]);
      setGlobalLoading(false);
      setGlobalPhase('idle');
      setImageStep(0);
      setProspectStep(0);
    } else {
      cancelRef.current = false;
      // Preenche com o batchSize atual (normalmente 1 na abertura)
      const newItems: BatchItem[] = [];
      for (let i = 0; i < batchSize; i++) {
        newItems.push({ id: i.toString(), imagePreview: null, data: null, status: 'empty' });
      }
      setItems(newItems);
    }
  }, [open]);

  // Adjust array when batchSize changes
  const handleBatchSizeChange = (newSize: number) => {
    setBatchSize(newSize);
    setItems(prev => {
      const newItems = [...prev];
      if (newItems.length < newSize) {
        for (let i = newItems.length; i < newSize; i++) {
          newItems.push({ id: Date.now().toString() + i, imagePreview: null, data: null, status: 'empty' });
        }
      } else if (newItems.length > newSize) {
        newItems.splice(newSize);
      }
      return newItems;
    });
  };

  // Pipeline intervals
  useEffect(() => {
    let interval: any;
    if (globalPhase === 'extracting') {
      setImageStep(0)
      interval = setInterval(() => {
        setImageStep(s => (s < IMAGE_STEPS.length - 1 ? s + 1 : s))
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [globalPhase])

  useEffect(() => {
    let interval: any;
    if (globalPhase === 'prospecting') {
      setProspectStep(0)
      interval = setInterval(() => {
        setProspectStep(s => (s < PROSPECT_STEPS.length - 1 ? s + 1 : s))
      }, 2500)
    }
    return () => clearInterval(interval)
  }, [globalPhase])

  // Handle Paste
  useEffect(() => {
    if (!open || globalLoading) return;

    const handlePaste = (e: ClipboardEvent) => {
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;
      
      for (const item of clipboardItems) {
        if (item.type.indexOf('image') === 0) {
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
              if (ev.target?.result) {
                const imgData = ev.target.result as string;
                setItems(prev => {
                  const newItems = [...prev];
                  const firstEmptyIndex = newItems.findIndex(x => x.status === 'empty');
                  if (firstEmptyIndex !== -1) {
                    newItems[firstEmptyIndex] = {
                      ...newItems[firstEmptyIndex],
                      imagePreview: imgData,
                      status: 'pasted'
                    };
                  } else {
                    toast('info', 'Todos os slots já estão preenchidos. Aumente o tamanho do lote se precisar de mais.');
                  }
                  return newItems;
                });
              }
            };
            reader.readAsDataURL(file);
          }
          break; // pega só a primeira imagem do clipboard
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [open, globalLoading, toast]);

  const processAllExtractions = async () => {
    const toProcess = items.filter(i => i.status === 'pasted');
    if (toProcess.length === 0) {
      toast('error', 'Cole ao menos uma imagem para extrair.');
      return;
    }

    cancelRef.current = false;
    setGlobalLoading(true);
    setGlobalPhase('extracting');

    const newItems = [...items];
    
    // Processamento sequencial
    for (let i = 0; i < newItems.length; i++) {
      if (cancelRef.current) break;
      if (newItems[i].status !== 'pasted' || !newItems[i].imagePreview) continue;

      newItems[i].status = 'extracting';
      setItems([...newItems]);

      try {
        const data = await extractDataFromImage(newItems[i].imagePreview!);
        if (cancelRef.current) break;
        newItems[i].data = data;
        newItems[i].status = 'extracted';
      } catch (err: any) {
        if (cancelRef.current) break;
        newItems[i].status = 'error';
        newItems[i].error = err.message || 'Erro ao processar';
      }
      setItems([...newItems]);
    }

    if (!cancelRef.current) {
      toast('success', 'Extração concluída! Revise e clique em Prospectar em Massa.');
      setGlobalLoading(false);
      setGlobalPhase('idle');
    }
  };

  const processAllProspecting = async () => {
    const toProcess = items.filter(i => i.status === 'extracted');
    if (toProcess.length === 0) {
      toast('error', 'Nenhuma empresa pronta para prospectar.');
      return;
    }

    cancelRef.current = false;
    setGlobalLoading(true);
    setGlobalPhase('prospecting');

    const newItems = [...items];

    for (let i = 0; i < newItems.length; i++) {
      if (cancelRef.current) break;
      if (newItems[i].status !== 'extracted' || !newItems[i].data) continue;

      newItems[i].status = 'prospecting';
      setItems([...newItems]);

      try {
        const d = newItems[i].data;
        const parsedRating = d.rating ? parseFloat(d.rating.replace(',', '.')) : undefined;
        const submitData = { ...d, rating: parsedRating };
        // Assume o nome vindo da IA; se não houver, coloca Sem Nome
        const result = await importFromMaps(d.name || 'Sem Nome', d.city || '', '', submitData);
        
        if (cancelRef.current) break;
        
        if (result.success) {
          newItems[i].status = 'done';
        } else {
          newItems[i].status = 'error';
          newItems[i].error = result.error;
        }
      } catch (err: any) {
        if (cancelRef.current) break;
        newItems[i].status = 'error';
        newItems[i].error = 'Erro inesperado';
      }
      setItems([...newItems]);
    }

    if (!cancelRef.current) {
      toast('success', 'Prospecção em massa finalizada!');
      setGlobalLoading(false);
      setGlobalPhase('idle');
      // Fecha o modal após 2 segundos de sucesso total
      setTimeout(() => onClose(), 2000);
    }
  };

  const handleCancel = () => {
    cancelRef.current = true;
    setGlobalLoading(false);
    setGlobalPhase('idle');
    toast('info', 'Processo em lote cancelado.');
  };

  const updateItemData = (index: number, field: string, value: string) => {
    setItems(prev => {
      const newItems = [...prev];
      if (newItems[index].data) {
        newItems[index].data = { ...newItems[index].data, [field]: value };
      }
      return newItems;
    });
  };

  // Helper para renderizar o card individual
  const renderCard = (item: BatchItem, index: number) => {
    return (
      <div key={item.id} style={{
        position: 'relative', background: 'var(--surface)', border: '1px solid var(--border)', 
        borderRadius: 'var(--radius-sm)', overflow: 'hidden', display: 'flex', flexDirection: 'column', 
        height: '280px', transition: 'all 0.3s'
      }}>
        
        {/* Status Badge */}
        <div style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10, display: 'flex', gap: '8px' }}>
          {item.status === 'extracting' && <span style={{ background: 'var(--primary)', color: '#fff', fontSize: '12px', padding: '4px 8px', borderRadius: '4px', boxShadow: 'var(--primary-glow)' }}>Lendo...</span>}
          {item.status === 'prospecting' && <span style={{ background: 'var(--primary)', color: '#fff', fontSize: '12px', padding: '4px 8px', borderRadius: '4px', boxShadow: 'var(--primary-glow)' }}>Prospectando...</span>}
          {item.status === 'extracted' && <span style={{ background: 'var(--warning)', color: '#000', fontWeight: 'bold', fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }}>Pronto para Prospectar</span>}
          {item.status === 'done' && <span style={{ background: 'var(--success)', color: '#fff', fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }}>Concluído ✓</span>}
          {item.status === 'error' && <span style={{ background: 'var(--danger)', color: '#fff', fontSize: '12px', padding: '4px 8px', borderRadius: '4px' }}>Erro</span>}
          {item.status === 'empty' && <span style={{ background: 'var(--surface-2)', color: 'var(--muted)', fontSize: '12px', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)' }}>Vazio</span>}
          
          {item.imagePreview && item.status !== 'empty' && item.status !== 'extracting' && item.status !== 'prospecting' && (
            <button 
              type="button"
              onClick={() => {
                setItems(prev => {
                  const arr = [...prev];
                  arr[index] = { ...arr[index], imagePreview: null, data: null, status: 'empty' };
                  return arr;
                });
              }}
              style={{ background: 'var(--danger)', color: '#fff', fontSize: '12px', width: '24px', height: '24px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
            >
              ×
            </button>
          )}
        </div>

        {item.status === 'empty' ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', textAlign: 'center', border: '2px dashed var(--border-soft)', margin: '8px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.2)' }}>
            <span style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>📋</span>
            <span style={{ color: 'var(--muted)', fontSize: '14px' }}>Cole a imagem (Ctrl+V)</span>
          </div>
        ) : (
          <>
            {/* Image Preview Area */}
            <div style={{ height: '112px', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border)', position: 'relative' }}>
               {item.imagePreview && <img src={item.imagePreview} alt="Print" style={{ height: '100%', width: '100%', objectFit: 'cover', opacity: 0.6 }} />}
            </div>
            
            {/* Form / Data Area */}
            <div style={{ padding: '12px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {item.status === 'extracting' || item.status === 'prospecting' ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <div style={{ width: '24px', height: '24px', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'pulseDot 1s linear infinite' }} />
                  <span style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>{item.status === 'extracting' ? 'Analisando...' : 'Prospectando...'}</span>
                </div>
              ) : item.data ? (
                <>
                  <input 
                    style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', fontSize: '14px', fontWeight: 600, color: 'var(--text)', padding: '4px', width: '100%', outline: 'none' }}
                    value={item.data.name || ''} 
                    onChange={e => updateItemData(index, 'name', e.target.value)}
                    placeholder="Nome da Empresa"
                    disabled={globalLoading || item.status === 'done'}
                  />
                  <input 
                    style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', fontSize: '12px', color: 'var(--muted)', padding: '4px', width: '100%', outline: 'none' }}
                    value={item.data.category || ''} 
                    onChange={e => updateItemData(index, 'category', e.target.value)}
                    placeholder="Nicho/Categoria"
                    disabled={globalLoading || item.status === 'done'}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', fontSize: '12px', color: 'var(--muted-2)', padding: '4px', width: '100%', outline: 'none' }}
                      value={item.data.city || ''} 
                      onChange={e => updateItemData(index, 'city', e.target.value)}
                      placeholder="Cidade"
                      disabled={globalLoading || item.status === 'done'}
                    />
                    <input 
                      style={{ background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', fontSize: '12px', color: 'var(--warning)', padding: '4px', width: '48px', textAlign: 'center', outline: 'none' }}
                      value={item.data.rating || ''} 
                      onChange={e => updateItemData(index, 'rating', e.target.value)}
                      placeholder="Nota"
                      title="Avaliações"
                      disabled={globalLoading || item.status === 'done'}
                    />
                  </div>
                  {item.error && <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px', lineHeight: 1.2 }}>{item.error}</p>}
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--muted-2)', textAlign: 'center' }}>Imagem colada. Aguardando extração.</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Extração Inteligente em Massa" wide>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Header Options */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', background: 'var(--surface-2)', padding: '16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '16px' }}>Lote de Importação</h3>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>Quantas empresas deseja processar de uma vez?</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text)' }}>Quantidade:</span>
            <select 
              value={batchSize} 
              onChange={e => handleBatchSizeChange(Number(e.target.value))}
              disabled={globalLoading}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '8px', borderRadius: 'var(--radius-sm)', outline: 'none', cursor: 'pointer' }}
            >
              {Array.from({ length: 14 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'empresa' : 'empresas'}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Loading UI */}
        {globalLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', background: 'rgba(0,0,0,0.2)', padding: '24px', borderRadius: 'var(--radius)', border: '1px solid var(--primary-soft)' }}>
            <PipelineUI 
              steps={globalPhase === 'extracting' ? IMAGE_STEPS : PROSPECT_STEPS} 
              currentStep={globalPhase === 'extracting' ? imageStep : prospectStep} 
              title={globalPhase === 'extracting' ? 'IA TRABALHANDO EM MASSA...' : 'CRIANDO PROSPECÇÕES...'} 
            />
            <button
              type="button"
              onClick={handleCancel}
              style={{ background: 'transparent', border: 'none', color: 'var(--muted)', textDecoration: 'underline', cursor: 'pointer', fontSize: '14px' }}
            >
              Cancelar Lote
            </button>
          </div>
        )}
        
        {/* Grid de Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
          {items.map((item, idx) => renderCard(item, idx))}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: globalLoading ? 'center' : 'flex-end', gap: '12px', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-soft)' }}>
          {!globalLoading && (
            <>
              <Button type="button" variant="secondary" onClick={onClose} disabled={globalLoading}>
                Cancelar
              </Button>
              
              {items.some(i => i.status === 'pasted') && (
                <Button type="button" variant="primary" onClick={processAllExtractions} disabled={globalLoading} className="shadow-lg shadow-primary/20">
                  ✨ Extrair em Massa
                </Button>
              )}
              
              {items.some(i => i.status === 'extracted') && (
                <Button type="button" variant="primary" onClick={processAllProspecting} disabled={globalLoading} className="bg-success hover:bg-green-600 shadow-lg shadow-success/20">
                  🚀 Confirmar e Prospectar em Massa
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
