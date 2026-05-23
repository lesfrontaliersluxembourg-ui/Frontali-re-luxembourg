import fs from 'fs';
import path from 'path';

export const metadata = {
  title: 'Club des +10 Luxembourg',
  description:
    'Événements exclusifs, réductions partenaires, restaurants à prix réduit. Un seul abonnement pour tout ce qui compte au Luxembourg.',
};

export default function LandingPage() {
  const html = fs.readFileSync(
    path.join(process.cwd(), 'landing.html'),
    'utf-8'
  );

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
