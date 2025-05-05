'use client'; // Marcar como Client Component

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client'; // Usar createClient do lado do cliente
import { Button } from '@repo/ui';

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient(); // Criar cliente Supabase no cliente
    await supabase.auth.signOut();
    router.push('/login'); // Redirecionar para login após logout
    router.refresh(); // Limpar cache do router
  };

  return (
    <Button
      onClick={handleLogout}
      // Reutilizar o estilo que estava no layout ou ajustar conforme necessário
      className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
    >
      Sair
    </Button>
  );
}