// scripts/generate_trellis_glb.js
import { Client } from '@gradio/client';
import fs from 'fs';
import path from 'path';

async function generate() {
  console.log('1. Connecting to trellis-community/TRELLIS on Hugging Face...');
  const client = await Client.connect('trellis-community/TRELLIS');
  
  console.log('2. Reading preprocessed T-pose image...');
  const imageBuffer = fs.readFileSync('reference/Hanuman_TPose_Preprocessed.png');
  const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
  
  console.log('3. Submitting 3D model generation request (this typically takes 30-90 seconds)...');
  const startTime = Date.now();
  
  const result = await client.predict('/generate_and_extract_glb', {
    image: imageBlob,
    multiimages: [],
    seed: 42,
    ss_guidance_strength: 7.5,
    ss_sampling_steps: 12,
    slat_guidance_strength: 3.0,
    slat_sampling_steps: 12,
    multiimage_algo: 'stochastic',
    mesh_simplify: 0.95,
    texture_size: 1024
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`4. Generation complete in ${elapsed}s! Result:`, JSON.stringify(result, null, 2));

  // The output contains video, litmodel3d, and download_glb
  // Download the GLB
  if (result.data && result.data.length >= 2) {
    const glbItem = result.data.find(item => item && (item.orig_name?.endsWith('.glb') || item.path?.endsWith('.glb') || item.url?.endsWith('.glb'))) || result.data[1] || result.data[2];
    
    if (glbItem && glbItem.url) {
      console.log('5. Downloading GLB from:', glbItem.url);
      const res = await fetch(glbItem.url);
      const glbBuffer = Buffer.from(await res.arrayBuffer());
      const outDir = 'public/models';
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      const outPath = path.join(outDir, 'hanuman_trellis.glb');
      fs.writeFileSync(outPath, glbBuffer);
      console.log(`6. Successfully saved 3D model to ${outPath} (${(glbBuffer.length / 1024 / 1024).toFixed(2)} MB)!`);
    } else {
      console.log('GLB item details:', glbItem);
    }
  }
}

generate().catch(err => {
  console.error('Generation error:', err);
  process.exit(1);
});
