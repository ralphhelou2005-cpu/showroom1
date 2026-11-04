# Milcar: the website, the cars database and the admin page

> This guide is for the **current live site** (on `main`, GitHub Pages). The new platform being built on the
> `platform` branch is described in [README.md](README.md) and [DEVELOPMENT_PROGRESS.md](DEVELOPMENT_PROGRESS.md).
> On that branch the current site's commands are `npm run legacy:dev`, `legacy:build` and `legacy:preview`.

The website is built with **React** (Vite + TypeScript). The cars live in **Supabase** (an online database).
You manage them on the **admin page** (`admin.html`), and the inventory, the car pages and the windows of the
dealership picture all read them from there.

| File | What it is |
|---|---|
| `supabase/setup.sql` | Creates the cars table, the photo folder and the security rules, and adds the first six cars |
| `src/config.ts` | Your project's address and publishable key (both are meant to be public), and the site's web address |
| `src/data/cars.ts` | The car's shape and the one loader every page uses |
| `src/data/featured.ts` | Which car stands in which window of the dealership picture |
| `src/components/`, `src/pages/` | The parts of the site (Nav, Hero, Promise, Build, FeaturedShowroom, InventoryTeaser, CarCard, Process, FAQ, BookingForm, Footer) and its pages |
| `src/lib/home.ts`, `src/lib/build.ts` | The walk-in film, the nav and the streak; the hold-to-build tool |
| `src/styles/site.css` | The whole look: colours, fonts, spacing and animations |
| `src/assets/` | Every picture and font (the videos are in `public/assets/`) |
| `admin.html`, `src/admin/` | The admin page |
| `scripts/prerender.mjs` | Last build step: writes each page ahead of time, with its own title and sharing picture |
| `.github/workflows/deploy.yml` | Builds the site and publishes it on GitHub Pages |

Your project is **showroom1** (`https://nlhjnihjvlhimmigofbx.supabase.co`). Steps 1 to 3 are already done for it.
Follow them again only if you ever start a new Supabase project.

---

## 1. Create the database (paste the SQL)

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and open your project.
2. In the left bar, click **SQL Editor** (the `>_` icon).
3. Click **New query**.
4. Open `supabase/setup.sql`, select everything (Ctrl+A), copy it (Ctrl+C), and paste it into the editor (Ctrl+V).
5. Press **Run**. If Supabase warns about a "destructive operation", confirm: those lines only replace the file's own rules.
6. Under **Results** you should see `cars: 6`.

It is safe to run again later. It never removes or overwrites cars you have added or changed.

## 2. Find your project address and key

1. In your project, click **Project Settings** (the gear at the bottom of the left bar).
2. **Project address:** open **Data API** (or **API**) and copy the **Project URL**, like `https://abcd1234.supabase.co`.
3. **Key:** open **API Keys** and copy the **Publishable key** (it starts with `sb_publishable_`).
   On older projects it is called the **anon / public** key (a long text starting with `eyJ`). Either works.
4. Put both in `src/config.ts`:
   ```js
   const SUPABASE_URL = 'https://abcd1234.supabase.co';
   const SUPABASE_ANON_KEY = 'sb_publishable_...';
   ```
5. Upload the change (part 7). Every page, and the admin page's lock, follow `src/config.ts` by themselves.

> **Never use the secret key.** The **secret** key (`sb_secret_...`) or **service_role** key can do anything to your database,
> and anything in these files is public. If one is ever pasted here, the site refuses it and acts as if it were offline.
> If a secret key ever leaks, create a new one in **Project Settings → API Keys** and delete the old one.

## 3. Create your admin login

