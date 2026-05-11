/**
 * Email Provider Factory.
 *
 * Returns the appropriate EmailProvider implementation based on
 * the EMAIL_PROVIDER environment variable.
 */

import type { EmailProvider } from "./base.js";
import { ResendProvider } from "./resend.js";

export function getEmailProvider(): EmailProvider {
  const provider = (process.env.EMAIL_PROVIDER || "resend").toLowerCase();

  switch (provider) {
    case "resend":
      return new ResendProvider();
    // Future providers:
    // case "brevo":
    //   return new BrevoProvider();
    // case "ses":
    //   return new SesProvider();
    default:
      console.warn(`Unknown EMAIL_PROVIDER "${provider}", falling back to Resend`);
      return new ResendProvider();
  }
}
