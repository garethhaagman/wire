/** Mirrors internal-docs/api/events-webhooks.md § Subscriptions */
export interface WebhookEndpoint {
  channelFilter: string[] | null;
  createdAt: string;
  enabledEvents: string[];
  id: `whe_${string}`;
  updatedAt: string;
  url: string;
  workspaceId: string;
}

export interface CreateWebhookEndpointRequest {
  channelFilter?: string[];
  enabledEvents: string[];
  url: string;
}
