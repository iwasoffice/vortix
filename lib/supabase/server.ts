import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
export async function createClient(){
  const store=await cookies();
  return createServerClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{cookies:{
    getAll(){return store.getAll()},
    setAll(items){try{items.forEach(({name,value,options})=>store.set(name,value,options))}catch{}},
  }});
}
