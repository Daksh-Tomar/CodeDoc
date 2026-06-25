import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as jwt from 'jsonwebtoken';

async function main() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://codedoc:password@localhost:5432/codedoc?schema=public';
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('Seeding database...');
  
  await prisma.fileNode.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.workspace.deleteMany({});
  await prisma.user.deleteMany({});

  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    }
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Test Workspace',
      ownerId: user.id,
    }
  });

  const project = await prisma.project.create({
    data: {
      name: 'Test Project',
      workspaceId: workspace.id,
    }
  });

  const file = await prisma.fileNode.create({
    data: {
      name: 'main.ts',
      type: 'FILE',
      content: '// Welcome to CodeDoc Workspace\n// hello theere',
      projectId: project.id,
    }
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'test2@example.com',
      password: 'password123',
      name: 'Test User 2',
    }
  });

  const token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET || 'super-secret-jwt-key-for-codedoc', { expiresIn: '1d' });
  const token2 = jwt.sign({ sub: user2.id, email: user2.email }, process.env.JWT_SECRET || 'super-secret-jwt-key-for-codedoc', { expiresIn: '1d' });

  console.log('--- SEED SUCCESS ---');
  console.log('DOCUMENT_ID:', file.id);
  console.log('JWT_TOKEN (User 1):', token);
  console.log('JWT_TOKEN_2 (User 2):', token2);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
