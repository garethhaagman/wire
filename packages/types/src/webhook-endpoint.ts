/** Mirrors internal-docs/api/events-webhooks.md § Subscriptions */
export interface WebhookEndpoint {
  id: `whe_${string}`;
  workspaceId: string;
  url: string;
  enabledEvents: string[];
  channelFilter: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookEndpointRequest {
  url: string;
  enabledEvents: string[];
  channelFilter?: string[];
}
