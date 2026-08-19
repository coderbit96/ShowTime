import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

type CachedConnection = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as typeof globalThis & {
  mongooseConnection?: CachedConnection;
};

const cached = globalForMongoose.mongooseConnection ?? {
  conn: null,
  promise: null,
};

globalForMongoose.mongooseConnection = cached;

export async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is required.");
  }

  if (cached.conn) {
    return cached.conn;
  }

  cached.promise ??= mongoose.connect(MONGODB_URI!, {
    bufferCommands: false,
  });

  cached.conn = await cached.promise;
  return cached.conn;
}
