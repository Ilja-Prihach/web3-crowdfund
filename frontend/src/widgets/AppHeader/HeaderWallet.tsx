"use client";

import { useSession, useSessionAccountGuard, useSignOut } from "@/features/auth/model/useAuth";
import { SignedInMark, SignInPanel } from "@/features/auth/ui/SignInPanel/SignInPanel";
import { ConnectWallet } from "@/features/wallet/ui/ConnectWallet/ConnectWallet";

// Шапка соединяет кошелёк и вход на сайт: фичи друг о друге не знают.
export function HeaderWallet() {
  useSessionAccountGuard();
  const session = useSession();
  const signOut = useSignOut();

  return (
    <ConnectWallet
      accountPanel={<SignInPanel />}
      // Отключение кошелька завершает и вход: сайт не должен считать вошедшим того, чей кошелёк отключён.
      onDisconnect={() => {
        if (session.data) signOut.mutate();
      }}
      triggerBadge={<SignedInMark />}
    />
  );
}
