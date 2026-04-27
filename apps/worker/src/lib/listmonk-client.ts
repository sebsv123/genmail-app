// Re-export from @genmail/email-engine
export {
  ListmonkClient,
  ListmonkError,
  ListmonkAuthError,
  ListmonkNotFoundError,
  type ListmonkConfig,
  type ListmonkSubscriber,
  type ListmonkCampaign,
  type ListmonkList,
  type CampaignStatus,
} from "@genmail/email-engine";

// Create singleton instance
import { ListmonkClient } from "@genmail/email-engine";

const config = {
  baseUrl: process.env.LISTMONK_BASE_URL || "http://localhost:9000",
  username: process.env.LISTMONK_USERNAME || "admin",
  password: process.env.LISTMONK_PASSWORD || "admin",
};

export const listmonk = new ListmonkClient(config);
