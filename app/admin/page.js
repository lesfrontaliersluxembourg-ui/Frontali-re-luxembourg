'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';

const TABS = [
  { id: 'partenaires', label: 'Partenaires' },
  { id: 'membres', label: 'Membres' },
  { id: 'historique', label: 'Historique' },
];

const PLAN_COLORS = {
  Mensuel: 'bg-blue-100 text-blue-800',
  Annuel: 'bg-purple-100 text-purple-800',
};

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('partenaires');
  const [partners, setPartners] = useState([]);
  const [members, setMembers] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ first_name: '', last_name: '', plan: 'Mensuel' });
  const [submitting, setSubmitting] = useState(false);
  const [flash, setFlash] = useState({ type: '', msg: '' });

  // Filters for Historique tab
  const [filterMonth, setFilterMonth] = useState('');
  const [filterPartner, setFilterPartner] = useState('');
  const [filterPlan, setFilterPlan] = useState('');

  // Confirmation state for delete (visitId being confirmed)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

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
        .select('*, members(first_name, last_name, plan), partners(name)')
        .order('visited_at', { ascending: false })
        .limit(500),
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

  async function deleteVisit(visitId) {
    const { error } = await supabase.from('visits').delete().eq('id', visitId);
    if (!error) {
      setVisits((prev) => prev.filter((v) => v.id !== visitId));
    }
    setConfirmDeleteId(null);
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

  function formatMonthLabel(yyyymm) {
    const [y, m] = yyyymm.split('-');
    return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });
  }

  // Derived: unique months present in visits data
  const monthOptions = useMemo(() => {
    const set = new Set(visits.map((v) => v.visited_at.slice(0, 7)));
    return [...set].sort().reverse();
  }, [visits]);

  // Derived: filtered visits
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (filterMonth && !v.visited_at.startsWith(filterMonth)) return false;
      if (filterPartner && v.partner_id !== parseInt(filterPartner)) return false;
      if (filterPlan && v.members?.plan !== filterPlan) return false;
      return true;
    });
  }, [visits, filterMonth, filterPartner, filterPlan]);

  const hasFilters = filterMonth || filterPartner || filterPlan;

  function exportExcel() {
    const rows = filteredVisits.map((v) => ({
      Membre: v.members
        ? `${v.members.first_name} ${v.members.last_name}`
        : String(v.member_id),
      Plan: v.members?.plan || '',
      Partenaire: v.partners?.name || String(v.partner_id),
      'Date/heure': formatDate(v.visited_at),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    // Auto column widths
    ws['!cols'] = [{ wch: 28 }, { wch: 10 }, { wch: 18 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Visites');
    const filename = `visites-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
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
                {/* Toolbar: filters + export */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
                  <div className="flex flex-wrap gap-3 items-end">
                    {/* Month filter */}
                    <div className="min-w-[160px]">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Mois</label>
                      <select
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                      >
                        <option value="">Tous les mois</option>
                        {monthOptions.map((m) => (
                          <option key={m} value={m}>
                            {formatMonthLabel(m)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Partner filter */}
                    <div className="min-w-[160px]">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Partenaire</label>
                      <select
                        value={filterPartner}
                        onChange={(e) => setFilterPartner(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                      >
                        <option value="">Tous les partenaires</option>
                        {partners.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Plan filter */}
                    <div className="min-w-[140px]">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Plan</label>
                      <select
                        value={filterPlan}
                        onChange={(e) => setFilterPlan(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                      >
                        <option value="">Tous les plans</option>
                        <option value="Mensuel">Mensuel</option>
                        <option value="Annuel">Annuel</option>
                      </select>
                    </div>

                    {/* Reset filters */}
                    {hasFilters && (
                      <button
                        onClick={() => { setFilterMonth(''); setFilterPartner(''); setFilterPlan(''); }}
                        className="text-sm text-gray-500 hover:text-gray-700 underline py-2 self-end"
                      >
                        Réinitialiser
                      </button>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Export Excel */}
                    <button
                      onClick={exportExcel}
                      disabled={filteredVisits.length === 0}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors self-end"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Exporter Excel
                      {hasFilters && filteredVisits.length !== visits.length && (
                        <span className="bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {filteredVisits.length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Visits table */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-700">
                      {filteredVisits.length} visite{filteredVisits.length !== 1 ? 's' : ''}
                      {hasFilters && visits.length !== filteredVisits.length && (
                        <span className="text-gray-400 font-normal"> (sur {visits.length} au total)</span>
                      )}
                    </h2>
                  </div>

                  {filteredVisits.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">
                      {hasFilters ? 'Aucune visite pour ces filtres' : 'Aucune visite enregistrée'}
                    </p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="text-left px-4 py-3 text-gray-600 font-medium">Membre</th>
                          <th className="text-left px-4 py-3 text-gray-600 font-medium">Plan</th>
                          <th className="text-left px-4 py-3 text-gray-600 font-medium">Partenaire</th>
                          <th className="text-left px-4 py-3 text-gray-600 font-medium">Date</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredVisits.map((v, i) => (
                          <tr
                            key={v.id}
                            className={`border-b border-gray-50 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}
                          >
                            <td className="px-4 py-3 text-gray-900">
                              {v.members
                                ? `${v.members.first_name} ${v.members.last_name}`
                                : v.member_id}
                            </td>
                            <td className="px-4 py-3">
                              {v.members?.plan && (
                                <span
                                  className={`text-xs font-medium px-2 py-1 rounded-full ${PLAN_COLORS[v.members.plan] || 'bg-gray-100 text-gray-700'}`}
                                >
                                  {v.members.plan}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {v.partners ? v.partners.name : v.partner_id}
                            </td>
                            <td className="px-4 py-3 text-gray-500">{formatDate(v.visited_at)}</td>
                            <td className="px-4 py-3 text-right">
                              {confirmDeleteId === v.id ? (
                                <span className="inline-flex items-center gap-2">
                                  <span className="text-xs text-gray-600">Supprimer ?</span>
                                  <button
                                    onClick={() => deleteVisit(v.id)}
                                    className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded transition-colors"
                                  >
                                    Oui
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded transition-colors"
                                  >
                                    Non
                                  </button>
                                </span>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(v.id)}
                                  className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
                                  title="Supprimer cette visite"
                                >
                                  <TrashIcon />
                                </button>
                              )}
                            </td>
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
