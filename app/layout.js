import './globals.css';

export const metadata = {
  title: 'La Frontalière Club',
  description: 'Application de gestion du club',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