1. In the left bar, click **Authentication**, then **Users**.
2. Click **Add user → Create new user**.
3. Type your email and a strong password, tick **Auto Confirm User**, then click **Create user**.
4. Put that login on the admin list: open the **SQL Editor** again, paste this, change the email to yours, and press **Run**:
   ```sql
   insert into private.admins (user_id, email)
   select id, email from auth.users
   where lower(email) = lower('you@example.com')
   on conflict (user_id) do nothing;
   ```
   (It is the same as part 6 at the end of `setup.sql`.) Change the email in the SQL Editor only, never in the file:
   the file is uploaded to the public website.

Only logins on this admin list can add, change or delete cars and photos. A login that is not on the list can sign in
but sees "This login can't edit cars".

**To add another person:** create their user the same way, then run the SQL above with their email.
**To remove someone:** delete their user in **Authentication → Users**. They come off the admin list automatically.
**Forgot your password?** Delete your user, create it again with a new password, and run the SQL above again.
Your cars are not affected.

### Recommended: two login settings

1. **Switch off sign-ups.** Go to **Authentication → Sign In / Providers** and turn off **Allow new users to sign up**.
   The admin list already stops strangers from editing, but this stops them from even creating a login.
2. **Leaked password protection.** On the same page, under **Email**, turn on **Prevent use of leaked passwords**
   if your plan offers it. It refuses passwords that are known to have leaked. If your plan doesn't offer it, use a password
   you don't use anywhere else.

## 4. Run the site on your computer

