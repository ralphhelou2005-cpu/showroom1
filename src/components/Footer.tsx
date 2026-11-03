import { HomeLink } from './ui';

export default function Footer({ home = false }: { home?: boolean }) {
  return (
    <footer>
      <div><HomeLink id="top" home={home} className="wordmark">Milcar</HomeLink><p className="signature">Minas Missirian</p><p>Automotive Consultancy</p></div>
      <div><b>Visit</b><span className="todo">Address and opening hours go here.</span></div>
      <div><b>Call</b><span className="todo">Phone and WhatsApp go here.</span></div>
    </footer>
  );
}
