import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);
const ROLES = ['admin','vendas','tecnico','pcp','financeiro','rh','instalacao','cliente'];
const ROLE_LABELS = {admin:'Administrador',vendas:'Vendas',tecnico:'Técnico',pcp:'PCP',financeiro:'Financeiro',rh:'RH / Administrativo',instalacao:'Instalação',cliente:'Cliente'};
const ACCESS = {
  admin:['*'], vendas:['dashboard','orcamentos','pedidos','clientes','documentos','assistente'], tecnico:['dashboard','pedidos','medicao','desenho','documentos','assistente'], pcp:['dashboard','pedidos','producao','acabamento','estoque','documentos','assistente'], financeiro:['dashboard','pedidos','orcamentos','financeiro','documentos','assistente'], rh:['dashboard','rh','clientes','documentos','assistente'], instalacao:['dashboard','pedidos','logistica','instalacao','documentos','assistente'], cliente:['dashboard','pedidos','documentos']
};
let profile = null;
function esc(s){return String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
function allowed(view){return !profile || profile.role==='admin' || (ACCESS[profile.role]||[]).includes(view)}
function applyAccess(){document.querySelectorAll('.nav-item').forEach(n=>{n.hidden=!allowed(n.dataset.view)});document.querySelectorAll('.view').forEach(v=>{if(!allowed(v.id))v.classList.remove('active-view')});}
function renderUser(){let el=document.getElementById('auth-user');if(!el)return;el.innerHTML=`<span>${esc(profile?.nome||profile?.email||'Usuário')}</span><small>${esc(ROLE_LABELS[profile?.role]||profile?.role||'')}</small><button id="auth-logout">Sair</button>`;document.getElementById('auth-logout').onclick=()=>supabase.auth.signOut();}
function loginUI(){if(document.getElementById('auth-overlay'))return;const d=document.createElement('div');d.id='auth-overlay';d.innerHTML=`<div class="auth-card"><div class="brand-mark">P</div><div class="eyebrow">PORCELANE · OPERAÇÃO</div><h1>Acesso ao sistema</h1><p>Entre com seu usuário para acessar a operação.</p><form id="auth-form"><label>E-mail<input id="auth-email" type="email" autocomplete="email" required></label><label>Senha<input id="auth-password" type="password" autocomplete="current-password" required></label><button class="primary" type="submit">Entrar</button><div id="auth-error" class="auth-error"></div></form></div>`;document.body.appendChild(d);d.querySelector('form').onsubmit=async e=>{e.preventDefault();const email=d.querySelector('#auth-email').value.trim(),password=d.querySelector('#auth-password').value;const error=d.querySelector('#auth-error');error.textContent='Entrando…';const {error:e2}=await supabase.auth.signInWithPassword({email,password});if(e2)error.textContent=e2.message;};}
function removeLogin(){document.getElementById('auth-overlay')?.remove()}
async function loadProfile(user){if(!user){profile=null;loginUI();return}const {data,error}=await supabase.from('profiles').select('id,nome,email,role,ativo').eq('id',user.id).maybeSingle();if(error||!data){await supabase.auth.signOut();loginUI();const e=document.querySelector('#auth-error');if(e)e.textContent='Usuário sem perfil de acesso. Cadastre o perfil no Supabase.';return}if(data.ativo===false){await supabase.auth.signOut();loginUI();const e=document.querySelector('#auth-error');if(e)e.textContent='Acesso desativado.';return}profile={...data,email:data.email||user.email};removeLogin();applyAccess();renderUser();}
async function bootAuth(){const {data:{session}}=await supabase.auth.getSession();await loadProfile(session?.user||null);supabase.auth.onAuthStateChange(async(_event,session)=>{await loadProfile(session?.user||null)});}
window.PorcelaneAuth={supabase,getProfile:()=>profile,allowed,ROLE_LABELS};
bootAuth();
