#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { join } from 'path';
// Usar fetch nativo (disponível a partir do Node.js 18+)
// Se estiver usando uma versão anterior, será necessário instalar: npm i --save-dev @types/node-fetch node-fetch

// Carregar variáveis de ambiente do arquivo .env.local
config({ path: join(process.cwd(), '.env.local') });

/**
 * Script de diagnóstico para verificar a conexão com o Airbyte
 * Executa verificações básicas de conectividade e configuração
 */

async function main() {
  console.log('🔍 Verificador de Conexão Airbyte');
  console.log('================================');
  console.log();

  // 1. Verificar variáveis de ambiente
  const apiUrl = process.env.AIRBYTE_API_URL || 'http://localhost:8000/api/v1';
  const clientId = process.env.AIRBYTE_CLIENT_ID;
  const clientSecret = process.env.AIRBYTE_CLIENT_SECRET;

  console.log('1. Verificando configuração:');
  console.log(`   • URL da API: ${apiUrl}`);
  console.log(`   • Client ID: ${clientId ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`   • Client Secret: ${clientSecret ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log();

  if (!clientId || !clientSecret) {
    console.log('⚠️  AVISO: Credenciais Airbyte incompletas! Adicione as credenciais no arquivo .env.local');
    console.log('           Copie o arquivo .env.local.example para .env.local e preencha as credenciais');
  }

  // 2. Verificar se o serviço está acessível
  console.log('2. Testando conectividade com Airbyte:');
  try {
    const healthUrl = apiUrl.replace('/api/v1', '/health');
    console.log(`   • Verificando disponibilidade em ${healthUrl}`);
    
    // @ts-ignore - Node.js 18+ tem fetch global
    const healthResponse = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (healthResponse.ok) {
      console.log('   • ✅ Serviço Airbyte está online!');
    } else {
      console.log(`   • ❌ ERRO: Serviço Airbyte não está respondendo corretamente. Status: ${healthResponse.status}`);
      try {
        const errorText = await healthResponse.text();
        console.log(`     Resposta de erro: ${errorText}`);
      } catch {
        console.log('     Não foi possível obter detalhes do erro');
      }
    }
  } catch (error) {
    console.log(`   • ❌ ERRO: Não foi possível se conectar ao Airbyte`);
    console.log(`     Detalhes: ${error instanceof Error ? error.message : String(error)}`);
    console.log('     Verifique se o serviço Airbyte está em execução e acessível na URL configurada');
  }
  console.log();

  // 3. Tentar obter um token de autenticação
  if (clientId && clientSecret) {
    console.log('3. Testando autenticação:');
    try {
      console.log(`   • Solicitando token em ${apiUrl}/token`);
      
      // @ts-ignore - Node.js 18+ tem fetch global
      const tokenResponse = await fetch(`${apiUrl}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        console.log('   • ✅ Autenticação bem-sucedida!');
        console.log(`     Tipo: ${tokenData.token_type}`);
        console.log(`     Expira em: ${tokenData.expires_in} segundos`);
      } else {
        console.log(`   • ❌ ERRO: Falha na autenticação. Status: ${tokenResponse.status}`);
        try {
          const errorText = await tokenResponse.text();
          console.log(`     Resposta de erro: ${errorText}`);
        } catch {
          console.log('     Não foi possível obter detalhes do erro');
        }
        console.log('     Verifique se as credenciais (CLIENT_ID e CLIENT_SECRET) estão corretas');
      }
    } catch (error) {
      console.log(`   • ❌ ERRO: Falha ao solicitar autenticação`);
      console.log(`     Detalhes: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    console.log('3. Teste de autenticação ignorado (credenciais incompletas)');
  }
  console.log();

  // 4. Verificar configuração Docker
  console.log('4. Verificando configuração Docker:');
  const isDockerEnv = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost');
  console.log(`   • Ambiente Docker detectado: ${isDockerEnv ? '✅ Sim' : '❌ Não'}`);
  
  if (isDockerEnv && apiUrl.includes('localhost')) {
    console.log('   • ⚠️  AVISO: Se a aplicação está rodando em Docker e o Airbyte também,');
    console.log('              pode ser necessário substituir "localhost" por "host.docker.internal"');
    console.log(`     URL ajustada seria: ${apiUrl.replace('localhost', 'host.docker.internal')}`);
  }
  console.log();

  // 5. Sugestões
  console.log('5. Sugestões de resolução:');
  console.log('   • Certifique-se de que o Airbyte está rodando');
  console.log('   • Verifique se as credenciais estão corretas no .env.local');
  console.log('   • Verifique se a URL do Airbyte está acessível');
  console.log('   • Considere usar AIRBYTE_USE_MOCK=true para desenvolvimento sem Airbyte');
  console.log();

  console.log('Diagnóstico concluído!');
}

main().catch(err => {
  console.error('Erro no script de diagnóstico:', err);
  process.exit(1);
});