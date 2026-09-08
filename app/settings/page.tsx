import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { SettingsClient } from './_components/settings-client'

export default async function SettingsPage() {
  const session = await auth()
  if (!session) redirect('/login')
  return (
    <>
      <Navbar />
      <SettingsClient />
    </>
  )
}
