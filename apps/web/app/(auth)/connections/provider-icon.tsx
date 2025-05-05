import { SiGoogleads, SiMeta } from 'react-icons/si'
import type { Provider } from '@/types'

interface ProviderIconProps {
  provider: Provider
  className?: string
}

export default function ProviderIcon({ provider, className }: ProviderIconProps) {
  if (provider === 'google') {
    return <SiGoogleads className={className} />
  }
  return <SiMeta className={className} />
}