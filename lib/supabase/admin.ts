import {createClient} from "@supabase/supabase-js";import {SUPABASE_URL} from "@/lib/supabase/config";
export function createAdminClient(){const key=process.env.SUPABASE_SECRET_KEY;if(!key)throw new Error("SUPABASE_SECRET_KEY is not configured");return createClient(SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false}})}
