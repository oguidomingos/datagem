export type Provider = 'google_ads' | 'meta_ads' | 'woocommerce'

export interface ExternalToken {
  id: string
  user_id: string
  project_id: string
  provider: Provider
  access_token: string
  refresh_token?: string
  expires_at?: string
  created_at: string
  metadata?: { [key: string]: any }; // Adicionar metadata opcional
}

export interface ProviderConfig {
  id: Provider
  name: string
  description: string
  authUrl: string
}

export const providers: ProviderConfig[] = [
  {
    id: 'google_ads',
    name: 'Google Ads',
    description: 'Conecte sua conta do Google Ads para sincronizar dados de campanhas',
    authUrl: '/api/auth/google'
  },
  {
    id: 'meta_ads',
    name: 'Meta Ads',
    description: 'Conecte sua conta do Meta Ads para sincronizar dados de campanhas do Facebook e Instagram',
    authUrl: '/api/auth/meta'
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce',
    description: 'Conecte sua loja WooCommerce para sincronizar dados de pedidos, clientes e produtos',
    authUrl: '' // O authUrl será tratado pelo modal
  }
]
// Interface para os dados de conexão formatados para o frontend
export interface Connection {
  id: string;
  provider: Provider; // Reutilizar o tipo Provider existente
  status: 'connected' | 'disconnected' | 'error'; // Adicionar mais status se necessário
  details: { // Detalhes simplificados para exibição rápida
    store_url?: string;
    google_ads_account?: string;
    meta_business_name?: string;
    // Adicionar outros detalhes conforme necessário
  };
  metadata?: { [key: string]: any }; // Metadados completos vindos do Supabase
  lastModified: string; // Data da última modificação (updated_at ou created_at)
  // Adicionar outros campos retornados pela API /api/connections/list se houver
  provider_user_id?: string;
  provider_account_name?: string;
}