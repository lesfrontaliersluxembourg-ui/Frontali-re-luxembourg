import fs from 'fs';
import path from 'path';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Club des +10 Luxembourg',
  description:
    'Événements exclusifs, réductions partenaires, restaurants à prix réduit. Un seul abonnement pour tout ce qui compte au Luxembourg.',
};

export default function LandingPage() {
  const html = fs.readFileSync(
    path.join(process.cwd(), 'landing.html'),
    'utf-8'
  );

  // Extrait le contenu du bloc <style>
  const cssMatch = html.match(/<style>([\s\S]*?)<\/style>/i);
  const css = cssMatch ? cssMatch[1] : '';

  // Extrait le contenu du <body>
  const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : '';

  return (
    <>
      {/*
        Les éléments <link> et <style> dans un Server Component sont hissés
        automatiquement dans le <head> par React / Next.js 14.
      */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500&display=swap"
      />
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div dangerouslySetInnerHTML={{ __html: bodyContent }} />
    </>
  );
}
