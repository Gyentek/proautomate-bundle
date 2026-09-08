import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { EtsyEmailClient } from './_components/etsy-email-client'

export default async function EtsyEmailPage() {
  const session = await auth()
  if (!session) redirect('/login')
  return (
    <>
      <Navbar />
      <EtsyEmailClient />
    </>
  )
}
