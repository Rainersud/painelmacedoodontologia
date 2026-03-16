import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization')!
    const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user: caller } } = await callerClient.auth.getUser()
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // Check if caller is admin
    const { data: isAdmin } = await adminClient.rpc('is_admin', { _user_id: caller.id })
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Sem permissão' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { action, ...params } = await req.json()

    switch (action) {
      case 'create_user': {
        const { email, password, full_name, phone, role, permissions } = params

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
        if (permissions && Array.isArray(permissions)) {
          const permRows = permissions.map((p: any) => ({
            user_id: userId,
            module: p.module,
            can_view: p.can_view ?? true,
            can_edit: p.can_edit ?? false,
          }))
          await adminClient.from('user_permissions').insert(permRows)
        }

        return new Response(JSON.stringify({ success: true, user_id: userId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'update_user': {
        const { user_id, full_name, phone, is_active, role } = params

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
          const { data: existing } = await adminClient.from('user_roles').select('id').eq('user_id', user_id).single()
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
        const { error } = await adminClient.auth.admin.updateUserById(user_id, { password: new_password })
        if (error) throw error

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'update_permissions': {
        const { user_id, permissions } = params

        // Delete existing and re-insert
        await adminClient.from('user_permissions').delete().eq('user_id', user_id)

        if (permissions && permissions.length > 0) {
          const permRows = permissions.map((p: any) => ({
            user_id,
            module: p.module,
            can_view: p.can_view ?? true,
            can_edit: p.can_edit ?? false,
          }))
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

      default:
        return new Response(JSON.stringify({ error: 'Ação inválida' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
