import { app, startServer } from '../server';

let initialized = false;

export default async function handler(req: any, res: any) {
  if (!initialized) {
    console.log("Vercel Serverless: Initializing NexusLearn server...");
    await startServer();
    initialized = true;
  }
  return app(req, res);
}
