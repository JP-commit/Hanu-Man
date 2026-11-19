import { Client } from '@gradio/client';
import fs from 'fs';
import https from 'https';

const HF_TOKEN = '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';

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
  console.log('Connecting to trellis-community/TRELLIS...');
  const client = await Client.connect('trellis-community/TRELLIS', { token: HF_TOKEN });

  console.log('Preprocessing front reference image...');
  const imgBuf = fs.readFileSync('reference/Hanuman_TPose_Front.png');
  const imgBlob = new Blob([imgBuf], { type: 'image/png' });
  const prepRes = await client.predict('/preprocess_image', { image: imgBlob });
  const preprocessedFile = prepRes.data[0];
  console.log('Preprocessed image:', preprocessedFile.url);

  console.log('Calling /generate_and_extract_glb with texture_size=1024...');
  const genRes = await client.predict('/generate_and_extract_glb', [
    preprocessedFile,   // image
    [],                 // multiimages
    null,               // state
    42,                 // seed
    7.5,                // ss_guidance_strength
    12,                 // ss_sampling_steps
    3.0,                // slat_guidance_strength
    12,                 // slat_sampling_steps
    'stochastic',       // multiimage_algo
    0.95,               // mesh_simplify
    1024                // texture_size
  ]);

  console.log('Generation completed!');
  console.log('Returns count:', genRes.data.length);
  for (let i = 0; i < genRes.data.length; i++) {
    console.log(`  [${i}]:`, genRes.data[i]);
  }

  const glbFile = genRes.data[2] || genRes.data[1];
  if (glbFile && (glbFile.url || glbFile.path)) {
    const downloadUrl = glbFile.url;
    console.log('Downloading textured GLB from:', downloadUrl);
    fs.mkdirSync('public/models/textured', { recursive: true });
    await downloadFile(downloadUrl, 'public/models/textured/hanuman_trellis_textured.glb');
    console.log('Downloaded public/models/textured/hanuman_trellis_textured.glb successfully!');
  }
}

run().catch(e => console.error('Trellis run error:', e));
