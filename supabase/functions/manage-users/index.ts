import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

// ---------------------------------------------------------------------------
// Rate limiting simples em memória (por admin autenticado e por IP).
// Evita abuso de criação/exclusão de usuários em massa.
// ---------------------------------------------------------------------------
const RATE_LIMIT_MAX = 20            // requisições
const RATE_LIMIT_WINDOW_MS = 60_000  // por minuto
const rateBuckets = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  const bucket = rateBuckets.get(key)
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, retryAfter: 0 }
  }
  bucket.count++
  if (bucket.count > RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }
  return { allowed: true, retryAfter: 0 }
}

// Limpeza periódica dos buckets expirados
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of rateBuckets) if (now > v.resetAt) rateBuckets.delete(k)
}, RATE_LIMIT_WINDOW_MS)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const ipLimit = checkRateLimit(`ip:${clientIp}`)
  if (!ipLimit.allowed) {
    return new Response(JSON.stringify({ error: 'Muitas requisições. Tente novamente em instantes.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(ipLimit.retryAfter) }
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Configuração do servidor ausente' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // Verify caller is admin using their JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if caller is admin
    const { data: isAdmin } = await adminClient.rpc('is_admin', { _user_id: caller.id })
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Sem permissão' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userLimit = checkRateLimit(`user:${caller.id}`)
    if (!userLimit.allowed) {
      return new Response(JSON.stringify({ error: 'Muitas requisições. Tente novamente em instantes.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(userLimit.retryAfter) }
      })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ error: 'Requisição inválida' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    const { action, ...params } = body as Record<string, any>

    const isEmail = (v: unknown) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 255
    const isUuid = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
    const isName = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && v.length <= 120
    const isPassword = (v: unknown) => typeof v === 'string' && v.length >= 8 && v.length <= 72
    const isRole = (v: unknown) => v === 'admin' || v === 'agente'
    const bad = (msg: string) => new Response(JSON.stringify({ error: msg }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
    const sanitizePermissions = (perms: unknown) =>
      Array.isArray(perms)
        ? perms
            .filter((p: any) => p && typeof p.module === 'string' && p.module.length <= 60)
            .map((p: any) => ({
              module: p.module,
              can_view: p.can_view === true,
              can_edit: p.can_edit === true,
            }))
        : []

    switch (action) {
      case 'create_user': {
        const { email, password, full_name, phone, role, permissions } = params

        if (!isEmail(email)) return bad('E-mail inválido')
        if (!isPassword(password)) return bad('A senha deve ter no mínimo 8 caracteres')
        if (!isName(full_name)) return bad('Nome inválido')
        if (role !== undefined && !isRole(role)) return bad('Perfil inválido')
        if (phone !== undefined && phone !== null && (typeof phone !== 'string' || phone.length > 30)) return bad('Telefone inválido')

        // Create user in auth
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name },
        })
        if (createError) throw createError


        const userId = newUser.user.id

        // Create profile
        await adminClient.from('profiles').insert({
          user_id: userId,
          full_name,
          phone: phone || null,
        })

        // Assign role
        await adminClient.from('user_roles').insert({
          user_id: userId,
          role: role || 'agente',
        })

        // Set permissions
        const permRows = sanitizePermissions(permissions).map((p) => ({ user_id: userId, ...p }))
        if (permRows.length > 0) {
          await adminClient.from('user_permissions').insert(permRows)
        }

        return new Response(JSON.stringify({ success: true, user_id: userId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'update_user': {
        const { user_id, full_name, phone, is_active, role } = params

        if (!isUuid(user_id)) return bad('Usuário inválido')
        if (full_name !== undefined && !isName(full_name)) return bad('Nome inválido')
        if (phone !== undefined && phone !== null && (typeof phone !== 'string' || phone.length > 30)) return bad('Telefone inválido')
        if (is_active !== undefined && typeof is_active !== 'boolean') return bad('Status inválido')
        if (role !== undefined && !isRole(role)) return bad('Perfil inválido')
        if (user_id === caller.id && (is_active === false || role === 'agente')) {
          return bad('Você não pode remover o próprio acesso de administrador')
        }

        if (full_name !== undefined || phone !== undefined || is_active !== undefined) {
          const updates: any = {}
          if (full_name !== undefined) updates.full_name = full_name
          if (phone !== undefined) updates.phone = phone
          if (is_active !== undefined) updates.is_active = is_active
          await adminClient.from('profiles').update(updates).eq('user_id', user_id)
        }

        if (is_active === false) {
          await adminClient.auth.admin.updateUserById(user_id, { ban_duration: '876000h' })
        } else if (is_active === true) {
          await adminClient.auth.admin.updateUserById(user_id, { ban_duration: 'none' })
        }

        if (role) {
          const { data: existing } = await adminClient.from('user_roles').select('id').eq('user_id', user_id).maybeSingle()
          if (existing) {
            await adminClient.from('user_roles').update({ role }).eq('user_id', user_id)
          } else {
            await adminClient.from('user_roles').insert({ user_id, role })
          }
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'reset_password': {
        const { user_id, new_password } = params
        if (!isUuid(user_id)) return bad('Usuário inválido')
        if (!isPassword(new_password)) return bad('A senha deve ter no mínimo 8 caracteres')

        const { error } = await adminClient.auth.admin.updateUserById(user_id, { password: new_password })
        if (error) throw error

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'update_permissions': {
        const { user_id, permissions } = params
        if (!isUuid(user_id)) return bad('Usuário inválido')

        // Delete existing and re-insert
        await adminClient.from('user_permissions').delete().eq('user_id', user_id)

        const permRows = sanitizePermissions(permissions).map((p) => ({ user_id, ...p }))
        if (permRows.length > 0) {
          await adminClient.from('user_permissions').insert(permRows)
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }


      case 'list_users': {
        const { data: profiles } = await adminClient.from('profiles').select('*').order('full_name')
        const { data: roles } = await adminClient.from('user_roles').select('*')
        const { data: permissions } = await adminClient.from('user_permissions').select('*')

        // Get auth users for email
        const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers()

        const result = profiles?.map(p => {
          const authUser = authUsers?.find(u => u.id === p.user_id)
          return {
            ...p,
            email: authUser?.email || '',
            role: roles?.find(r => r.user_id === p.user_id)?.role || 'agente',
            permissions: permissions?.filter(perm => perm.user_id === p.user_id) || [],
            banned: authUser?.banned_until ? new Date(authUser.banned_until) > new Date() : false,
          }
        })

        return new Response(JSON.stringify({ users: result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'delete_user': {
        const { user_id } = params
        if (!isUuid(user_id)) return bad('Usuário inválido')
        if (user_id === caller.id) return bad('Você não pode excluir a própria conta')


        // Delete from related tables first
        await adminClient.from('user_permissions').delete().eq('user_id', user_id)
        await adminClient.from('user_roles').delete().eq('user_id', user_id)
        await adminClient.from('profiles').delete().eq('user_id', user_id)

        // Delete auth user
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id)
        if (deleteError) throw deleteError

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'Ação inválida' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    console.error('manage-users error:', error)
    return new Response(JSON.stringify({ error: 'Erro ao processar a solicitação' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
