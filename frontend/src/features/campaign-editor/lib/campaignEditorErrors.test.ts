import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BackendApiError } from "../../../shared/api/backend.ts";
import { getCampaignEditorErrorMessage } from "./campaignEditorErrors.ts";

describe("getCampaignEditorErrorMessage", () => {
  it("объясняет блокировку после первого пожертвования и окончание сессии", () => {
    assert.match(getCampaignEditorErrorMessage(new BackendApiError(409, "CAMPAIGN_DETAILS_LOCKED")), /пожертвование/);
    assert.match(getCampaignEditorErrorMessage(new BackendApiError(401, "SESSION_REQUIRED")), /Сессия/);
  });

  it("отличает сеть, формат файла и неизвестную ошибку", () => {
    assert.match(getCampaignEditorErrorMessage(new BackendApiError(0, "NETWORK_ERROR")), /недоступен/);
    assert.match(getCampaignEditorErrorMessage(new BackendApiError(415, "UNSUPPORTED_IMAGE")), /JPEG/);
    assert.match(getCampaignEditorErrorMessage(new Error("boom")), /Не удалось/);
  });
});
