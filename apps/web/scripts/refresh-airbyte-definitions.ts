#!/usr/bin/env node
/**
 * Script para atualizar definições do Airbyte a partir da API
 * 
 * Este script busca todas as definições de sources e destinations
 * disponíveis da API do Airbyte e atualiza os arquivos de cache local.
 * 
 * Uso: npm run refresh-airbyte-definitions
 */

import { refreshDefinitions } from '../lib/airbyte-client';

async function main() {
  console.log('🚀 Iniciando atualização de definições Airbyte...');
  
  try {
    const { sources, destinations } = await refreshDefinitions();
    
    console.log('\n✅ Atualização concluída com sucesso!');
    console.log(`📦 ${sources.length} definições de sources salvas`);
    console.log(`📦 ${destinations.length} definições de destinations salvas`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro ao atualizar definições:');
    console.error(error);
    process.exit(1);
  }
}

// Executar o script
main();