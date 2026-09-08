import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { SocialMediaClient } from './_components/social-media-client'

export default async function SocialMediaPage() {
  const session = await auth()
  if (!session) redirect('/login')
  return (
    <>
      <Navbar />
      <SocialMediaClient />
    </>
  )
}
