# Milcar: setting up the cars database and the admin page

The website is plain files: no server, nothing to build. The cars live in **Supabase** (an online database).
You manage them on the **admin page** (`admin.html`), and the public pages (`inventory.html` and `car.html`) read them from there.

| File | What it is |
|---|---|
| `supabase/setup.sql` | Creates the cars table, the photo folder and the security rules, and adds the first six cars |
| `assets/supabase-config.js` | Your project's address and publishable key (both are meant to be public) |
| `admin.html`, `assets/admin.js`, `assets/admin.css` | The admin page |
| `assets/inventory.js` | Shows the cars on `inventory.html` and `car.html` |

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
4. Put both in `assets/supabase-config.js`:
   ```js
   const SUPABASE_URL = 'https://abcd1234.supabase.co';
   const SUPABASE_ANON_KEY = 'sb_publishable_...';
   ```
5. If the project address changed, also change it in the long `Content-Security-Policy` line near the top of
   `admin.html` (it appears twice), and in the `preconnect` line of `inventory.html` and `car.html`.

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

## 4. Open the admin page on your computer

The pages need to be opened through a small local web server, not by double-clicking the file.

1. Open **PowerShell**.
2. Run:
   ```powershell
   cd "C:\Users\alain\Desktop\showroom v2"
   npx -y http-server milcar -p 8123 -c-1
   ```
   (The first time, it asks to download `http-server`; that's normal.) Leave this window open.
3. In your browser, open **http://localhost:8123/admin.html** and log in.
4. The public pages are at http://localhost:8123/inventory.html and http://localhost:8123/index.html.
5. To stop the server, go back to PowerShell and press **Ctrl+C**.

On the live website the admin page is at the same place: **your-website-address/admin.html**
(now https://ralphhelou2005-cpu.github.io/showroom1/admin.html). Nothing on the public site links to it,
and search engines are told not to list it. Bookmark it on your phone.

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

With the local server running (part 4):

1. Open http://localhost:8123/inventory.html. You should see your cars, the filters, and no error message.
2. In another tab, open http://localhost:8123/admin.html and log in.
3. Mark a car **Reserved**, then reload the inventory: it shows the gold "Reserved" tag.
4. Mark it **Sold**, then reload: it disappears. Its old link (`car.html?id=...`) says it may have been sold.
5. Mark it **Available** again.
6. Open a car, set a price, add a photo, move it to the front, and **Save**. Open the car on the website:
   the new price and photo are there.
7. Add a test car, check it appears on the inventory, then delete it.
8. Turn off your Wi-Fi, close the tab, and open the inventory in a new tab: it says "We can't show the cars right now".
   (A tab that already showed the cars keeps its copy for a few minutes.)
9. Once the site is online (part 7), try the admin page on your phone too.

## 7. Put it online

### GitHub Pages (where the site is now)

The site is already published from GitHub (`ralphhelou2005-cpu/showroom1`, branch `main`).
Uploading the new files updates it within a minute or two. Nothing else needs changing.

### Netlify (later, if you move)

**The quick way: drag and drop.**
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop) and log in (or create a free account).
2. Drag the whole `milcar` folder onto the page. After a few seconds you get an address like `https://something.netlify.app`.
3. To update the site later, open the site in Netlify, go to **Deploys**, and drag the folder again.

**The automatic way: connect GitHub** (every upload to GitHub then updates Netlify too).
1. In Netlify, click **Add new site → Import an existing project → GitHub**, and pick `showroom1`.
2. Leave **Build command** empty and set **Publish directory** to `.` (the top of the project).
3. Click **Deploy**.

Either way:
- Supabase needs no change for the new address (the email and password login doesn't depend on it).
- The admin page is at `https://your-netlify-address/admin.html`.
- If you add your own domain in Netlify (**Domain management**), nothing else changes.
- Once Netlify works, you can turn off GitHub Pages (**GitHub → showroom1 → Settings → Pages**) so there is only one copy.

## 8. If something goes wrong

| What you see | What to do |
|---|---|
| **"We can't show the cars right now"** on the website | Check your internet. Then open the Supabase dashboard: on the free plan, a project with **no visits for 7 days is paused**. Click **Restore project** and wait a few minutes. |
| **"Can't reach the showroom database"** on the admin page | Same as above. Also check `assets/supabase-config.js` holds the right address and the publishable key. |
| **"That email and password don't match"** | Check the email. To reset the password, see part 3. |
| **"This login can't edit cars"** | That email isn't on the admin list. Run the SQL in part 3, step 4. |
| A photo won't upload | Photos must be JPG, PNG or WebP. iPhones usually convert automatically; on a computer, save HEIC photos as JPG first. |
| A change doesn't show on the website | Reload the page. Visitors see changes on their next page view. |

**Backups:** the free plan doesn't keep backups. Your six starting cars are in `setup.sql`. For cars you add later,
Supabase's **Table Editor → cars → Export to CSV** saves a copy; doing this now and then is a good habit.
