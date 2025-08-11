import dotenv from "dotenv";
import path from 'node:path';
import type { PrismaConfig } from 'prisma';

dotenv.config();
export default {
  schema: path.join('prisma'),
} satisfies PrismaConfig