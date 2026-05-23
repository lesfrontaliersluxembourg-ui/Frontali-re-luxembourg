import './globals.css';

export const metadata = {
  title: 'La Frontalière Club',
  description: 'Application de gestion du club',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
