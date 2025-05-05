'use client';

import { useState, useEffect } from 'react';

// Etapas de sincronização
const SYNC_STEPS = [
  { key: 'preparing', label: 'Preparando sincronização', icon: '🔄' },
  { key: 'connecting', label: 'Conectando às fontes de dados', icon: '🔌' },
  { key: 'extracting', label: 'Extraindo dados', icon: '📤' },
  { key: 'loading', label: 'Carregando no destino', icon: '📥' },
  { key: 'finalizing', label: 'Finalizando e verificando', icon: '✅' }
];

interface SyncProgressIndicatorProps {
  isVisible: boolean;
  currentStep?: string; // Chave da etapa atual
  error?: string; // Mensagem de erro, se houver
  onComplete?: () => void; // Callback quando finalizar todas as etapas
}

export default function SyncProgressIndicator({
  isVisible,
  currentStep,
  error,
  onComplete
}: SyncProgressIndicatorProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // Efeito para auto-avançar as etapas para simulação
  useEffect(() => {
    if (!isVisible) {
      // Resetar o estado quando não estiver visível
      setActiveStepIndex(0);
      setCompletedSteps([]);
      return;
    }

    // Se uma etapa atual foi especificada, atualizá-la
    if (currentStep) {
      const stepIndex = SYNC_STEPS.findIndex(step => step.key === currentStep);
      if (stepIndex >= 0) {
        setActiveStepIndex(stepIndex);
        
        // Marcar etapas anteriores como concluídas
        const previousSteps = SYNC_STEPS.slice(0, stepIndex).map(step => step.key);
        setCompletedSteps(previousSteps);
      }
      return;
    }

    // Modo de demonstração: avançar automaticamente pelo fluxo
    if (!error) {
      const interval = setInterval(() => {
        setActiveStepIndex(prevIndex => {
          const newIndex = prevIndex + 1;
          
          // Se chegou ao final, chamar callback de conclusão
          if (newIndex >= SYNC_STEPS.length) {
            clearInterval(interval);
            if (onComplete) onComplete();
            return prevIndex;
          }
          
          // Marcar a etapa anterior como concluída
          if (prevIndex >= 0 && prevIndex < SYNC_STEPS.length) {
            const stepKey = SYNC_STEPS[prevIndex]?.key;
            if (stepKey) {
              setCompletedSteps(prev => [...prev, stepKey]);
            }
          }
          
          return newIndex;
        });
      }, 2500); // Avançar a cada 2.5 segundos
      
      return () => clearInterval(interval);
    }
  }, [isVisible, currentStep, error, onComplete]);

  // Se não estiver visível, não renderizar nada
  if (!isVisible) return null;

  const progressPercentage = Math.min(
    100,
    ((activeStepIndex + (completedSteps.includes(SYNC_STEPS[activeStepIndex]?.key || '') ? 1 : 0.5)) / SYNC_STEPS.length) * 100
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          {error ? (
            <>
              <span className="text-red-500 mr-2">❌</span> 
              Erro na sincronização
            </>
          ) : (
            <>
              <span className="animate-spin inline-block mr-2">⚙️</span> 
              Sincronizando dados
            </>
          )}
        </h3>
        
        {/* Barra de progresso */}
        <div className="h-2 w-full bg-gray-200 rounded-full mb-6">
          <div 
            className={`h-full rounded-full transition-all duration-500 ease-in-out ${
              error ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        
        {/* Lista de etapas */}
        <ul className="space-y-3">
          {SYNC_STEPS.map((step, index) => {
            const isActive = index === activeStepIndex;
            const isCompleted = completedSteps.includes(step.key);
            
            return (
              <li 
                key={step.key}
                className={`flex items-center p-2 rounded transition-colors ${
                  isActive 
                    ? 'bg-blue-50 border-l-4 border-blue-500' 
                    : isCompleted 
                    ? 'text-gray-500'
                    : 'text-gray-400'
                }`}
              >
                <span className="mr-3 text-xl">
                  {isCompleted ? (
                    <span className="text-green-500">✓</span>
                  ) : isActive ? (
                    <span className={error ? 'text-red-500' : 'animate-pulse'}>{step.icon}</span>
                  ) : (
                    <span className="opacity-30">{step.icon}</span>
                  )}
                </span>
                <span>{step.label}</span>
                {isActive && !error && (
                  <span className="ml-auto animate-pulse">Em andamento</span>
                )}
              </li>
            );
          })}
        </ul>
        
        {/* Mensagem de erro */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}
        
        {/* Botão para fechar */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onComplete}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md"
          >
            {error ? 'Fechar' : 'Continuar em segundo plano'}
          </button>
        </div>
      </div>
    </div>
  );
}