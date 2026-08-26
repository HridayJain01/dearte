import mongoose from 'mongoose';

let isConnected = false;

export async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.log(mongoUri);
    throw new Error('MONGODB_URI is required to start the API.');
  }

  // readyState 1 = connected. Reuse across warm Vercel isolates; reconnect if
  // the cached flag is stale after a dropped connection.
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri, {
    dbName: process.env.MONGODB_DB_NAME || undefined,
  });

  isConnected = true;
  return mongoose.connection;
}
