// Re-export from @genmail/email-engine
export {
  ListmonkClient,
  ListmonkError,
  ListmonkAuthError,
  ListmonkNotFoundError,
  type ListmonkConfig,
  type Subscriber,
  type Campaign,
  type List,
  type CampaignStatus,
  type CampaignType,
} from "@genmail/email-engine";

// Create singleton instance
import { ListmonkClient } from "@genmail/email-engine";

const config = {
  baseUrl: process.env.LISTMONK_BASE_URL || "http://localhost:9000",
  username: process.env.LISTMONK_USERNAME || "admin",
  password: process.env.LISTMONK_PASSWORD || "admin",
};

export const listmonk = new ListmonkClient(config);
