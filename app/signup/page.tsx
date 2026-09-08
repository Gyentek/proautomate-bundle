import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { SignupForm } from './_components/signup-form'

export default async function SignupPage() {
  const session = await auth()
  if (session) redirect('/dashboard')
  return <SignupForm />
}
