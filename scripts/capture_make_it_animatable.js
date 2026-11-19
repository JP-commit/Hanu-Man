import { Client } from '@gradio/client';
import fs from 'fs';
import https from 'https';

const HF_TOKEN = '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';
const MODEL_PATH = 'public/models/hanuman_white_mesh_50k.glb';

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, {
      headers: {
        'Authorization': `Bearer ${HF_TOKEN}`
      }
    }, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Saved ${dest} (${fs.statSync(dest).size} bytes)`);
        resolve(dest);
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('Connecting to jasongzy/Make-It-Animatable-v2 with HF Token...');
  const client = await Client.connect('jasongzy/Make-It-Animatable-v2', {
    token: HF_TOKEN
  });

  const buf = fs.readFileSync(MODEL_PATH);
  const file = new File([buf], 'hanuman_white_mesh_50k.glb', { type: 'model/gltf-binary' });
  const fd = new FormData();
  fd.append('files', file);

  console.log('Uploading 3D model to v2 space...');
  const uploadRes = await fetch('https://jasongzy-make-it-animatable-v2.hf.space/gradio_api/upload', {
    method: 'POST',
    body: fd,
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`
    }
  });

  const uploadedFiles = await uploadRes.json();
  const remotePath = uploadedFiles[0];
  console.log('Uploaded remote path:', remotePath);

  const fileObj = {
    path: remotePath,
    url: `https://jasongzy-make-it-animatable-v2.hf.space/gradio_api/file=${remotePath}`,
    orig_name: 'hanuman_white_mesh_50k.glb',
    meta: { _type: 'gradio.FileData' }
  };

  const animFile = {
    path: '/tmp/gradio/f992075f53a82ba96d522df069c42284736a90ee558138ad6cb10b887a680980/Standard Run.fbx',
    url: 'https://jasongzy-make-it-animatable-v2.hf.space/gradio_api/file=/tmp/gradio/f992075f53a82ba96d522df069c42284736a90ee558138ad6cb10b887a680980/Standard%20Run.fbx',
    orig_name: 'Standard Run.fbx',
    meta: { _type: 'gradio.FileData' }
  };

  console.log('Submitting /pipeline job on v2 with submit generator...');
  const job = client.submit('/pipeline', [
    null,       // 0: state
    fileObj,    // 1: input 3D model
    true,       // 2: no fingers
    'T-pose',   // 3: input rest pose
    [],         // 4: input rest parts
    false,      // 5: input is gs
    0.01,       // 6: opacity threshold
    false,      // 7: restore global transform
    true,       // 8: use normal
    true,       // 9: weight post-processing
    'LeftArm',  // 10: bone name
    true,       // 11: reset to rest
    animFile,   // 12: animation file (Standard Run.fbx)
    true,       // 13: retarget animation
    true        // 14: in place
  ]);

  let yieldCount = 0;
  fs.mkdirSync('public/models/animated', { recursive: true });

  for await (const msg of job) {
    if (msg.type === 'data') {
      yieldCount++;
      console.log(`\n=== Yield #${yieldCount} ===`);
      const data = msg.data;
      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          const item = data[i];
          if (item && typeof item === 'object') {
            const keys = Object.keys(item);
            console.log(`  Item ${i}: keys=[${keys.join(', ')}]`);
            if (item.value) {
              console.log(`    value:`, JSON.stringify(item.value));
              if (item.value.url) {
                const fname = item.value.orig_name || `yield_${yieldCount}_item_${i}.glb`;
                const dest = `public/models/animated/${fname}`;
                console.log(`    -> Downloading to ${dest}...`);
                try {
                  await downloadFile(item.value.url, dest);
                } catch(err) {
                  console.error('Download error:', err.message);
                }
              }
            } else if (item.url) {
              console.log(`    direct url:`, item.url);
              const fname = item.orig_name || `yield_${yieldCount}_item_${i}.glb`;
              const dest = `public/models/animated/${fname}`;
              console.log(`    -> Downloading to ${dest}...`);
              try {
                await downloadFile(item.url, dest);
              } catch(err) {
                console.error('Download error:', err.message);
              }
            }
          }
        }
      }
    } else {
      console.log(`Status event: ${msg.type} ${msg.stage || ''}`);
    }
  }

  console.log('All yields completed!');
}

run().catch(console.error);
