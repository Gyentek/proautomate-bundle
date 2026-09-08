import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Seed the mandatory test account
  const hashedPassword = await bcrypt.hash('HcU8NJ9uv$', 12)
  await prisma.user.upsert({
    where: { email: 'abacus-711799af@example.com' },
    update: { password: hashedPassword, name: 'Test Admin' },
    create: {
      email: 'abacus-711799af@example.com',
      password: hashedPassword,
      name: 'Test Admin',
    },
  })

  console.log('Seed completed successfully')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
