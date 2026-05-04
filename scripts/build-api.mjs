// Bundle de api/_handler.ts → api/index.js (ESM) para Vercel serverless.
//
// El banner inyecta shims para __dirname / __filename / require porque
// algunas deps transitivas (ej. app-root-path vía garmin-connect) los usan
// sin saber que el output es ESM. Sin esto, Vercel crashea con
// "ReferenceError: __dirname is not defined in ES module scope".

import { build } from 'esbuild';

const banner = `import { createRequire as __nodeCreateRequire } from 'module';
import { fileURLToPath as __nodeFileURLToPath } from 'url';
import { dirname as __nodeDirname } from 'path';
const require = __nodeCreateRequire(import.meta.url);
const __filename = __nodeFileURLToPath(import.meta.url);
const __dirname = __nodeDirname(__filename);`;

await build({
  entryPoints: ['api/_handler.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'api/index.js',
  banner: { js: banner },
  external: [
    'express',
    'cors',
    'dotenv',
    '@supabase/supabase-js',
    'groq-sdk',
  ],
  logLevel: 'info',
});
