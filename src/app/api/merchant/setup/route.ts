import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/merchant/setup - Setup merchant account
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { channel } = await request.json()

  if (!['wechat', 'alipay'].includes(channel)) {
    return NextResponse.json({ error: 'Invalid channel' }, { status: 400 })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_merchant: true, merchant_channel: channel })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
