import { asset } from '@/lib/media';
import BookingForm from './BookingForm';

/* the booking section as pages use it: the server gives the form its picture's addresses */
export default function Booking() {
  return <BookingForm image={{ src: asset('assets/hero-poster.webp'), set: `${asset('assets/hero-poster-1100.webp')} 1100w, ${asset('assets/hero-poster.webp')} 1728w` }} />;
}
