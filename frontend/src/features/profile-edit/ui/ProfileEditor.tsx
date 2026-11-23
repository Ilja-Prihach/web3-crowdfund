"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useId, useState, type FormEvent } from "react";
import { isAddressEqual, type Address } from "viem";
import { useConnection } from "wagmi";

import { saveProfile, type Profile } from "@/entities/profile/api/profileApi";
import { profileQueryKey } from "@/entities/profile/model/useProfile";
import { useSession } from "@/features/auth/model/useAuth";
import { SignInPanel } from "@/features/auth/ui/SignInPanel/SignInPanel";
import { BackendApiError } from "@/shared/api/backend";
import { Button } from "@/shared/ui/Button/Button";
import { Field } from "@/shared/ui/Field/Field";

import { profileErrorMessage, validateProfileDraft } from "../lib/profileDraft";
import styles from "./ProfileEditor.module.scss";

export function ProfileEditor({ address, profile }: { address: Address; profile: Profile | null }) {
  const session = useSession();
  const connection = useConnection();
  const sessionIsOwner = Boolean(session.data && isAddressEqual(session.data.address, address));
  const walletIsOwner = Boolean(connection.address && isAddressEqual(connection.address, address));
  // При смене кошелька форма закрывается сразу, не дожидаясь завершения backend logout.
  if (connection.address && !walletIsOwner) return null;
  if (sessionIsOwner) return <EditForm address={address} initial={profile} key={address} />;
  if (!walletIsOwner) return null;
  return <section className={styles.card}><h2>Это ваш профиль</h2><p>Подтвердите владение кошельком, чтобы добавить имя и рассказать о себе.</p><SignInPanel /></section>;
}

function EditForm({ address, initial }: { address: Address; initial: Profile | null }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const nameId = useId();
  const bioId = useId();
  const mutation = useMutation({
    mutationFn: saveProfile,
    onSuccess: (result) => {
      // Если аккаунт сменился во время запроса, результат не должен подменить чужую страницу.
      queryClient.setQueryData(profileQueryKey(result.address), result);
      if (isAddressEqual(result.address, address)) {
        setName(result.name ?? ""); setBio(result.bio ?? ""); setOpen(false);
      }
    },
    onError: (cause) => {
      setError(profileErrorMessage(cause));
      if (cause instanceof BackendApiError && cause.status === 401) void queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const validation = validateProfileDraft(name, bio);
    setError(validation.error);
    if (validation.input) mutation.mutate(validation.input);
  };

  return (
    <section className={styles.card}>
      {!open ? (
        <div className={styles.summary}><div><h2>Ваш профиль</h2><p>Имя и описание видны всем посетителям.</p></div><Button onClick={() => { setName(initial?.name ?? ""); setBio(initial?.bio ?? ""); setError(null); mutation.reset(); setOpen(true); }} variant="secondary">{initial ? "Редактировать профиль" : "Заполнить профиль"}</Button></div>
      ) : (
        <form noValidate onSubmit={submit}>
          <h2>Расскажите о себе</h2>
          <p>Эти данные публичны. Имя не подтверждает личность — адрес кошелька остаётся главным идентификатором.</p>
          <fieldset disabled={mutation.isPending}>
            <Field hint={`${name.length} / 80 символов`} id={nameId} label="Имя или название команды" onChange={(event) => setName(event.target.value)} value={name} />
            <label htmlFor={bioId}>О себе</label>
            <textarea aria-describedby={`${bioId}-hint`} id={bioId} onChange={(event) => setBio(event.target.value)} rows={5} value={bio} />
            <p className={styles.hint} id={`${bioId}-hint`}>{bio.length} / 1000 символов</p>
            <div className={styles.actions}><Button isLoading={mutation.isPending} type="submit">Сохранить профиль</Button><Button onClick={() => setOpen(false)} variant="quiet">Отмена</Button></div>
          </fieldset>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
        </form>
      )}
      {mutation.isSuccess && !open ? <p className={styles.success} role="status">Профиль сохранён.</p> : null}
    </section>
  );
}
