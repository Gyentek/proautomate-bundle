import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { ContentGeneratorClient } from './_components/content-generator-client'

export default async function ContentGeneratorPage() {
  const session = await auth()
  if (!session) redirect('/login')
  return (
    <>
      <Navbar />
      <ContentGeneratorClient />
    </>
  )
}
