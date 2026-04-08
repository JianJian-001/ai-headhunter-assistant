'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CreatedSkillsPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/my-skills/added')
  }, [router])

  return null
}
