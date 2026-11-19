// scripts/run_hunyuan21.js
import { Client } from '@gradio/client';
import fs from 'fs';
import path from 'path';

async function generate() {
  console.log('1. Connecting to tencent/Hunyuan3D-2.1...');
  const client = await Client.connect('tencent/Hunyuan3D-2.1');
  
  console.log('2. Reading preprocessed T-pose image...');
  const imageBuffer = fs.readFileSync('reference/Hanuman_TPose_Preprocessed.png');
  const imageBlob = new Blob([imageBuffer], { type: 'image/png' });

  console.log('3. Submitting 3D model generation request to Hunyuan3D-2.1...');
  const startTime = Date.now();
  
  const result = await client.predict('/generation_all', [
    null,                     // 0: internal state
    imageBlob,                // 1: image
    null,                     // 2: mv_image_front
    null,                     // 3: mv_image_back
    null,                     // 4: mv_image_left
    null,                     // 5: mv_image_right
    30,                       // 6: steps
    5.0,                      // 7: guidance_scale
    42,                       // 8: seed
    256,                      // 9: octree_resolution
    false,                    // 10: check_box_rembg (already preprocessed)
    8000,                     // 11: num_chunks
    true                      // 12: randomize_seed
  ]);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`4. Generation completed in ${elapsed}s! Result:`, JSON.stringify(result, null, 2));

  if (result.data) {
    const glbItem = result.data.find(item => item && (typeof item === 'object') && (item.orig_name?.endsWith('.glb') || item.path?.endsWith('.glb') || item.url?.endsWith('.glb'))) || result.data[0];
    
    if (glbItem && glbItem.url) {
      console.log('5. Downloading GLB from:', glbItem.url);
      const res = await fetch(glbItem.url);
      const glbBuffer = Buffer.from(await res.arrayBuffer());
      const outDir = 'public/models';
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, 'hanuman_hunyuan.glb');
      fs.writeFileSync(outPath, glbBuffer);
      console.log(`6. Successfully saved 3D model to ${outPath} (${(glbBuffer.length / 1024 / 1024).toFixed(2)} MB)!`);
    } else {
      console.log('Result data items:', result.data);
    }
  }
}

generate().catch(err => {
  console.error('Hunyuan3D-2.1 error:', err);
  process.exit(1);
});
