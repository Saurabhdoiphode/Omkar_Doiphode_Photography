// Netlify Function entry (CommonJS) — bundles server.ts + express as CJS so
// express/body-parser dynamic requires work (an ESM esbuild bundle crashes with
// "Dynamic require ... is not supported" -> 502).
const serverless = require('serverless-http');
const { app } = require('../src/server.ts');

exports.handler = serverless(app, {
  // Image responses must be base64-encoded (isBase64Encoded) or the PNG/JPG
  // bytes are converted through UTF-8 text and corrupted (every non-UTF8
  // single byte becomes the U+FFFD replacement char).
  binary: ['image/*']
});