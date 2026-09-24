import { createServerClient } from "@supabase/ssr";
import { NextResponse,type NextRequest } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY,SUPABASE_URL } from "@/lib/supabase/config";
export async function updateSession(request:NextRequest){
  let response=NextResponse.next({request});
  const supabase=createServerClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{cookies:{
    getAll(){return request.cookies.getAll()},
    setAll(items){items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,options))},
  }});
  const {data}=await supabase.auth.getClaims();
  const protectedPath=request.nextUrl.pathname.startsWith("/dashboard")||request.nextUrl.pathname.startsWith("/settings");
  if(protectedPath&&!data?.claims){const url=request.nextUrl.clone();url.pathname="/login";url.searchParams.set("next",request.nextUrl.pathname);return NextResponse.redirect(url)}
  if((request.nextUrl.pathname==="/login"||request.nextUrl.pathname==="/signup")&&data?.claims){const url=request.nextUrl.clone();url.pathname="/dashboard";url.search="";return NextResponse.redirect(url)}
  return response;
}
