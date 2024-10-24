import { disconnectDB } from './src/config/db';

export default async function () {
  setTimeout(async () => {
    await disconnectDB();
    process.exit(0);
  }, 5000);
}
