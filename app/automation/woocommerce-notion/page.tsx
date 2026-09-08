import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { WooNotionClient } from './_components/woo-notion-client'

export default async function WooNotionPage() {
  const session = await auth()
  if (!session) redirect('/login')
  return (
    <>
      <Navbar />
      <WooNotionClient />
    </>
  )
}
