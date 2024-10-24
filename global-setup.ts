import dotenv from 'dotenv';
import { connectDB } from './src/config/db';
import { server } from './src/app';
import 'jest';

// beforeAll(() => {
//   return initDatabase();
// });

// afterAll(() => {
//   server.close();
// });

export default async function () {
  dotenv.config({ path: __dirname + '.test.env' });
  await connectDB();
}
