/* The admin now opens the new dashboard (the new platform, on its preview address until the switch). The old car
   editor stays at admin.html?old: until the switch, the website's cars are still the ones edited there. */
export const DASHBOARD = 'https://milcar-platform.vercel.app/admin';
export const leaving = !new URLSearchParams(location.search).has('old');
if (leaving) location.replace(DASHBOARD);