You need **Node.js** (version 22 or newer) from [nodejs.org](https://nodejs.org). It is already on this computer.

1. Open **PowerShell** and go to the project:
   ```powershell
   cd "C:\Users\alain\Desktop\showroom v2\milcar"
   ```
2. The first time only (and after each update of the project), install the building blocks:
   ```powershell
   npm install
   ```
3. Start the site while you work on it:
   ```powershell
   npm run legacy:dev
   ```
   Open **http://localhost:5173/showroom1/**. Changes to the files show in the browser straight away.
   The admin page is at **http://localhost:5173/showroom1/admin.html**.
4. To see exactly what will go online, build it and open the built copy:
   ```powershell
   npm run legacy:build
   npm run legacy:preview
   ```
   Open **http://localhost:4173/showroom1/**. This copy behaves like GitHub Pages (addresses, the 404 page).
5. To stop, go back to PowerShell and press **Ctrl+C**.

On the live website the admin page is at **https://ralphhelou2005-cpu.github.io/showroom1/admin.html**.
Nothing on the public site links to it, and search engines are told not to list it. Bookmark it on your phone.

### Adding a new car

Use the admin page (part 5): **Add a car**, fill it in, add photos, **Save**. That's all: the inventory and the car's
page (`/car/<its-name>`) show it straight away, without any code or upload. Each night the site is rebuilt, which also
gives the new car its own title and picture for sharing on WhatsApp.

Two parts of the site are pictures rather than lists, so they change by hand:
- **The windows of the dealership picture** (`src/data/featured.ts`): each window links to the car painted in it.
  Change a window's car only together with a new picture.
- **The three cars on the home page** (`src/components/InventoryTeaser.tsx`).

## 5. Using the admin page

- **Status:** on the list, tap **Available**, **Reserved** or **Sold**. It changes on the website straight away.
  Sold cars stay in the admin but are hidden from the website. Reserved cars show a gold "Reserved" tag.
- **Edit a car:** tap its name. Change anything, then **Save**. Leaving with unsaved changes asks first.
- **Price:** type it in US dollars (`245000` or `245,000`). Leave it empty to show "Price on request".
- **Photos:** **Add photos** takes several at once. Phone photos are made smaller before they upload, so they load fast.
  The first photo is the main one; use ← → to change the order and × to remove one.
- **Specs:** each row is a name and a value, shown in this order. A row without a value is left out.
- **This car:** year, mileage, colour, owners, service records, import papers. Anything empty shows "On request".
- **Sample tag:** untick it once a listing is a real car. The "these are sample listings" note on the inventory page
  disappears by itself when no car is marked as a sample.
- **Delete:** at the bottom of a car's page, **Delete this car**, then confirm. Its uploaded photos are deleted too.

## 6. Test everything locally

With `npm run legacy:build` and `npm run legacy:preview` running (part 4):

1. Open http://localhost:4173/showroom1/inventory. You should see your cars, the filters, and no error message.
2. In another tab, open http://localhost:4173/showroom1/admin.html and log in.
3. Mark a car **Reserved**, then reload the inventory: it shows the gold "Reserved" tag.
4. Mark it **Sold**, then reload: it disappears. Its page (`/car/...`) says it may have been sold.
5. Mark it **Available** again.
6. Open a car, set a price, add a photo, move it to the front, and **Save**. Open the car on the website:
   the new price and photo are there.
7. Add a test car, check it appears on the inventory, then delete it.
8. Old links still work: http://localhost:4173/showroom1/car.html?id=f8-tributo opens `/car/f8-tributo`.
9. Turn off your Wi-Fi, close the tab, and open the inventory in a new tab: it says "We can't show the cars right now".
   (A tab that already showed the cars keeps its copy for a few minutes.)
10. Once the site is online (part 7), try the admin page on your phone too.

## 7. Put it online

### GitHub Pages (where the site is now)

GitHub builds the site and publishes it by itself (`.github/workflows/deploy.yml`):
every upload to the `main` branch, every night, and whenever you press **Run workflow**
(**GitHub → showroom1 → Actions → Deploy to GitHub Pages**).

**Once, before the first upload of the React site to `main`:** go to **GitHub → showroom1 → Settings → Pages**
and set **Source** to **GitHub Actions**. Until then, GitHub would publish the raw project files instead of the built site.

Each build takes about a minute. Its progress, and any error, is under **Actions**.

### Netlify (later, if you move)

1. In `vite.config.ts`, change `base: '/showroom1/'` to `base: '/'`. In `src/config.ts`, change `SITE_ORIGIN`
   to the new address (for example `https://milcar.netlify.app`). Upload the change.
2. In Netlify, click **Add new site → Import an existing project → GitHub**, and pick `showroom1`.
3. Set **Build command** to `npm run legacy:build` and **Publish directory** to `dist`. Click **Deploy**.
   Every upload to GitHub then updates Netlify too.

- Supabase needs no change for the new address (the email and password login doesn't depend on it).
- The admin page is at `https://your-netlify-address/admin.html`.
- If you add your own domain in Netlify (**Domain management**), put it in `SITE_ORIGIN` too.
- Once Netlify works, you can turn off GitHub Pages (**GitHub → showroom1 → Settings → Pages**) so there is only one copy.

## 8. If something goes wrong

| What you see | What to do |
|---|---|
| **"We can't show the cars right now"** on the website | Check your internet. Then open the Supabase dashboard: on the free plan, a project with **no visits for 7 days is paused**. Click **Restore project** and wait a few minutes. |
| **"Can't reach the showroom database"** on the admin page | Same as above. Also check `src/config.ts` holds the right address and the publishable key. |
| The site on GitHub shows a blank page or the raw project | **Settings → Pages → Source** must be **GitHub Actions** (part 7). Then open **Actions** and press **Run workflow**. |
| A build failed (a red mark under **Actions**) | Open it to read the error. The site keeps showing the last good build meanwhile. |
| **"That email and password don't match"** | Check the email. To reset the password, see part 3. |
| **"This login can't edit cars"** | That email isn't on the admin list. Run the SQL in part 3, step 4. |
| A photo won't upload | Photos must be JPG, PNG or WebP. iPhones usually convert automatically; on a computer, save HEIC photos as JPG first. |
| A change doesn't show on the website | Reload the page. Visitors see changes on their next page view. |

**Backups:** the free plan doesn't keep backups. Your six starting cars are in `setup.sql`. For cars you add later,
Supabase's **Table Editor → cars → Export to CSV** saves a copy; doing this now and then is a good habit.
