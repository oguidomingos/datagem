# Configuração do Airbyte para o Projeto

Este guia explica como configurar corretamente o Airbyte para funcionar com este projeto.

## Pré-requisitos

- Docker e Docker Compose instalados
- Airbyte rodando em `localhost:8000` (ou outro endereço configurável)
- Credenciais de API do Airbyte (Client ID e Client Secret)

## Configuração Básica

### 1. Preparar variáveis de ambiente

Copie o arquivo de exemplo para criar seu arquivo de variáveis de ambiente:

```bash
cp .env.local.example .env.local
```

Edite o arquivo `.env.local` e preencha as seguintes variáveis:

```
AIRBYTE_API_URL=http://localhost:8000/api/v1
AIRBYTE_CLIENT_ID=seu_client_id_aqui
AIRBYTE_CLIENT_SECRET=seu_client_secret_aqui
SUPABASE_DB_PASSWORD=sua_senha_supabase_aqui
```

### 2. Obter Credenciais do Airbyte

1. Acesse sua instância Airbyte em [http://localhost:8000](http://localhost:8000)
2. Navegue até **Configurações > Credenciais da API**
3. Crie uma nova chave de API ou copie uma existente
4. Anote o Client ID e o Client Secret

### 3. Verificar Conexão

Execute o script de verificação para testar se a configuração está correta:

```bash
npx ts-node apps/web/scripts/check-airbyte-connection.ts
```

## Resolução de Problemas

### Erro ao criar workspace no Airbyte

Este erro pode ocorrer pelos seguintes motivos:

1. **Credenciais Incorretas**: Verifique se o CLIENT_ID e CLIENT_SECRET estão corretos

2. **Airbyte Inacessível**: Verifique se o Airbyte está rodando e acessível na URL configurada

3. **Problemas de Rede**: Se estiver usando Docker, pode ser necessário substituir `localhost` por `host.docker.internal` na URL do Airbyte

4. **Permissões Insuficientes**: Verifique se as credenciais têm permissão para criar workspaces

### Logs Detalhados

Para obter logs mais detalhados, verifique:

1. O console do navegador para erros de rede
2. Os logs do servidor Next.js para erros de API
3. Os logs do Airbyte para problemas no servidor

## Ambiente de Desenvolvimento sem Airbyte

Para desenvolver sem uma instância real do Airbyte, você pode habilitar o modo de simulação:

```
AIRBYTE_USE_MOCK=true
```

Isso permitirá que o desenvolvimento continue sem uma conexão real com o Airbyte, usando dados simulados.

## Contatos e Suporte

Se encontrar problemas que não consegue resolver:

1. Verifique os logs do Airbyte em `docker-compose logs -f airbyte-server`
2. Execute o script de diagnóstico para um relatório detalhado
3. Consulte a [documentação do Airbyte](https://docs.airbyte.com/) para problemas específicos