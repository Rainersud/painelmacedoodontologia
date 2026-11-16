import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Cadastro pelo link: a pessoa cria o próprio login e senha, já confirmado (sem e-mail de
// confirmação). A conta nasce "pendente" (gatilho handle_new_user) e não vê nada até o
// administrador liberar o acesso em Configurações → Usuários.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const buckets = new Map<string, { count: number; resetAt: number }>()
function limited(key: string, max = 5, windowMs = 10 * 60_000) {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || now > b.resetAt) { buckets.set(key, { count: 1, resetAt: now + windowMs }); return false }
  b.count++
  return b.count > max
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405)

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (limited(`ip:${ip}`)) return json({ error: 'Muitas tentativas. Tente de novo em alguns minutos.' }, 429)

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const full_name = typeof body?.full_name === 'string' ? body.full_name.trim() : ''
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (full_name.length < 3 || full_name.length > 120) return json({ error: 'Digite seu nome completo.' }, 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) return json({ error: 'Digite um e-mail válido.' }, 400)
  if (password.length < 8 || password.length > 72) return json({ error: 'A senha precisa ter pelo menos 8 caracteres.' }, 400)

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name },
  })
  if (error) {
    if (/already|registered|exists/i.test(error.message)) {
      return json({ error: 'Já existe uma conta com este e-mail. Use "Entrar" ou "Esqueci minha senha".' }, 409)
    }
    console.error('self-signup error:', error.message)
    return json({ error: 'Não foi possível criar a conta agora. Tente de novo em instantes.' }, 500)
  }

  // garante perfil "pendente" mesmo que o gatilho não tenha rodado
  await admin.from('user_access').upsert({ user_id: data.user.id, perfil: 'pendente' }, { onConflict: 'user_id', ignoreDuplicates: true })
  return json({ success: true })
})
