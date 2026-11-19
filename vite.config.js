import { defineConfig } from 'vite';
import fs from 'fs';
import { exec } from 'child_process';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
  },
  plugins: [
    {
      name: 'rig-tool-api',
      configureServer(server) {
        server.middlewares.use('/api/save-joints', (req, res) => {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                fs.writeFileSync('public/models/animated/custom_joints.json', body, 'utf8');
                console.log('[API] Saved public/models/animated/custom_joints.json');
                exec('node scripts/build_bala_hanuman_from_joints.js', (err, stdout, stderr) => {
                  res.setHeader('Content-Type', 'application/json');
                  if (err) {
                    console.error('[API] Build error:', err, stderr);
                    res.statusCode = 500;
                    res.end(JSON.stringify({ success: false, error: err.message, stderr, stdout }));
                  } else {
                    console.log('[API] Rig build stdout:', stdout);
                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true, message: 'bala-hanuman.glb generated successfully!', stdout }));
                  }
                });
              } catch (e) {
                console.error('[API] Error:', e);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: e.message }));
              }
            });
          } else {
            res.statusCode = 405;
            res.end('Method Not Allowed');
          }
        });
      }
    }
  ]
});
