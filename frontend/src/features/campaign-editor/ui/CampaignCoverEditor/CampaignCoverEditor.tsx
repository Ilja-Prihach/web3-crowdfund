"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";

import type { CampaignDetails } from "@/entities/campaign/api/detailsApi";
import type { Campaign } from "@/entities/campaign/model/campaign";
import { CampaignArtwork } from "@/entities/campaign/CampaignArtwork/CampaignArtwork";
import { validateCoverFile } from "@/features/campaign-editor/lib/campaignDetailsDraft";
import { getCampaignEditorErrorMessage } from "@/features/campaign-editor/lib/campaignEditorErrors";
import { useDeleteCampaignCover, useUploadCampaignCover } from "@/features/campaign-editor/model/useCampaignEditor";
import { Button } from "@/shared/ui/Button/Button";

import styles from "./CampaignCoverEditor.module.scss";

type CampaignCoverEditorProps = { campaign: Campaign; details: CampaignDetails };

export function CampaignCoverEditor({ campaign, details }: CampaignCoverEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const upload = useUploadCampaignCover(campaign.id);
  const remove = useDeleteCampaignCover(campaign.id);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0] ?? null;
    upload.reset();
    remove.reset();
    setConfirmDelete(false);
    if (!next) return;
    const error = validateCoverFile(next);
    if (error) {
      setFile(null);
      setFileError(error);
      event.target.value = "";
      return;
    }
    setFile(next);
    setFileError(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(next);
    });
  };

  const clearSelection = () => {
    setFile(null);
    setFileError(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    if (inputRef.current) inputRef.current.value = "";
  };

  const submit = () => {
    if (!file) return;
    upload.mutate(file, { onSuccess: clearSelection });
  };

  const deleteCover = () => {
    remove.mutate(undefined, {
      onSuccess: () => {
        setConfirmDelete(false);
        clearSelection();
      },
    });
  };

  const error = upload.error ?? remove.error;

  return (
    <section aria-labelledby="editor-cover" className={styles.card}>
      <div className={styles.head}>
        <div>
          <p className={styles.kicker}>Обложка</p>
          <h2 id="editor-cover">Первое впечатление о проекте</h2>
        </div>
        <span>1200 × 675 после обработки</span>
      </div>

      <div className={styles.layout}>
        <div className={styles.preview}>
          <CampaignArtwork coverUrl={previewUrl ?? details.coverUrl} fundingMode={campaign.fundingMode} id={campaign.id} sizes="(max-width: 959px) 100vw, 480px" />
        </div>

        <div className={styles.controls}>
          <p>JPEG, PNG или WebP до 5 МБ. Backend обрежет изображение по центру до 16:9, удалит EXIF и сохранит WebP.</p>
          <label className={styles.fileButton} htmlFor="campaign-cover-file">
            {file ? "Выбрать другой файл" : details.coverUrl ? "Заменить обложку" : "Выбрать обложку"}
          </label>
          <input
            accept="image/jpeg,image/png,image/webp"
            className={styles.fileInput}
            id="campaign-cover-file"
            onChange={choose}
            ref={inputRef}
            type="file"
          />
          {file ? <p className={styles.fileName}>{file.name} · {(file.size / 1024 / 1024).toFixed(2)} МБ</p> : null}
          {fileError ? <p className={styles.error} role="alert">{fileError}</p> : null}

          {file ? (
            <div className={styles.actions}>
              <Button isLoading={upload.isPending} onClick={submit}>Загрузить обложку</Button>
              <Button disabled={upload.isPending} onClick={clearSelection} variant="quiet">Отменить выбор</Button>
            </div>
          ) : null}

          {details.coverUrl && !file ? (
            confirmDelete ? (
              <div className={styles.confirm}>
                <p>Удалить текущую обложку? На странице снова появится фирменный узор.</p>
                <div className={styles.actions}>
                  <Button isLoading={remove.isPending} onClick={deleteCover} variant="accent">Удалить</Button>
                  <Button disabled={remove.isPending} onClick={() => setConfirmDelete(false)} variant="quiet">Оставить</Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setConfirmDelete(true)} size="compact" variant="quiet">Удалить текущую обложку</Button>
            )
          ) : null}

          {error ? <p className={styles.error} role="alert">{getCampaignEditorErrorMessage(error)}</p> : null}
          {upload.isSuccess ? <p className={styles.success} role="status">Новая обложка загружена.</p> : null}
          {remove.isSuccess ? <p className={styles.success} role="status">Обложка удалена.</p> : null}
        </div>
      </div>
    </section>
  );
}
