import type {CheckoutRequest,CheckoutResult} from "./types";import {ProviderConfigurationError} from "./types";
export function paystackConfigured(){return Boolean(process.env.PAYSTACK_SECRET_KEY)}
export async function initializePaystack(input:CheckoutRequest):Promise<CheckoutResult>{
 const key=process.env.PAYSTACK_SECRET_KEY;if(!key)throw new ProviderConfigurationError("Paystack is not configured");
 const res=await fetch("https://api.paystack.co/transaction/initialize",{signal:AbortSignal.timeout(15_000),method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({email:input.customerEmail,amount:input.amountMinor.toString(),currency:input.currency,reference:input.reference,callback_url:input.callbackUrl,metadata:input.metadata??{}})});
 const body=await res.json();if(!res.ok||!body?.status||!body?.data?.authorization_url)throw new Error(body?.message||`Paystack initialization failed (${res.status})`);
 return{provider:"paystack",providerReference:String(body.data.reference||input.reference),authorizationUrl:String(body.data.authorization_url),raw:body};
}
export async function verifyPaystack(reference:string){const key=process.env.PAYSTACK_SECRET_KEY;if(!key)throw new ProviderConfigurationError("Paystack is not configured");const res=await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,{signal:AbortSignal.timeout(15_000),headers:{Authorization:`Bearer ${key}`}});const body=await res.json();if(!res.ok||!body?.status)throw new Error(body?.message||"Paystack verification failed");return body.data}
