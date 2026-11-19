// scripts/generate_hunyuan_glb.js
import { Client } from '@gradio/client';
import fs from 'fs';
import path from 'path';

async function generate() {
  console.log('1. Connecting to tencent/Hunyuan3D-2 on Hugging Face...');
  const client = await Client.connect('tencent/Hunyuan3D-2');
  
  console.log('2. Reading front T-pose image...');
  const imageBuffer = fs.readFileSync('reference/Hanuman_TPose_Front.png');
  const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
  
  console.log('3. Submitting 3D generation request to Hunyuan3D-2...');
  const startTime = Date.now();
  
  const result = await client.predict('/generation_all', {
    caption: 'Bala Hanuman young boy monkey hero in T-pose with topknot, orange sash, dhoti and tail',
    image: imageBlob,
    mv_image_front: null,
    mv_image_back: null,
    mv_image_left: null,
    mv_image_right: null,
    steps: 25,
    guidance_scale: 5.0,
    seed: 42,
    octree_resolution: 256,
    check_box_rembg: true,
    num_chunks: 8000,
    randomize_seed: true
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`4. Hunyuan3D-2 completed in ${elapsed}s! Result:`, JSON.stringify(result, null, 2));

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
      console.log('Output data:', result.data);
    }
  }
}

generate().catch(err => {
  console.error('Hunyuan3D-2 Error:', err);
  process.exit(1);
});
