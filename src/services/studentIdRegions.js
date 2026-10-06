// Local browser preprocessing for portrait CSU IDs. No image leaves the browser.
export async function prepareStudentIdRegions(file, { nameThreshold = 140 } = {}) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const ratio = bitmap.width / bitmap.height;
    if (ratio < 0.5 || ratio > 0.9) return null;
    const sample = document.createElement("canvas");
    sample.width = 400;
    sample.height = Math.round(400 / ratio);
    const ctx = sample.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, sample.width, sample.height);
    const { data } = ctx.getImageData(0, 0, sample.width, sample.height);
    const rows = [];
    for (let y = 0; y < sample.height; y++) {
      let dark = 0, count = 0;
      for (let x = 0.2 * sample.width; x < 0.88 * sample.width; x++) {
        const i = (y * sample.width + Math.floor(x)) * 4;
        if ((data[i] + data[i+1] + data[i+2]) / 3 < 105) dark++;
        count++;
      }
      rows.push(dark/count);
    }
    // A wide, dark horizontal strip distinguishes the name from the portrait.
    const candidates = [];
    let start = null;
    for (let y = Math.floor(sample.height * 0.58); y < sample.height * 0.84; y++) {
      if (rows[y] > 0.64) { if (start === null) start = y; }
      else if (start !== null) { candidates.push([start,y]); start = null; }
    }
    const band = candidates.filter(([a,b]) => b-a >= sample.height*0.012).sort((a,b) => (b[1]-b[0])-(a[1]-a[0]))[0];
    if (!band) return null;
    const crop = async (label, x, y, width, height, invert) => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1800 / (bitmap.width * width));
      const pad = 24;
      canvas.width = Math.round(bitmap.width * width * scale) + pad * 2;
      canvas.height = Math.round(bitmap.height * height * scale) + pad * 2;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.fillStyle = "white";
      context.fillRect(0,0,canvas.width,canvas.height);
      context.drawImage(bitmap, x*bitmap.width,y*bitmap.height,width*bitmap.width,height*bitmap.height,pad,pad,canvas.width-pad*2,canvas.height-pad*2);
      const pixels = context.getImageData(pad,pad,canvas.width-pad*2,canvas.height-pad*2);
      for (let i=0;i<pixels.data.length;i+=4) {
        const gray = 0.299*pixels.data[i]+0.587*pixels.data[i+1]+0.114*pixels.data[i+2];
        const value = invert ? (255-gray < nameThreshold ? 0 : 255) : (gray < 90 ? 0 : 255);
        pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;
      }
      context.putImageData(pixels,pad,pad);
      const blob = await new Promise(resolve => canvas.toBlob(resolve,"image/png"));
      if (!blob) throw new Error("Could not prepare ID region");
      return new File([blob],`${label}.png`,{type:"image/png"});
    };
    const top = Math.max(0, band[0]/sample.height+0.006);
    const bottom = Math.min(1, band[1]/sample.height-0.006);
    return {
      name: await crop("name-strip",0.25,top,0.55,bottom-top,true),
      academic: await crop("academic-strip",0.3,0.925,0.42,0.036,false),
    };
  } finally { bitmap.close(); }
}
