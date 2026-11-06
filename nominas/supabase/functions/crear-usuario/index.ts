// Edge Function (Deno). Despliegue: supabase functions deploy crear-usuario
// Usa la service_role SOLO en el servidor (variable de entorno de Supabase), nunca en el navegador.
import {createClient} from 'npm:@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 try{
  const url=Deno.env.get('SUPABASE_URL')!;
  const caller=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')??''}}});
  const{data:{user}}=await caller.auth.getUser();if(!user)return json({error:'No autenticado'},401);
  const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const{email,password}=await req.json();
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email??''))return json({error:'Correo inválido'},400);
  if(typeof password!=='string'||password.length<8)return json({error:'La contraseña debe tener al menos 8 caracteres'},400);
  const{data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});
  if(error)return json({error:error.message},400);
  return json({ok:true});
 }catch(e){return json({error:String((e as Error).message??e)},500)}
});
