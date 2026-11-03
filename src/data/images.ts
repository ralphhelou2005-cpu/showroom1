/* Every picture in src/assets, found by its plain path ("assets/cars/svj.webp").
   The database keeps those plain paths for the starting cars; the build gives each file its own cache-safe name. */
const files = import.meta.glob('../assets/**/*.{webp,jpg,jpeg,png,avif}', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const byPath: Record<string, string> = {};
for (const [file, url] of Object.entries(files)) byPath[file.replace(/^\.\.\//, '')] = url;

/* a site picture's real address; uploaded photos are already full web addresses */
export const asset = (path: string): string => byPath[path] ?? path;
/* every photo has an 800 px copy beside it: svj.webp and svj-800.webp */
export const smallPath = (path: string): string => path.replace(/\.(webp|jpe?g|png|avif)$/i, '-800.$1');
export const photo = (path: string): string => asset(path);
export const photoSmall = (path: string): string => asset(smallPath(path));
/* "800w, 1500w" srcset for a photo */
export const photoSet = (path: string, big = 1500): string => `${photoSmall(path)} 800w, ${photo(path)} ${big}w`;
