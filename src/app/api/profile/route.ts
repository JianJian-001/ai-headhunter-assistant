import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_NICKNAME_LENGTH = 20
const MAX_AVATAR_DATA_URL_LENGTH = 400_000
const AVATAR_DATA_URL_PATTERN = /^data:image\/(webp|jpeg|jpg);base64,[A-Za-z0-9+/=]+$/

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('nickname, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Failed to load profile', error)
    return NextResponse.json({ error: '读取资料失败，请稍后重试。' }, { status: 500 })
  }

  return NextResponse.json({
    nickname: data?.nickname || user.user_metadata?.nickname || '猎头顾问',
    avatar_url: data?.avatar_url ?? null,
  })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : ''
  const hasAvatarUrl = Object.prototype.hasOwnProperty.call(body, 'avatar_url')
  const avatarUrl = body.avatar_url

  if (!nickname) {
    return NextResponse.json({ error: '昵称不能为空' }, { status: 400 })
  }

  if (nickname.length > MAX_NICKNAME_LENGTH) {
    return NextResponse.json({ error: `昵称不能超过 ${MAX_NICKNAME_LENGTH} 个字符` }, { status: 400 })
  }

  if (hasAvatarUrl && avatarUrl !== null && typeof avatarUrl !== 'string') {
    return NextResponse.json({ error: '头像格式无效' }, { status: 400 })
  }

  if (hasAvatarUrl && typeof avatarUrl === 'string') {
    if (!AVATAR_DATA_URL_PATTERN.test(avatarUrl)) {
      return NextResponse.json({ error: '头像格式无效' }, { status: 400 })
    }

    if (avatarUrl.length > MAX_AVATAR_DATA_URL_LENGTH) {
      return NextResponse.json({ error: '头像数据过大，请换一张更小的图片' }, { status: 400 })
    }
  }

  const payload: { id: string; nickname: string; avatar_url?: string | null } = {
    id: user.id,
    nickname,
  }

  if (hasAvatarUrl) {
    payload.avatar_url = avatarUrl
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' })
    .select('nickname, avatar_url')
    .single()

  if (error) {
    console.error('Failed to save profile', error)
    return NextResponse.json({ error: '保存资料失败，请稍后重试。' }, { status: 500 })
  }

  return NextResponse.json(data)
}
