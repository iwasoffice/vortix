export type ProviderName="paystack"|"flutterwave"|"monnify";
export type CheckoutRequest={reference:string;amountMinor:bigint;currency:string;customerEmail:string;customerName?:string;callbackUrl:string;metadata?:Record<string,unknown>};
export type CheckoutResult={provider:ProviderName;providerReference:string;authorizationUrl:string;raw:unknown};
export class ProviderConfigurationError extends Error{constructor(message:string){super(message);this.name="ProviderConfigurationError"}}
