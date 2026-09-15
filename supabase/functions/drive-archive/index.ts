import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const FOLDER_MIME = "application/vnd.google-apps.folder";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

const clean = (v: string) => v.replace(/[\\/:*?"<>|#%]/g, "-").trim().replace(/\s+/g, " ");

async function accessToken() {
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");
  if (!clientId || !clientSecret || !refreshToken) throw new Error("Google Drive não conectado no servidor.");
  const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" });
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const d = await r.json();
  if (!r.ok || !d.access_token) throw new Error(d.error_description || d.error || "Falha ao autenticar no Google.");
  return d.access_token as string;
}

async function findFolder(token: string, name: string, parent: string) {
  const q = `'${parent}' in parents and name = '${name.replace(/'/g, "\\'")}' and mimeType = '${FOLDER_MIME}' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,webViewLink)&pageSize=1`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || "Falha ao consultar o Drive.");
  return d.files?.[0] || null;
}

async function folder(token: string, name: string, parent: string) {
  const existing = await findFolder(token, name, parent);
  if (existing) return existing;
  const r = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parent] }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || "Falha ao criar pasta no Drive.");
  return d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  if (!req.headers.get("Authorization")?.startsWith("Bearer ")) return json({ error: "Não autenticado." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const root = Deno.env.get("GOOGLE_DRIVE_ROOT_FOLDER_ID");
  if (!supabaseUrl || !anonKey || !root) return json({ error: "Google Drive ainda não foi configurado no servidor." }, 503);

  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const db = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: req.headers.get("Authorization")! } } });

  try {
    const { pedido_id } = await req.json();
    if (!pedido_id) return json({ error: "pedido_id é obrigatório." }, 400);

    const { data: a, error: e } = await db.from("arquivamento_pedidos")
      .select("id,pedido_id,numero_pedido,cliente_nome,ano,mes,status,drive_folder_id,drive_folder_url")
      .eq("pedido_id", pedido_id).maybeSingle();
    if (e) throw e;
    if (!a) return json({ error: "Registro de arquivamento não encontrado." }, 404);
    if (a.status === "arquivado" && a.drive_folder_url) return json({ ok: true, folder_url: a.drive_folder_url });

    const token = await accessToken();
    const year = await folder(token, String(a.ano), root);
    const month = `${String(a.mes).padStart(2, "0")}-${new Date(2000, a.mes - 1, 1).toLocaleDateString("pt-BR", { month: "long" })}`;
    const monthFolder = await folder(token, month, year.id);
    const orderName = clean(`${a.numero_pedido || "PEDIDO"} - ${a.cliente_nome || "Cliente"}`);
    const order = a.drive_folder_id ? { id: a.drive_folder_id, webViewLink: a.drive_folder_url } : await folder(token, orderName, monthFolder.id);
    const url = order.webViewLink || `https://drive.google.com/drive/folders/${order.id}`;

    const { error: updateError } = await db.from("arquivamento_pedidos").update({
      status: "arquivado", drive_folder_id: order.id, drive_folder_url: url, erro: null, atualizado_em: new Date().toISOString(),
    }).eq("id", a.id);
    if (updateError) throw updateError;

    return json({ ok: true, folder_id: order.id, folder_url: url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ ok: false, error: message }, 500);
  }
});
