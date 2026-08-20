import serverless from 'serverless-http';
import { app } from '../src/server.ts';

export const handler = serverless(app);
