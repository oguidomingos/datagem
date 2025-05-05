export const GOOGLE_ADS_CONFIG = {
  client_id: process.env.GOOGLE_ADS_CLIENT_ID || '',
  client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
  redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`,
  scopes: [
    'https://www.googleapis.com/auth/adwords',
    'https://www.googleapis.com/auth/userinfo.email'
  ]
}

export const META_ADS_CONFIG = {
  client_id: process.env.META_ADS_CLIENT_ID || '',
  client_secret: process.env.META_ADS_CLIENT_SECRET || '',
  redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/callback`,
  scopes: [
    'ads_management',
    'ads_read',
    'email'
  ]
}