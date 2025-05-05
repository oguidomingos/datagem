#!/usr/bin/env node
/**
 * Script de teste para validar o carregamento e uso das definições Airbyte
 * 
 * Este script testa o carregamento das definições do cache e demonstra
 * o uso das funções utilitárias para buscar definições pelo nome.
 * 
 * Uso: npm run test-airbyte-definitions
 */

import { 
  loadDefinitions, 
  getSourceDefinitionByName, 
  getDestinationDefinitionByName 
} from '../lib/airbyte-client';

function main() {
  console.log('🧪 Testando sistema de cache de definições Airbyte...');
  
  try {
    // Carregar definições do cache
    const { sources, destinations } = loadDefinitions();
    
    console.log(`\n📊 Estatísticas de definições carregadas:`);
    console.log(`   - Sources: ${sources.length}`);
    console.log(`   - Destinations: ${destinations.length}`);
    
    // Testar busca de definições específicas
    const sourceExamples = ['Postgres', 'MySQL', 'WooCommerce', 'Google Ads'];
    const destExamples = ['Postgres', 'BigQuery', 'Snowflake'];
    
    console.log('\n🔍 Testando busca de definições de sources:');
    for (const name of sourceExamples) {
      const def = getSourceDefinitionByName(name);
      if (def) {
        console.log(`   ✅ ${name}: ${def.sourceDefinitionId} (${def.dockerRepository}:${def.dockerImageTag})`);
      } else {
        console.log(`   ❌ ${name}: Não encontrado`);
      }
    }
    
    console.log('\n🔍 Testando busca de definições de destinations:');
    for (const name of destExamples) {
      const def = getDestinationDefinitionByName(name);
      if (def) {
        console.log(`   ✅ ${name}: ${def.destinationDefinitionId} (${def.dockerRepository}:${def.dockerImageTag})`);
      } else {
        console.log(`   ❌ ${name}: Não encontrado`);
      }
    }
    
    console.log('\n✨ Teste concluído!');
    console.log('\nSe nenhuma definição foi encontrada, execute:');
    console.log('  npm run refresh-airbyte-definitions');
    console.log('\nPara atualizar o cache com as definições mais recentes da API Airbyte.');
    
  } catch (error) {
    console.error('\n❌ Erro durante o teste:');
    console.error(error);
    process.exit(1);
  }
}

// Executar o script
main();