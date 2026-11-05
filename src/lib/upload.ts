/* Preparing photos and videos in the browser before they are uploaded (the server never receives the files).
   A photo becomes two WebP pictures, like the site's own: 1500 px wide and an 800 px copy beside it
   (src/lib/media.ts finds the copy by its name). A video is uploaded as it is, with a still from it for its
   thumbnail and before it plays. */

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;   // the media bucket's limit (supabase part 8)
export const MAX_IMAGE_BYTES = 40 * 1024 * 1024;

export interface Prepared {
  kind: 'image' | 'video';
  name: string;                        // for messages: the file's own name
  files: { path: string; blob: Blob; type: string }[];
  path: string; posterPath: string | null;
  width: number | null; height: number | null; duration: number | null;
}

const toBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((ok, fail) => canvas.toBlob(b => (b ? ok(b) : fail(new Error('This browser couldn’t prepare the picture.'))), 'image/webp', quality));

function draw(source: CanvasImageSource, w: number, h: number, maxWidth: number) {
  const scale = Math.min(1, maxWidth / w);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export async function prepareImage(file: File, folder: string): Promise<Prepared> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error(`${file.name}: use a JPEG, PNG, WebP or AVIF picture.`);
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name}: the picture is larger than 40 MB.`);
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error(`${file.name}: this picture couldn’t be opened.`); }
  if (bitmap.width < 400) throw new Error(`${file.name}: the picture is only ${bitmap.width} px wide; use one at least 1200 px wide.`);
  const id = crypto.randomUUID();
  const big = draw(bitmap, bitmap.width, bitmap.height, 1500);
  const small = draw(bitmap, bitmap.width, bitmap.height, 800);
  bitmap.close();
  const path = `${folder}/${id}.webp`;
  return {
    kind: 'image', name: file.name, path, posterPath: null, width: big.width, height: big.height, duration: null,
    files: [{ path, blob: await toBlob(big, 0.88), type: 'image/webp' }, { path: `${folder}/${id}-800.webp`, blob: await toBlob(small, 0.84), type: 'image/webp' }],
  };
}

export async function prepareVideo(file: File, folder: string): Promise<Prepared> {
  if (!VIDEO_TYPES.includes(file.type)) throw new Error(`${file.name}: use an MP4, WebM or MOV video.`);
  if (file.size > MAX_VIDEO_BYTES) throw new Error(`${file.name}: the video is larger than 50 MB. Shorten it or export it smaller.`);
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement('video');
    video.muted = true; video.playsInline = true; video.preload = 'auto'; video.src = url;
    await new Promise<void>((ok, fail) => { video.onloadeddata = () => ok(); video.onerror = () => fail(new Error(`${file.name}: this video couldn’t be opened here. Try an MP4.`)); });
    const at = Math.min(1, (video.duration || 2) / 4);
    await new Promise<void>(ok => { video.onseeked = () => ok(); video.currentTime = at; });
    const still = draw(video, video.videoWidth, video.videoHeight, 1500);
    const id = crypto.randomUUID();
    const ext = file.type === 'video/webm' ? 'webm' : file.type === 'video/quicktime' ? 'mov' : 'mp4';
    const path = `${folder}/${id}.${ext}`, posterPath = `${folder}/${id}-poster.webp`;
    return {
      kind: 'video', name: file.name, path, posterPath, width: video.videoWidth || null, height: video.videoHeight || null,
      duration: Number.isFinite(video.duration) && video.duration > 0 ? Math.round(video.duration * 100) / 100 : null,
      files: [{ path, blob: file, type: file.type }, { path: posterPath, blob: await toBlob(still, 0.86), type: 'image/webp' }],
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
