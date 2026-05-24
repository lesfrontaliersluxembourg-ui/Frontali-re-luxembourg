import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Lazy singletons — initialisés au premier appel pour éviter les erreurs au build
let _stripe;
let _supabase;

function getStripe() {
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return _supabase;
}

// Détecte le plan depuis un texte (nom de produit Stripe ou metadata)
function detectPlan(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes('annuel')) return 'Annuel';
  if (t.includes('mensuel')) return 'Mensuel';
  return null;
}

export async function POST(request) {
  const stripe = getStripe();
  const supabase = getSupabase();

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Stripe webhook] Signature invalide :', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ── Paiement réussi → créer le membre ─────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object;

        const firstName = session.metadata?.first_name?.trim();
        const lastName = session.metadata?.last_name?.trim();
        const customerId = session.customer;
        const email = session.customer_details?.email || session.customer_email || null;
        const phone = session.customer_details?.phone || null;

        if (!firstName || !lastName) {
          console.error(
            '[Stripe webhook] first_name/last_name manquants dans les metadata, session :',
            session.id
          );
          // On renvoie 200 pour éviter que Stripe ne réessaie (c'est une erreur de config)
          return NextResponse.json(
            { error: 'first_name et last_name requis dans les metadata Stripe' },
            { status: 200 }
          );
        }

        // 1. Chercher le plan dans les metadata de la session
        let plan = detectPlan(session.metadata?.plan);

        // 2. Sinon, chercher dans le nom du produit Stripe
        if (!plan && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription, {
            expand: ['items.data.price.product'],
          });
          const productName = subscription.items.data[0]?.price?.product?.name;
          plan = detectPlan(productName);
        }

        if (!plan) {
          console.error(
            '[Stripe webhook] Plan inconnu pour la session :',
            session.id,
            '— Le nom du produit Stripe doit contenir "Mensuel" ou "Annuel"'
          );
          return NextResponse.json({ error: 'Plan inconnu' }, { status: 200 });
        }

        const { error: insertError } = await supabase.from('members').insert({
          first_name: firstName,
          last_name: lastName,
          plan,
          active: true,
          stripe_customer_id: customerId,
          email,
          phone,
        });

        if (insertError) {
          console.error('[Stripe webhook] Erreur Supabase insert :', insertError);
          return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        console.log(`[Stripe webhook] Membre créé : ${firstName} ${lastName} (${plan})`);
        break;
      }

      // ── Abonnement annulé → désactiver le membre ──────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        const { error: updateError } = await supabase
          .from('members')
          .update({ active: false })
          .eq('stripe_customer_id', customerId);

        if (updateError) {
          console.error('[Stripe webhook] Erreur Supabase update :', updateError);
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        console.log(`[Stripe webhook] Membre désactivé pour customer : ${customerId}`);
        break;
      }

      default:
        // Événement non géré — on acquitte sans action
        break;
    }
  } catch (err) {
    console.error('[Stripe webhook] Erreur interne :', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
