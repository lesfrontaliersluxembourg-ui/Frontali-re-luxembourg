'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import QRCode from 'qrcode';

const TABS = [
  { id: 'partenaires', label: 'Partenaires' },
  { id: 'membres', label: 'Membres' },
  { id: 'historique', label: 'Historique' },
];

const PLAN_COLORS = {
  Mensuel: 'bg-blue-100 text-blue-800',
  Annuel: 'bg-purple-100 text-purple-800',
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('partenaires');
  const [partners, setPartners] = useState([]);
  const [members, setMembers] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ first_name: '', last_name: '', plan: 'Mensuel' });
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState({ type: '', msg: '' });

  useEffect(() => {
    fetchAll();
  }, []);

  function showFlash(type, msg) {
    setFlash({ type, msg });
    setTimeout(() => setFlash({ type: '', msg: '' }), 3000);
  }

  async function fetchAll() {
    setLoading(true);
    const [
      { data: partnersData },
      { data: membersData },
      { data: visitsData },
    ] = await Promise.all([
      supabase.from('partners').select('*').order('id'),
      supabase.from('members').select('*').order('created_at', { ascending: false }),
      supabase
        .from('visits')
        .select('*, members(first_name, last_name), partners(name)')
        .order('visited_at', { ascending: false })
        .limit(200),
    ]);
    setPartners(partnersData || []);
    setMembers(membersData || []);
    setVisits(visitsData || []);
    setLoading(false);
  }

  async function addMember(e) {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('members').insert({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      plan: form.plan,
      active: true,
    });
    if (error) {
      showFlash('error', 'Erreur : ' + error.message);
    } else {
      showFlash('success', 'Membre ajouté avec succès');
      setForm({ first_name: '', last_name: '', plan: 'Mensuel' });
      fetchAll();
    }
    setSubmitting(false);
  }

  async function toggleMember(member) {
    const { error } = await supabase
      .from('members')
      .update({ active: !member.active })
      .eq('id', member.id);
    if (!error) {
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, active: !m.active } : m))
      );
    }
  }

  async function generateQR(member) {
    const url = `${window.location.origin}/scan/${member.id}`;
    try {
      const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2 });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `qr-${member.first_name}-${member.last_name}.png`;
      link.click();
    } catch {
      showFlash('error', 'Erreur lors de la génération du QR code');
    }
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            La Frontalière Club
            <span className="ml-2 text-sm font-normal text-gray-500">— Administration</span>
          </h1>
        </div>
      </header>

      {/* Flash message */}
      {flash.msg && (
        <div
          className={`max-w-5xl mx-auto mt-4 px-4 py-3 rounded-lg text-sm font-medium ${
            flash.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          {flash.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-4 mt-6">
        <div className="flex border-b border-gray-200">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Chargement…</div>
        ) : (
          <>
            {/* ── PARTENAIRES ── */}
            {activeTab === 'partenaires' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Partenaires ({partners.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {partners.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-lg">{p.name}</h3>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {p.type}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">{p.offer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── MEMBRES ── */}
            {activeTab === 'membres' && (
              <div>
                {/* Add member form */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Ajouter un membre</h2>
                  <form onSubmit={addMember} className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Prénom</label>
                      <input
                        type="text"
                        value={form.first_name}
                        onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        placeholder="Prénom"
                      />
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nom</label>
                      <input
                        type="text"
                        value={form.last_name}
                        onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                        placeholder="Nom"
                      />
                    </div>
                    <div className="min-w-[140px]">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
                      <select
                        value={form.plan}
                        onChange={(e) => setForm({ ...form, plan: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      >
                        <option value="Mensuel">Mensuel</option>
                        <option value="Annuel">Annuel</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      {submitting ? 'Ajout…' : 'Ajouter'}
                    </button>
                  </form>
                </div>

                {/* Members list */}
                <h2 className="text-lg font-semibold text-gray-800 mb-3">
                  Membres ({members.length})
                </h2>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {members.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">Aucun membre</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-left px-4 py-3 text-gray-600 font-medium">Membre</th>
                          <th className="text-left px-4 py-3 text-gray-600 font-medium">Plan</th>
                          <th className="text-left px-4 py-3 text-gray-600 font-medium">Statut</th>
                          <th className="text-right px-4 py-3 text-gray-600 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {members.map((m, i) => (
                          <tr
                            key={m.id}
                            className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}
                          >
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {m.first_name} {m.last_name}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-xs font-medium px-2 py-1 rounded-full ${PLAN_COLORS[m.plan] || 'bg-gray-100 text-gray-700'}`}
                              >
                                {m.plan}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-xs font-medium px-2 py-1 rounded-full ${
                                  m.active
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {m.active ? 'Actif' : 'Inactif'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => generateQR(m)}
                                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  QR Code
                                </button>
                                <button
                                  onClick={() => toggleMember(m)}
                                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                                    m.active
                                      ? 'bg-red-100 hover:bg-red-200 text-red-700'
                                      : 'bg-green-100 hover:bg-green-200 text-green-700'
                                  }`}
                                >
                                  {m.active ? 'Désactiver' : 'Réactiver'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* ── HISTORIQUE ── */}
            {activeTab === 'historique' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">
                  Historique des visites ({visits.length})
                </h2>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {visits.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">Aucune visite enregistrée</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-left px-4 py-3 text-gray-600 font-medium">Membre</th>
                          <th className="text-left px-4 py-3 text-gray-600 font-medium">Partenaire</th>
                          <th className="text-left px-4 py-3 text-gray-600 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visits.map((v, i) => (
                          <tr
                            key={v.id}
                            className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}
                          >
                            <td className="px-4 py-3 text-gray-900">
                              {v.members
                                ? `${v.members.first_name} ${v.members.last_name}`
                                : v.member_id}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {v.partners ? v.partners.name : v.partner_id}
                            </td>
                            <td className="px-4 py-3 text-gray-500">{formatDate(v.visited_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
