'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// IDs des partenaires réservés aux membres Annuel
const ANNUAL_ONLY_IDS = [1, 4]; // Fidolux et Colors

export default function ScanPage({ params }) {
  const memberId = params.member_id;

  const [member, setMember] = useState(null);
  const [partners, setPartners] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [validating, setValidating] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchData();
  }, [memberId]);

  async function fetchData() {
    const [{ data: memberData, error }, { data: partnersData }] = await Promise.all([
      supabase.from('members').select('*').eq('id', memberId).maybeSingle(),
      supabase.from('partners').select('*').order('id'),
    ]);
    if (!memberData || error) {
      setNotFound(true);
    } else {
      setMember(memberData);
    }
    setPartners(partnersData || []);
    setLoading(false);
  }

  async function validateVisit() {
    setValidating(true);
    const { error } = await supabase.from('visits').insert({
      member_id: member.id,
      partner_id: parseInt(selectedPartnerId),
      visited_at: new Date().toISOString(),
    });
    if (!error) {
      setSuccess(true);
    }
    setValidating(false);
  }

  const selectedPartner = partners.find((p) => p.id === parseInt(selectedPartnerId));
  const isRestricted =
    member?.plan === 'Mensuel' &&
    selectedPartner &&
    ANNUAL_ONLY_IDS.includes(selectedPartner.id);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-lg">Chargement…</p>
      </div>
    );
  }

  // ── Not found ──
  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="text-red-600 text-xl font-semibold">Membre introuvable</p>
          <p className="text-gray-500 mt-2">Ce QR code n'est pas valide.</p>
        </div>
      </div>
    );
  }

  // ── Success confirmation ──
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-green-700 mb-2">Visite validée !</h2>
          <p className="text-gray-600">
            {member.first_name} {member.last_name} chez{' '}
            <strong>{selectedPartner?.name}</strong>
          </p>
          <p className="text-gray-400 text-sm mt-1">
            {new Date().toLocaleString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm">
        {/* Club logo / title */}
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-1">
            La Frontalière Club
          </p>
          <h1 className="text-2xl font-bold text-gray-900">
            {member.first_name} {member.last_name}
          </h1>
          <span
            className={`inline-block mt-2 text-sm font-semibold px-3 py-1 rounded-full ${
              member.plan === 'Annuel'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {member.plan}
          </span>
        </div>

        {/* Inactive member block */}
        {!member.active && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-red-700 font-semibold">Ce membre n'est plus actif</p>
            <p className="text-red-500 text-sm mt-1">L'accès aux avantages est suspendu.</p>
          </div>
        )}

        {/* Active member flow */}
        {member.active && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choisir le partenaire
              </label>
              <select
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                <option value="">-- Sélectionner --</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Partner selected: restriction check */}
            {selectedPartner && (
              <>
                {isRestricted ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                    <p className="text-red-700 font-semibold">Réservé aux membres Annuel</p>
                    <p className="text-red-500 text-sm mt-1">
                      {selectedPartner.name} n'est pas accessible avec un plan Mensuel.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400 mb-1">
                        Offre — {selectedPartner.name}
                      </p>
                      <p className="text-gray-800 font-medium">{selectedPartner.offer}</p>
                    </div>
                    <button
                      onClick={validateVisit}
                      disabled={validating}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-base"
                    >
                      {validating ? 'Validation…' : 'Valider la visite'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
