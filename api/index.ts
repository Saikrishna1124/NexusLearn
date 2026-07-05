import { app, startServer } from '../server';

let initPromise: Promise<any> | null = null;

export default async function handler(req: any, res: any) {
  if (!initPromise) {
    console.log("Vercel Serverless: Initializing NexusLearn server...");
    initPromise = startServer();
  }
  await initPromise;
  
  return app(req, res);
}
