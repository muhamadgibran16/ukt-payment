export enum PaymentEventType {
  PAYMENT_SUCCESS = 'payment.success',
  PAYMENT_EXPIRED = 'payment.expired',
  /** Kedaluwarsa otomatis oleh sistem karena melewati expires_at. */
  SYSTEM_EXPIRED = 'system.expired',
}

export const GATEWAY_EVENT_TYPES = [
  PaymentEventType.PAYMENT_SUCCESS,
  PaymentEventType.PAYMENT_EXPIRED,
] as const;
export type GatewayEventType = (typeof GATEWAY_EVENT_TYPES)[number];
