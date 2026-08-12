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
      <div key={item.id} className="relative bg-gray-900/80 border border-gray-700 rounded-xl overflow-hidden shadow-sm flex flex-col h-[280px] transition-all hover:border-gray-600">
        
        {/* Status Badge */}
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          {item.status === 'extracting' && <span className="bg-primary/90 text-white text-xs px-2 py-1 rounded shadow animate-pulse">Lendo...</span>}
          {item.status === 'prospecting' && <span className="bg-primary/90 text-white text-xs px-2 py-1 rounded shadow animate-pulse">Prospectando...</span>}
          {item.status === 'extracted' && <span className="bg-yellow-500 text-black font-bold text-xs px-2 py-1 rounded shadow">Pronto para Prospectar</span>}
          {item.status === 'done' && <span className="bg-success text-white text-xs px-2 py-1 rounded shadow">Concluído ✓</span>}
          {item.status === 'error' && <span className="bg-danger text-white text-xs px-2 py-1 rounded shadow">Erro</span>}
          {item.status === 'empty' && <span className="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded shadow">Vazio</span>}
          
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
              className="bg-red-500/80 hover:bg-red-500 text-white text-xs w-6 h-6 rounded flex items-center justify-center transition-colors"
            >
              ×
            </button>
          )}
        </div>

        {item.status === 'empty' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4 text-center border-2 border-dashed border-gray-700/50 m-2 rounded-lg bg-gray-900/40">
            <span className="text-3xl mb-2 opacity-50">📋</span>
            <span className="text-gray-400 text-sm">Cole a imagem (Ctrl+V)</span>
          </div>
        ) : (
          <>
            {/* Image Preview Area */}
            <div className="h-28 bg-black flex items-center justify-center border-b border-gray-800 relative">
               {item.imagePreview && <img src={item.imagePreview} alt="Print" className="h-full w-full object-cover opacity-60" />}
            </div>
            
            {/* Form / Data Area */}
            <div className="p-3 flex-1 overflow-y-auto flex flex-col gap-2">
              {item.status === 'extracting' || item.status === 'prospecting' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                  <span className="text-xs text-gray-400">{item.status === 'extracting' ? 'Analisando...' : 'Prospectando...'}</span>
                </div>
              ) : item.data ? (
                <>
                  <input 
                    className="bg-transparent border-b border-gray-700 text-sm font-semibold text-white px-1 py-1 w-full focus:border-primary outline-none" 
                    value={item.data.name || ''} 
                    onChange={e => updateItemData(index, 'name', e.target.value)}
                    placeholder="Nome da Empresa"
                    disabled={globalLoading || item.status === 'done'}
                  />
                  <input 
                    className="bg-transparent border-b border-gray-700 text-xs text-gray-300 px-1 py-1 w-full focus:border-primary outline-none" 
                    value={item.data.category || ''} 
                    onChange={e => updateItemData(index, 'category', e.target.value)}
                    placeholder="Nicho/Categoria"
                    disabled={globalLoading || item.status === 'done'}
                  />
                  <div className="flex gap-2">
                    <input 
                      className="bg-transparent border-b border-gray-700 text-xs text-gray-400 px-1 py-1 w-full focus:border-primary outline-none" 
                      value={item.data.city || ''} 
                      onChange={e => updateItemData(index, 'city', e.target.value)}
                      placeholder="Cidade"
                      disabled={globalLoading || item.status === 'done'}
                    />
                    <input 
                      className="bg-transparent border-b border-gray-700 text-xs text-yellow-400 px-1 py-1 w-12 text-center focus:border-primary outline-none" 
                      value={item.data.rating || ''} 
                      onChange={e => updateItemData(index, 'rating', e.target.value)}
                      placeholder="Nota"
                      title="Avaliações"
                      disabled={globalLoading || item.status === 'done'}
                    />
                  </div>
                  {item.error && <p className="text-danger text-xs mt-1 leading-tight">{item.error}</p>}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-xs text-gray-500">Imagem colada. Aguardando extração.</span>
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
      <div className="space-y-6">
        
        {/* Header Options */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-900/50 p-4 rounded-xl border border-gray-800">
          <div>
            <h3 className="text-white font-medium">Lote de Importação</h3>
            <p className="text-gray-400 text-sm">Quantas empresas deseja processar de uma vez?</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-300">Quantidade:</span>
            <select 
              value={batchSize} 
              onChange={e => handleBatchSizeChange(Number(e.target.value))}
              disabled={globalLoading}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-primary focus:border-primary block p-2 outline-none cursor-pointer"
            >
              {Array.from({ length: 14 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'empresa' : 'empresas'}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Loading UI */}
        {globalLoading && (
          <div className="flex flex-col items-center gap-4 w-full bg-black/20 p-6 rounded-2xl border border-primary/20">
            <PipelineUI 
              steps={globalPhase === 'extracting' ? IMAGE_STEPS : PROSPECT_STEPS} 
              currentStep={globalPhase === 'extracting' ? imageStep : prospectStep} 
              title={globalPhase === 'extracting' ? 'IA TRABALHANDO EM MASSA...' : 'CRIANDO PROSPECÇÕES...'} 
            />
            <button
              type="button"
              onClick={handleCancel}
              className="text-gray-400 hover:text-white text-sm font-medium transition-colors underline decoration-gray-600 underline-offset-4"
            >
              Cancelar Lote
            </button>
          </div>
        )}
        
        {/* Grid de Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((item, idx) => renderCard(item, idx))}
        </div>

        {/* Footer Actions */}
        <div className={`flex ${globalLoading ? 'justify-center' : 'justify-end gap-3'} mt-8 pt-6 border-t border-gray-800/60`}>
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
