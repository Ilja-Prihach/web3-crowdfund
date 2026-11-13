"use client";

import { useWalletNetwork } from "@/features/wallet/model/useWalletNetwork";
import { Button } from "@/shared/ui/Button/Button";

import { useSession, useSignIn, useSignOut } from "../../model/useAuth";

import styles from "./SignInPanel.module.scss";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });

// Блок входа на сайт в меню кошелька: состояние сессии и действие.
export function SignInPanel() {
  const session = useSession();
  const signIn = useSignIn();
  const signOut = useSignOut();
  const { isWrongNetwork } = useWalletNetwork();

  if (session.isPending) {
    return (
      <section aria-label="Вход на сайт" className={styles.panel}>
        <p className={styles.status}>Проверяем вход…</p>
      </section>
    );
  }

  if (session.data) {
    return (
      <section aria-label="Вход на сайт" className={styles.panel}>
        <p className={styles.status}>
          <span aria-hidden="true" className={styles.signedInDot} />
          Вы вошли на сайт
        </p>
        <p className={styles.hint}>Вход действует до {dateFormatter.format(new Date(session.data.expiresAt))}.</p>
        <Button
          fullWidth
          isLoading={signOut.isPending}
          onClick={() => signOut.mutate()}
          size="compact"
          variant="secondary"
        >
          Выйти с сайта
        </Button>
      </section>
    );
  }

  return (
    <section aria-label="Вход на сайт" className={styles.panel}>
      <p className={styles.status}>Вход на сайт не выполнен</p>
      <p className={styles.hint}>
        Подпись сообщения подтверждает, что кошелёк ваш. Это не транзакция: газ не нужен, деньги не списываются.
      </p>
      {session.isError ? (
        <p className={styles.hint}>Не удалось проверить вход: сервер OpenFund сейчас недоступен.</p>
      ) : null}
      {/* Кнопка появляется только в Sepolia: сообщение подписывается для этой сети. */}
      {isWrongNetwork ? (
        <p className={styles.hint}>Чтобы войти, переключите кошелёк на Sepolia.</p>
      ) : (
        <Button fullWidth isLoading={signIn.isPending} onClick={signIn.signIn} size="compact">
          {signIn.isPending ? "Подпишите в кошельке" : "Войти подписью"}
        </Button>
      )}
      {signIn.errorMessage ? (
        <p className={styles.error} role="alert">
          {signIn.errorMessage}
        </p>
      ) : null}
    </section>
  );
}

// Метка на кнопке кошелька: видно, что вход на сайт выполнен, не открывая меню.
export function SignedInMark() {
  const session = useSession();
  if (!session.data) return null;
  return <span aria-label="вы вошли на сайт" className={styles.signedInMark} role="img" />;
}
