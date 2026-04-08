import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/skills/marketplace - List published + builtin skills (public, no auth required)
export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: 'database_config_missing', message: 'Supabase 配置缺失，请检查环境变量' },
      { status: 503 },
    )
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const url = new URL(request.url)
  const category = url.searchParams.get('category')
  const search = url.searchParams.get('search')

  let query = supabase
    .from('skills')
    .select('*')
    .or('is_published.eq.true,skill_type.eq.builtin')
    .order('created_at')

  if (category) {
    query = query.eq('category', category)
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
  }

  try {
    const { data, error } = await query

    if (error) {
      const isConnectionError =
        error.message?.includes('fetch failed') ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('ECONNREFUSED')
      return NextResponse.json(
        {
          error: isConnectionError ? 'database_unreachable' : 'query_failed',
          message: isConnectionError
            ? '数据库连接失败，Supabase 项目可能已暂停，请前往 Supabase Dashboard 恢复'
            : error.message,
        },
        { status: 503 },
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        data: [],
        needSeed: true,
        message: '技能表为空，请调用 POST /api/seed 初始化内置技能',
      })
    }

    return NextResponse.json(data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const isConnectionError = msg.includes('fetch failed') || msg.includes('ENOTFOUND')
    return NextResponse.json(
      {
        error: isConnectionError ? 'database_unreachable' : 'unexpected_error',
        message: isConnectionError
          ? '数据库连接失败，Supabase 项目可能已暂停，请前往 Supabase Dashboard 恢复'
          : `请求异常: ${msg}`,
      },
      { status: 503 },
    )
  }
}
