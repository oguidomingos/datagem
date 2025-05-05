#!/usr/bin/env node
/**
 * Script temporário para buscar definições do Airbyte usando credenciais específicas
 *
 * ATENÇÃO: Este script contém credenciais e deve ser substituído
 * por uma solução que use variáveis de ambiente.
 */

import {
  configureAirbyteClient,
  refreshDefinitions
} from '../lib/airbyte-client';

// Credenciais temporárias
const AIRBYTE_CLIENT_ID = 'b2032060-54c5-44fd-b6c9-a86a34a0006c';
const AIRBYTE_CLIENT_SECRET = '0jJO7g7RB2Uf2WEtdPHgLWTLrCseL6Q3';
const AIRBYTE_API_URL = 'http://localhost:8000/api/v1';

async function main() {
  console.log('🚀 Iniciando busca de definições Airbyte com credenciais temporárias...');
  
  try {
    // Configurar cliente com credenciais temporárias
    configureAirbyteClient({
      apiUrl: AIRBYTE_API_URL,
      clientId: AIRBYTE_CLIENT_ID,
      clientSecret: AIRBYTE_CLIENT_SECRET
    });
    
    console.log('Cliente Airbyte configurado com credenciais temporárias');
    
    // Usar a função do cliente para buscar e salvar definições
    const { sources, destinations } = await refreshDefinitions();
    
    console.log('\n✅ Definições salvas com sucesso!');
    console.log(`📦 ${sources.length} definições de sources`);
    console.log(`📦 ${destinations.length} definições de destinations`);
    
    console.log('\n⚠️ LEMBRETE: Este script usa credenciais temporárias e deve ser substituído');
    console.log('   por uma solução que use variáveis de ambiente.');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro ao buscar ou salvar definições:');
    console.error(error);
    process.exit(1);
  }
}

// Executar o script
main();