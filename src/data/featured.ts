/* THE WINDOWS OF THE DEALERSHIP PICTURE (src/assets/dealership.webp).
   The cars are painted into one picture, so each window must match the car standing in it: putting a different
   car in a window needs a new picture. The window's name, price and year come from the car list (src/data/cars.ts);
   `name` and `year` here are only shown until the list arrives, or if that car is no longer listed.
   window: 1 to 6, counted from the left of the building. x, w: where its glass bay sits, in percent of the width. */
export interface FeaturedWindow { id: string; name: string; year: number; window: number; x: number; w: number }

export const FEATURED: FeaturedWindow[] = [
  { id: 'range-rover-sport-svr', name: 'Range Rover Sport SVR', year: 2019, window: 1, x: 8.89, w: 10.44 },
  { id: 'huracan-evo', name: 'Lamborghini Huracán EVO', year: 2020, window: 2, x: 22.5, w: 11.5 },
  { id: 'r8-v10-plus', name: 'Audi R8 V10 Plus', year: 2017, window: 3, x: 36.94, w: 11.95 },
  { id: 'aventador-svj', name: 'Lamborghini Aventador SVJ', year: 2019, window: 4, x: 51.94, w: 11.67 },
  { id: 'f8-tributo', name: 'Ferrari F8 Tributo', year: 2020, window: 5, x: 66.39, w: 11.5 },
  { id: 'g63', name: 'Mercedes-AMG G 63', year: 2021, window: 6, x: 80.67, w: 10.44 }
];
