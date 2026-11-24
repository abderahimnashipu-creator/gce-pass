'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Plus, Trash2, Clock } from 'lucide-react';

interface TimetableSlot {
  id: string;
  day: string;
  time: string;
  subject: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const STORAGE_KEY = 'gce_pass_timetable_v1';

function format12Hour(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  if (Number.isNaN(h)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${mStr || '00'} ${period}`;
}

export default function StudyTimetablePage() {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [day, setDay] = useState('Monday');
  const [time, setTime] = useState('19:00');
  const [subject, setSubject] = useState('');
  const [filterDay, setFilterDay] = useState('All');

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSlots(JSON.parse(raw));
    } catch {}
  }, []);

  function saveSlots(updated: TimetableSlot[]) {
    const sorted = [...updated].sort((a, b) => {
      const dDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
      return dDiff !== 0 ? dDiff : a.time.localeCompare(b.time);
    });
    setSlots(sorted);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    } catch {}
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim()) return;
    const newSlot: TimetableSlot = {
      id: `${Date.now()}`,
      day,
      time,
      subject: subject.trim(),
    };
    saveSlots([...slots, newSlot]);
    setSubject('');
  }

  function handleDelete(id: string) {
    saveSlots(slots.filter((s) => s.id !== id));
  }

  const visibleSlots =
    filterDay === 'All' ? slots : slots.filter((s) => s.day === filterDay);
                                        return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-indigo-400 flex items-center gap-1.5">
              <Calendar className="w-5 h-5" /> Study Timetable
            </h1>
            <p className="text-xs text-slate-400">Personal weekly reading plan • Works offline</p>
          </div>
          <Link
            href="/dashboard"
            className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 whitespace-nowrap"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-5">
        <form
          onSubmit={handleAdd}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3"
        >
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Add Reading Slot
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            <select
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className="rounded-xl bg-slate-800 border border-slate-700 p-2.5 text-xs text-white"
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-xl bg-slate-800 border border-slate-700 p-2.5 text-xs text-white"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject / Topic (e.g. 0525 Economics Paper 1)"
              className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 text-xs text-white placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs font-bold text-white shrink-0"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </form>

        <div className="flex flex-wrap gap-1.5">
          {['All', ...DAYS].map((d) => (
            <button
              key={d}
              onClick={() => setFilterDay(d)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                filterDay === d
                  ? 'bg-indigo-600 text-white border-indigo-400'
                  : 'bg-slate-900 text-slate-300 border-slate-700'
              }`}
            >
              {d === 'All' ? `All (${slots.length})` : d.slice(0, 3)}
            </button>
          ))}
        </div>

        {visibleSlots.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-1.5">
            <p className="text-sm font-semibold text-slate-200">No reading slots yet</p>
            <p className="text-xs text-slate-400">
              Add your weekly GCE subjects above to stay consistent until exams.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {visibleSlots.map((slot) => (
              <div
                key={slot.id}
                className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-3.5"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-400">
                    <span>{slot.day}</span>
                    <span className="inline-flex items-center gap-1 text-slate-300">
                      <Clock className="w-3 h-3" /> {format12Hour(slot.time)}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white">{slot.subject}</p>
                </div>
                <button
                  onClick={() => handleDelete(slot.id)}
                  aria-label="Delete slot"
                  className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
