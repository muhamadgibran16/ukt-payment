export type WebhookLogStatus =
  'received' | 'processed' | 'duplicate' | 'ignored' | 'rejected' | 'failed';

export interface WebhookLog {
  id: string;
  receivedAt: string;
  institutionCode: string | null;
  eventId: string | null;
  eventType: string | null;
  invoiceNumber: string | null;
  signatureValid: boolean;
  rawBody: string;
  sourceIp: string | null;
  processingStatus: WebhookLogStatus;
  responseCode: number | null;
  message: string | null;
  processedAt: string | null;
}
