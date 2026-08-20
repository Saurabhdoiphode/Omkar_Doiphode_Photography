// Netlify Function entry (CommonJS) — bundles server.ts + express as CJS so
// express/body-parser dynamic requires work (an ESM esbuild bundle crashes with
// "Dynamic require ... is not supported" -> 502).
const serverless = require('serverless-http');
const { app } = require('../src/server.ts');

exports.handler = serverless(app);