import { createClient } from '@supabase/supabase-js';
import APP_CONFIG from './core/app.config.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);
const ROLE_LABELS = {admin:'Administrador',vendas:'Vendas',tecnico:'Técnico',pcp:'PCP',financeiro:'Financeiro',rh:'RH / Administrativo',instalacao:'Instalação',cliente:'Cliente'};
const ACCESS = {
  admin:['*'], vendas:['dashboard','orcamentos','pedidos','clientes','documentos','assistente'], tecnico:['dashboard','pedidos','medicao','liberacao_tecnica','desenho','documentos','assistente'], pcp:['dashboard','pedidos','liberacao_tecnica','desenho','producao','acabamento','estoque','documentos','assistente'], financeiro:['dashboard','pedidos','orcamentos','financeiro','documentos','assistente'], rh:['dashboard','rh','clientes','documentos','assistente'], instalacao:['dashboard','pedidos','logistica','instalacao','documentos','assistente'], cliente:['dashboard','pedidos','documentos']
};
const MODULE_ALIASES = {projetos:'desenho'};
let profile = null;
function esc(s){return String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
function moduleEnabled(view){const key=MODULE_ALIASES[view]||view;return APP_CONFIG.modules?.[view] ?? APP_CONFIG.modules?.[key] ?? true}
function allowed(view){return moduleEnabled(view) && (!profile || profile.role==='admin' || (ACCESS[profile.role]||[]).includes(view))}
function firstAllowedView(){if(allowed('dashboard'))return 'dashboard';const roleViews=ACCESS[profile?.role]||[];return roleViews.find(v=>v!=='*'&&moduleEnabled(v))||'dashboard'}
function ensureVisibleView(){const active=document.querySelector('.view.active-view');if(active && allowed(active.id))return;const target=firstAllowedView();const button=document.querySelector(`.nav-item[data-view="${target}"]`);if(button)button.click();else{document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active-view',v.id===target));}}
function applyAccess(){document.querySelectorAll('.nav-item').forEach(n=>{n.hidden=!allowed(n.dataset.view)});document.querySelectorAll('.view').forEach(v=>{if(!allowed(v.id))v.classList.remove('active-view')});ensureVisibleView();}
function renderUser(){let el=document.getElementById('auth-user');if(!el)return;el.innerHTML=`<span>${esc(profile?.nome||profile?.email||'Usuário')}</span><small>${esc(ROLE_LABELS[profile?.role]||profile?.role||'')}</small><button id="auth-change-password" type="button">Trocar senha</button><button id="auth-logout" type="button">Sair</button>`;document.getElementById('auth-logout').onclick=async()=>{if(profile?.email){await supabase.auth.signOut();}profile={nome:'Visitante',email:'',role:'admin',ativo:true};removeLogin();applyAccess();renderUser();};document.getElementById('auth-change-password').onclick=changePasswordUI;}
function passwordField(id,label){return `<label>${label}<span class="password-wrap"><input id="${id}" type="password" autocomplete="new-password" required><button type="button" class="password-toggle" data-target="${id}" aria-label="Mostrar senha">👁</button></span></label>`}
function bindPasswordToggles(root){root.querySelectorAll('.password-toggle').forEach(b=>b.onclick=()=>{const input=root.querySelector('#'+b.dataset.target);input.type=input.type==='password'?'text':'password';b.setAttribute('aria-label',input.type==='password'?'Mostrar senha':'Ocultar senha');});}
function changePasswordUI(){if(document.getElementById('password-overlay'))return;const d=document.createElement('div');d.id='password-overlay';d.innerHTML=`<div class="auth-card"><div class="brand-mark">P</div><div class="eyebrow">PORCELANE · SEGURANÇA</div><h1>Trocar senha</h1><p>Defina uma nova senha para sua conta.</p><form id="password-form">${passwordField('new-password','Nova senha')}${passwordField('confirm-password','Confirmar senha')}<button class="primary" type="submit">Salvar nova senha</button><button class="secondary" id="cancel-password" type="button">Cancelar</button><div id="password-error" class="auth-error"></div></form></div>`;document.body.appendChild(d);bindPasswordToggles(d);d.querySelector('#cancel-password').onclick=()=>d.remove();d.querySelector('form').onsubmit=async e=>{e.preventDefault();const a=d.querySelector('#new-password').value,b=d.querySelector('#confirm-password').value,err=d.querySelector('#password-error');if(a.length<8){err.textContent='A senha deve ter pelo menos 8 caracteres.';return}if(a!==b){err.textContent='As senhas não conferem.';return}err.textContent='Salvando…';const {error}=await supabase.auth.updateUser({password:a});if(error){err.textContent=error.message;return}d.remove();alert('Senha alterada com sucesso.');};}
function loginUI(){if(document.getElementById('auth-overlay'))return;const d=document.createElement('div');d.id='auth-overlay';d.innerHTML=`<div class="auth-card"><div class="brand-mark">P</div><div class="eyebrow">PORCELANE · OPERAÇÃO</div><h1>Acesso ao sistema</h1><p>Entre com seu usuário para acessar a operação.</p><form id="auth-form"><label>E-mail<input id="auth-email" type="email" autocomplete="email" required></label>${passwordField('auth-password','Senha')}<button class="primary" type="submit">Entrar</button><div id="auth-error" class="auth-error"></div></form></div>`;document.body.appendChild(d);bindPasswordToggles(d);d.querySelector('form').onsubmit=async e=>{e.preventDefault();const email=d.querySelector('#auth-email').value.trim(),password=d.querySelector('#auth-password').value;const error=d.querySelector('#auth-error');error.textContent='Entrando…';const {error:e2}=await supabase.auth.signInWithPassword({email,password});if(e2)error.textContent=e2.message;};}
function removeLogin(){document.getElementById('auth-overlay')?.remove()}
function showProfileError(message){const overlay=document.getElementById('auth-overlay');if(overlay){const error=overlay.querySelector('#auth-error');if(error)error.textContent=message;else alert(message);}else{loginUI();const error=document.querySelector('#auth-error');if(error)error.textContent=message;}}
async function loadProfile(user){
  if(!user){profile=null;loginUI();renderUser();return}
  const {data,error}=await supabase.from('profiles').select('id,nome,email,role,ativo').eq('id',user.id).maybeSingle();
  if(error){console.error('Perfil:',error);await supabase.auth.signOut();profile=null;showProfileError('Não foi possível carregar seu perfil. Verifique a configuração da tabela profiles no Supabase.');return}
  if(!data){
    const metadataRole=user.app_metadata?.role||user.user_metadata?.role;
    const metadataName=user.user_metadata?.nome||user.user_metadata?.name;
    if(metadataRole && ROLE_LABELS[metadataRole]){
      profile={id:user.id,nome:metadataName||user.email,email:user.email,role:metadataRole,ativo:true};
      removeLogin();applyAccess();renderUser();return;
    }
    await supabase.auth.signOut();profile=null;showProfileError('Senha correta, mas este usuário ainda não possui um perfil autorizado no Porcelane.');return;
  }
  if(data.ativo===false){await supabase.auth.signOut();profile=null;showProfileError('Este usuário está desativado.');return}
  profile={...data,email:data.email||user.email};removeLogin();applyAccess();renderUser();
}
function ensureTechnicalReleaseView(){
  if(document.getElementById('liberacao_tecnica'))return;
  const nav=document.querySelector('aside nav');
  const drawing=document.querySelector('#desenho');
  if(nav){const b=document.createElement('button');b.className='nav-item';b.dataset.view='liberacao_tecnica';b.textContent='Liberação Técnica';nav.insertBefore(b,drawing?nav.querySelector('[data-view="desenho"]'):null);b.addEventListener('click',()=>window.PorcelaneGo?.('liberacao_tecnica'));}
  if(drawing){const section=document.createElement('section');section.className='view';section.id='liberacao_tecnica';section.innerHTML='<div class="section-head"><div><h2>Liberação Técnica</h2><p>Etapa obrigatória entre a medição aprovada e o desenho técnico.</p></div></div><div class="panel"><div class="list" id="technical-release-list"><div class="empty">Carregando pedidos aptos para liberação técnica…</div></div></div>';drawing.parentNode.insertBefore(section,drawing);}
}
async function renderTechnicalRelease(){
  const list=document.getElementById('technical-release-list');if(!list)return;
  const {data,error}=await supabase.from('pedidos').select('id,numero,status,data_medicao,medicao_aprovada,cliente:clientes(nome),obra:obras(nome)').eq('medicao_aprovada',true).neq('status','finalizado').order('data_medicao',{ascending:true});
  if(error){list.innerHTML='<div class="empty">Não foi possível carregar a fila de liberação técnica.</div>';return}
  const rows=data||[];list.innerHTML=rows.length?rows.map(o=>`<div class="list-row"><strong>${esc(o.numero||'Pedido')}</strong><span>${esc(o.cliente?.nome||'')} · ${esc(o.obra?.nome||'')}</span><span>Medição: ${esc(o.data_medicao||'')}</span><span class="badge green">Medição aprovada</span><button data-release="${o.id}">Liberar</button></div>`).join(''):'<div class="empty">Nenhum pedido aguardando liberação técnica.</div>';
  list.querySelectorAll('[data-release]').forEach(btn=>btn.onclick=async()=>{const id=btn.dataset.release;btn.disabled=true;const {error:e}=await supabase.from('pedidos').update({status:'conferencia'}).eq('id',id).eq('medicao_aprovada',true);if(e){alert('Não foi possível registrar a liberação técnica: '+e.message);btn.disabled=false;return}await supabase.from('auditoria_operacional').insert({tabela:'pedidos',registro_id:id,acao:'liberacao_tecnica',dados:{liberado_em:new Date().toISOString()}});await renderTechnicalRelease();});
}
async function bootAuth(){ensureTechnicalReleaseView();const {data:{session}}=await supabase.auth.getSession();await loadProfile(session?.user||null);supabase.auth.onAuthStateChange(async(_event,session)=>{if(session?.user)await loadProfile(session.user);else{profile=null;loginUI();}});setTimeout(()=>{applyAccess();renderTechnicalRelease();},0);}
window.PorcelaneConfig=APP_CONFIG;
window.PorcelaneAuth={supabase,getProfile:()=>profile,allowed,ROLE_LABELS};
window.PorcelaneGo=(view)=>{const target=document.querySelector(`.nav-item[data-view="${view}"]`);if(target){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active-view',v.id===view));document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n===target));const title=document.getElementById('page-title');if(title)title.textContent=view==='liberacao_tecnica'?'Liberação Técnica':view;}};
bootAuth();
