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

  const builtinSlugs = builtinSkills.map((skill) => skill.slug)

  const { data: existingBuiltinRows, error: existingBuiltinError } = await supabase
    .from('skills')
    .select('slug')
    .eq('skill_type', 'builtin')

  if (existingBuiltinError) {
    return NextResponse.json({ error: existingBuiltinError.message, details: existingBuiltinError }, { status: 500 })
  }

  // Upsert skills by slug
  const { data, error } = await supabase
    .from('skills')
    .upsert(builtinSkills, { onConflict: 'slug' })
    .select()

  if (error) {
    return NextResponse.json({ error: error.message, details: error }, { status: 500 })
  }

  const obsoleteBuiltinSlugs = (existingBuiltinRows ?? [])
    .map((row) => row.slug)
    .filter((slug) => !builtinSlugs.includes(slug))

  if (obsoleteBuiltinSlugs.length > 0) {
    const { error: deleteError } = await supabase
      .from('skills')
      .delete()
      .in('slug', obsoleteBuiltinSlugs)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message, details: deleteError }, { status: 500 })
    }
  }

  return NextResponse.json({
    message: `Seeded ${data.length} skills`,
    skills: data,
    removed: obsoleteBuiltinSlugs,
  })
}
