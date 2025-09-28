'use client';
import { Button } from '@repo/ui';
import { useRouter } from 'next/navigation';

type CustomSignInProps = {
  redirectUrl?: string;
  onClose?: () => void;
};

export const CustomSignIn = ({ onClose }: CustomSignInProps) => {
  const router = useRouter();
  return (
    <div className="flex w-[320px] flex-col items-center gap-4">
      <p className="text-center text-sm">Veuillez vous connecter pour continuer.</p>
      <Button onClick={() => router.push('/sign-in')}>Aller à la page de connexion</Button>
      {onClose && (
        <Button variant="ghost" size="sm" className="w-full" onClick={onClose}>Fermer</Button>
      )}
    </div>
  );
};
