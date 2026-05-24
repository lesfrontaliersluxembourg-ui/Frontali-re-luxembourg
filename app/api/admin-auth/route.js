import { NextResponse } from 'next/server';

export async function POST(request) {
  const { password } = await request.json();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json({ error: 'ADMIN_PASSWORD non configuré sur le serveur' }, { status: 500 });
  }

  if (password === adminPassword) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: 'Mot de passe incorrect' }, { status: 401 });
}
