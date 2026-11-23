"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import type { Address } from "viem";

import { CampaignCard } from "@/entities/campaign/CampaignCard/CampaignCard";
import type { ProfileCampaignKind } from "@/entities/profile/api/profileApi";
import { useProfile, useProfileCampaigns } from "@/entities/profile/model/useProfile";
import { ProfileEditor } from "@/features/profile-edit/ui/ProfileEditor";
import { supportedChain } from "@/shared/config/web3";
import { addressHue, shortenAddress } from "@/shared/lib/address";
import { Button } from "@/shared/ui/Button/Button";
import { ButtonLink } from "@/shared/ui/Button/ButtonLink";
import { EmptyState } from "@/shared/ui/EmptyState/EmptyState";
import { ErrorState } from "@/shared/ui/ErrorState/ErrorState";
import { Skeleton } from "@/shared/ui/Skeleton/Skeleton";

import styles from "./ProfilePage.module.scss";

export function ProfilePage({ address }: { address: Address | null }) {
  if (!address) return (
    <div className={styles.page}>
      <ErrorState title="Неверный адрес профиля" description="Проверьте адрес кошелька в ссылке: он должен начинаться с 0x и содержать 40 hex-символов." action={<ButtonLink href="/campaigns">К кампаниям</ButtonLink>} />
    </div>
  );
  return <ProfileView address={address} key={address} />;
}

function ProfileView({ address }: { address: Address }) {
  const profile = useProfile(address);
  const [kind, setKind] = useState<ProfileCampaignKind>("created");
  const [page, setPage] = useState(0);
  const created = useProfileCampaigns(address, "created", kind === "created" ? page : 0);
  const supported = useProfileCampaigns(address, "supported", kind === "supported" ? page : 0);
  const campaigns = kind === "created" ? created : supported;
  const [nowSeconds] = useState(() => Math.floor(Date.now() / 1000));
  const [copyState, setCopyState] = useState("Копировать адрес");
  const selectKind = (value: ProfileCampaignKind) => { setKind(value); setPage(0); };
  const copy = async () => {
    try { await navigator.clipboard.writeText(address); setCopyState("Адрес скопирован"); }
    catch { setCopyState("Не удалось скопировать"); }
  };

  return (
    <div className={styles.page}>
      <nav aria-label="Навигационная цепочка" className={styles.breadcrumbs}>
        <Link href="/campaigns">Кампании</Link><span aria-hidden="true">/</span><span aria-current="page">Профиль</span>
      </nav>

      <header className={styles.header}>
        <div aria-hidden="true" className={styles.avatar} style={{ "--avatar-hue": addressHue(address) } as CSSProperties} />
        <div className={styles.identity}>
          <p className={styles.eyebrow}>Автор и участник</p>
          <h1>{profile.data?.name ?? shortenAddress(address)}</h1>
          <p className={styles.address}>{address}</p>
          {profile.isPending ? <Skeleton variant="title" /> : profile.data?.bio ? <p className={styles.bio}>{profile.data.bio}</p> : null}
          <div className={styles.counts}>
            <span>Создано проектов · {created.data?.total ?? "—"}</span>
            <span>Поддержано · {supported.data?.total ?? "—"}</span>
          </div>
        </div>
        <div className={styles.actions}>
          <Button onClick={copy} size="compact" variant="secondary">{copyState}</Button>
          <ButtonLink href={`${supportedChain.blockExplorers.default.url}/address/${address}`} rel="noreferrer" size="compact" target="_blank" variant="secondary">Etherscan ↗</ButtonLink>
        </div>
      </header>

      {profile.isError ? (
        <div className={styles.notice} role="status">Не удалось загрузить имя и описание. <Button onClick={() => profile.refetch()} size="compact" variant="quiet">Повторить</Button></div>
      ) : profile.data === null ? (
        <p className={styles.notice}>Владелец пока не заполнил профиль. История кампаний этого адреса доступна ниже.</p>
      ) : null}

      {profile.isSuccess ? <ProfileEditor address={address} profile={profile.data} /> : null}

      <section aria-labelledby="profile-projects" className={styles.projects}>
        <div className={styles.sectionHead}>
          <div><p className={styles.eyebrow}>История участия</p><h2 id="profile-projects">Проекты и поддержка</h2></div>
          <div aria-label="Кампании профиля" className={styles.tabs} role="group">
            <button aria-pressed={kind === "created"} onClick={() => selectKind("created")} type="button">Созданные</button>
            <button aria-pressed={kind === "supported"} onClick={() => selectKind("supported")} type="button">Поддержанные</button>
          </div>
        </div>
        <p className={styles.caption}>История обновляется после финализации блоков{campaigns.data?.finalizedBlock !== null && campaigns.data?.finalizedBlock !== undefined ? ` · данные на блоке ${campaigns.data.finalizedBlock}` : ""}. Суммы на карточках относятся ко всей кампании.</p>
        {kind === "supported" ? <p className={styles.caption}>Здесь остаются и проекты, из которых участник полностью вернул вклад.</p> : null}

        {campaigns.isPending ? (
          <div aria-label="Загрузка кампаний" className={styles.grid}>{[0, 1, 2].map((id) => <Skeleton key={id} variant="panel" />)}</div>
        ) : campaigns.isError ? (
          <ErrorState title="Не удалось загрузить кампании" description="История временно недоступна. Попробуйте ещё раз." action={<Button onClick={() => campaigns.refetch()}>Повторить</Button>} />
        ) : campaigns.data.campaigns.length === 0 ? (
          <EmptyState title={page > 0 ? "На этой странице нет кампаний" : kind === "created" ? "Пока нет созданных проектов" : "Пока нет поддержанных проектов"} description={page > 0 ? "Список обновился. Вернитесь на предыдущую страницу." : "Здесь появятся кампании, когда indexer обработает события этого адреса."} action={page === 0 ? <ButtonLink href="/campaigns" variant="secondary">Смотреть кампании</ButtonLink> : undefined} />
        ) : (
          <div className={styles.grid}>{campaigns.data.campaigns.map((campaign) => <CampaignCard campaign={campaign} key={campaign.id.toString()} nowSeconds={nowSeconds} />)}</div>
        )}

        {page > 0 || (campaigns.data?.total ?? 0) > 6 ? (
          <nav aria-label="Страницы кампаний профиля" className={styles.pagination}>
            <Button disabled={page === 0 || campaigns.isFetching} onClick={() => setPage((value) => value - 1)} variant="secondary">Назад</Button>
            <span aria-live="polite">Страница {page + 1}</span>
            <Button disabled={campaigns.isFetching || !campaigns.data || (page + 1) * 6 >= campaigns.data.total} onClick={() => setPage((value) => value + 1)} variant="secondary">Далее</Button>
          </nav>
        ) : null}
      </section>
    </div>
  );
}
