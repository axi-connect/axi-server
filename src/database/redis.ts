import { createClient } from 'redis';

const client = createClient({
  socket: {
    connectTimeout: 10000,
  },
})

export const redisDB = await client
  .on('error', err => console.log('Redis Client Error', err))
  .on('ready', ()=> console.log('Redis Client Connected'))
  .connect();

// await client.disconnect();