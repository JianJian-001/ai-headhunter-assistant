import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { BUILTIN_SKILLS } from '@/lib/builtin-skills'

// POST /api/seed - Seed builtin skills (dev only)
export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
  }

  // Use service role to bypass RLS
  const supabase = createClient(supabaseUrl, serviceKey)

  const builtinSkills = BUILTIN_SKILLS.map((skill) => ({
    slug: skill.slug,
    name: skill.name,
    description: skill.description,
    icon: skill.icon,
    category: skill.category,
    skill_type: 'builtin',
    invocation_method: skill.invocationMethod,
    manifest: skill.manifest,
    is_published: true,
    price: 0,
    enabled: true,
  }))

  // Upsert skills by slug
  const { data, error } = await supabase
    .from('skills')
    .upsert(builtinSkills, { onConflict: 'slug' })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message, details: error }, { status: 500 })
  }

  return NextResponse.json({ message: `Seeded ${data.length} skills`, skills: data })
}
