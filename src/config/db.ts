import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose, { ConnectOptions, Mongoose } from 'mongoose';
import Logger, { addMongoDbTransport } from './log';

export let mongod: MongoMemoryServer;

export let conn: Mongoose;

export async function connectDB() {
  const namespace: string = 'db.connectDB';
  Logger.info('Connecting to database', { namespace });
  try {
    // Disable strict query mode in Mongoose
    mongoose.set('strictQuery', false);

    if (process.env.NODE_ENV === 'test') {
      // Connect to a MongoDB Memory Server for testing
      mongod = await MongoMemoryServer.create();
      const mongoUri = mongod.getUri();
      conn = await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      } as ConnectOptions);
    } else if (process.env.NODE_ENV === 'development') {
      // Connect to the development MongoDB server
      conn = await mongoose.connect(
        process.env.DEV_MONGO_URI as string,
        {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        } as ConnectOptions
      );
      addMongoDbTransport(process.env.DEV_MONGO_URI as string);
    } else if (process.env.NODE_ENV === 'prod') {
      // Connect to the production MongoDB server
      conn = await mongoose.connect(
        process.env.MONGO_URI as string,
        {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        } as ConnectOptions
      );
      await addMongoDbTransport(process.env.MONGO_URI as string);
    }
    Logger.info(`Database connected successfully: ${conn.connection.host}`, { namespace });
  } catch (error) {
    // Handle MongoDB connection errors
    Logger.error(`MongoDB Connection Error: ${error}`, { namespace });
    process.exit(1);
  }
}

export async function disconnectDB() {
  if (conn) {
    if (mongod.state === 'running') {
      // Drop the database and stop the MongoDB Memory Server
      await conn.connection.dropDatabase();
      await mongod.stop();
    }
    await conn.connection.close();
  }
}
