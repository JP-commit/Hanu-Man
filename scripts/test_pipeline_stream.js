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

async function main() {
  console.log('Connecting to jasongzy/Make-It-Animatable-v2...');
  const client = await Client.connect('jasongzy/Make-It-Animatable-v2', {
    token: HF_TOKEN
  });

  // 1. Get animation file metadata from lambda_6
  console.log('Fetching Standard Run animation file info from lambda_6...');
  const lres = await client.predict('/lambda_6', [ 'Standard Run [c9ccc5dd].fbx' ]);
  const animFileData = lres.data[0];
  console.log('Anim file:', animFileData?.orig_name, animFileData?.path);

  // 2. Upload mesh
  console.log('Uploading hanuman_white_mesh_50k.glb...');
  const buf = fs.readFileSync(MODEL_PATH);
  const file = new File([buf], 'hanuman_white_mesh_50k.glb', { type: 'model/gltf-binary' });
  const fd = new FormData();
  fd.append('files', file);

  const upRes = await fetch('https://jasongzy-make-it-animatable-v2.hf.space/gradio_api/upload', {
    method: 'POST',
    body: fd,
    headers: {
      'Authorization': `Bearer ${HF_TOKEN}`
    }
  });
  const upFiles = await upRes.json();
  const remotePath = upFiles[0];
  console.log('Uploaded remote path:', remotePath);

  const fileObj = {
    path: remotePath,
    url: `https://jasongzy-make-it-animatable-v2.hf.space/gradio_api/file=${remotePath}`,
    orig_name: 'hanuman_white_mesh_50k.glb',
    meta: { _type: 'gradio.FileData' }
  };

  // 3. Submit to pipeline with all_events = true
  const params = [
    null,           // 0: state
    fileObj,        // 1: input 3d model
    true,           // 2: no fingers
    'T-pose',       // 3: input rest pose
    [],             // 4: input rest parts
    false,          // 5: input is gs
    0.01,           // 6: opacity threshold
    false,          // 7: restore global transform
    true,           // 8: use normal
    true,           // 9: weight post-processing
    'LeftArm',      // 10: bone name
    true,           // 11: reset to rest
    animFileData,   // 12: animation file
    true,           // 13: retarget animation
    true            // 14: in place
  ];

  console.log('Submitting /pipeline with all_events=true...');
  const job = client.submit('/pipeline', params, null, null, true);

  let yieldCount = 0;
  fs.mkdirSync('public/models/animated', { recursive: true });

  for await (const msg of job) {
    if (msg.type === 'log') {
      console.log(`[LOG] ${msg.log}`);
    } else if (msg.type === 'status') {
      console.log(`[STATUS] stage=${msg.stage} queue=${msg.queue} eta=${msg.eta || ''} message=${msg.message || ''}`);
      if (msg.stage === 'error') {
        console.error('SERVER ERROR:', msg);
      }
    } else if (msg.type === 'data') {
      yieldCount++;
      console.log(`\n=== DATA YIELD #${yieldCount} ===`);
      const data = msg.data;
      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          const item = data[i];
          if (item && typeof item === 'object') {
            const fileData = item.value || (item.url ? item : null);
            if (fileData && fileData.url) {
              const fname = fileData.orig_name || `yield_${yieldCount}_item_${i}.glb`;
              const dest = `public/models/animated/${fname}`;
              console.log(`  [Item ${i}] Found file: ${fname} (${fileData.path || fileData.url})`);
              console.log(`    -> Downloading to ${dest}...`);
              try {
                await downloadFile(fileData.url, dest);
              } catch(e) {
                console.error(`    Download error:`, e.message);
              }
            } else {
              console.log(`  [Item ${i}] (no file url) keys:`, Object.keys(item));
            }
          }
        }
      }
    } else {
      console.log(`[OTHER] type=${msg.type}`);
    }
  }

  console.log('\n--- Job Stream Ended ---');
}

main().catch(console.error);
