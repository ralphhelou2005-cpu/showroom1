/* The admin page (admin.html): the site's look plus its own styles, then the admin itself.
   It shares the Supabase settings (src/config.ts) and the picture list (src/data/images.ts) with the website.
   Without ?old it sends you to the new dashboard (./redirect.ts), and the old editor's code isn't even loaded. */
import '../styles/site.css';
import './admin.css';
import { leaving } from './redirect';

if (!leaving) import('./admin.js');
