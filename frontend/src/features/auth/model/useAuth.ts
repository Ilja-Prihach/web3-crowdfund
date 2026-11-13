"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useConnection, useSignMessage } from "wagmi";

import { authApi, type Session } from "../api/authApi";
import { getSignInErrorMessage } from "../lib/authErrors";
import { shouldEndSession } from "../lib/sessionGuard";
import { buildSignInMessage } from "../lib/signInMessage";

const sessionQueryKey = ["auth", "session"] as const;

// Текущая сессия backend. Сам идентификатор живёт в httpOnly-cookie: JavaScript его не видит,
// а знает только ответ /session — адрес и срок.
export function useSession() {
  return useQuery({
    queryKey: sessionQueryKey,
    queryFn: authApi.session,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useSignIn() {
  const connection = useConnection();
  const signMessage = useSignMessage();
  const queryClient = useQueryClient();
  // Когда получен nonce: только frontend может отличить истёкший nonce от прочих отказов backend.
  const nonceIssuedAt = useRef(0);
  // Текст считается в момент ошибки, а не при рендере: рендер не должен зависеть от часов и ref.
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const { address } = connection;
      if (!address) throw new Error("Wallet is not connected");

      const nonce = await authApi.nonce();
      nonceIssuedAt.current = Date.now();
      const message = buildSignInMessage({ address, nonce, origin: window.location.origin, issuedAt: new Date() });
      // Подпись — не транзакция: кошелёк показывает текст, газ не нужен, в сеть ничего не уходит.
      const signature = await signMessage.mutateAsync({ account: address, message });
      return authApi.verify(message, signature);
    },
    onMutate: () => setErrorMessage(null),
    onError: (error) => setErrorMessage(getSignInErrorMessage(error, Date.now() - nonceIssuedAt.current)),
    onSuccess: (session) => queryClient.setQueryData<Session | null>(sessionQueryKey, session),
  });

  return {
    signIn: () => mutation.mutate(),
    isPending: mutation.isPending,
    errorMessage,
    reset: () => {
      mutation.reset();
      setErrorMessage(null);
    },
  };
}

export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    // Даже если запрос не дошёл, интерфейс не должен считать пользователя вошедшим: проверим сессию заново.
    onSettled: () => queryClient.invalidateQueries({ queryKey: sessionQueryKey }),
    onSuccess: () => queryClient.setQueryData<Session | null>(sessionQueryKey, null),
  });
}

// Смена аккаунта в кошельке завершает сессию прежнего адреса. Подключается один раз — в шапке.
export function useSessionAccountGuard() {
  const connection = useConnection();
  const session = useSession();
  const signOut = useSignOut();
  const { mutate: endSession, isPending } = signOut;

  const sessionAddress = session.data?.address;
  const mustEnd = shouldEndSession({ sessionAddress, walletStatus: connection.status, walletAddress: connection.address });

  useEffect(() => {
    if (mustEnd && !isPending) endSession();
  }, [mustEnd, isPending, endSession]);
}
