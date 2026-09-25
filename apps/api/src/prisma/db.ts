import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const contractJson = require('./contract.json');

export const db = postgres<Contract>({
  contractJson,
  url: process.env['DATABASE_URL']!,
});
