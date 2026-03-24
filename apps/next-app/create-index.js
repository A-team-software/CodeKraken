import { MongoClient } from 'mongodb';

async function createIndex() {
  const uri = process.env.MONGO_URI || "mongodb://root:mongodb@localhost:27017";
  const dbName = process.env.MONGO_DB_NAME || "sca_development";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);
    await db.collection('users').createIndex(
      { atlassianAccountId: 1 }, 
      { unique: true, sparse: true }
    );
    console.log("Index created on atlassianAccountId");
  } catch (e) {
    console.error("Failed to create index", e);
  } finally {
    await client.close();
  }
}

createIndex();
