"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2, Calendar } from "lucide-react";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

interface Slot {
  time: string;
  label: string;
}

export default function BookingCalendar({
  userName,
  userEmail,
  minDays = 3,
}: {
  userName: string;
  userEmail: string;
  minDays?: number;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + minDays);

  const [viewYear, setViewYear] = useState(minDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(minDate.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [bookedTime, setBookedTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function daysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
  }

  function firstDayOfMonth(year: number, month: number) {
    // 0=Mon … 6=Sun (European week start)
    const day = new Date(year, month, 1).getDay();
    return (day + 6) % 7;
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
    setSlots([]);
    setSelectedSlot(null);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
    setSlots([]);
    setSelectedSlot(null);
  }

  async function selectDay(day: number) {
    const date = new Date(viewYear, viewMonth, day);
    date.setHours(0, 0, 0, 0);

    if (date < minDate) return;
    const dow = date.getDay();
    if (dow === 0 || dow === 6) return;

    setSelectedDate(date);
    setSelectedSlot(null);
    setLoadingSlots(true);
    setError(null);

    try {
      const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const res = await fetch(`/api/termine/slots?date=${iso}`);
      const data = await res.json();
      setSlots(data.slots ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function confirmBooking() {
    if (!selectedSlot || booking) return;
    setBooking(true);
    setError(null);

    try {
      const res = await fetch("/api/termine/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTime: selectedSlot, message: message || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Fehler beim Buchen");
        return;
      }
      setBooked(true);
      setBookedTime(selectedSlot);
    } catch {
      setError("Netzwerkfehler — bitte erneut versuchen");
    } finally {
      setBooking(false);
    }
  }

  if (booked && bookedTime) {
    const dt = new Date(bookedTime);
    return (
      <div className="bg-[#0c1520] border border-[#00b8ff]/30 rounded-xl p-8 text-center">
        <CheckCircle2 size={40} className="text-[#00b8ff] mx-auto mb-4" />
        <h2 className="text-[#f0f0f0] text-lg font-bold mb-2">Termin bestätigt!</h2>
        <p className="text-[#888] text-sm mb-1">
          {dt.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
        </p>
        <p className="text-[#f0f0f0] text-xl font-semibold mb-4">
          {dt.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
        </p>
        <p className="text-[#888] text-xs leading-relaxed">
          Eine Bestätigung wurde an <span className="text-[#f0f0f0]">{userEmail}</span> gesendet.
          <br />Wir melden uns spätestens 24 Stunden vor dem Gespräch mit weiteren Details.
        </p>
      </div>
    );
  }

  const totalDays = daysInMonth(viewYear, viewMonth);
  const firstDay = firstDayOfMonth(viewYear, viewMonth);
  const cells = Array.from({ length: Math.ceil((firstDay + totalDays) / 7) * 7 });

  return (
    <div className="space-y-5">
      {/* Calendar */}
      <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="w-8 h-8 rounded-lg bg-[#111e30] hover:bg-[#1a2840] flex items-center justify-center text-[#888] hover:text-[#f0f0f0] transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[#f0f0f0] font-semibold text-sm">
            {MONTHS[viewMonth]} {viewYear}
          </span>
          <button
            onClick={nextMonth}
            className="w-8 h-8 rounded-lg bg-[#111e30] hover:bg-[#1a2840] flex items-center justify-center text-[#888] hover:text-[#f0f0f0] transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((d) => (
            <div key={d} className="text-center text-[#555] text-xs py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((_, i) => {
            const dayNum = i - firstDay + 1;
            if (dayNum < 1 || dayNum > totalDays) {
              return <div key={i} />;
            }
            const thisDate = new Date(viewYear, viewMonth, dayNum);
            thisDate.setHours(0, 0, 0, 0);
            const isWeekend = thisDate.getDay() === 0 || thisDate.getDay() === 6;
            const isBefore = thisDate < minDate;
            const isDisabled = isWeekend || isBefore;
            const isSelected =
              selectedDate &&
              selectedDate.getDate() === dayNum &&
              selectedDate.getMonth() === viewMonth &&
              selectedDate.getFullYear() === viewYear;

            return (
              <button
                key={i}
                disabled={isDisabled}
                onClick={() => selectDay(dayNum)}
                className={`
                  h-9 rounded-lg text-xs font-medium transition-colors
                  ${isDisabled
                    ? "text-[#333] cursor-not-allowed"
                    : isSelected
                    ? "bg-[#00b8ff] text-white"
                    : "text-[#ccc] hover:bg-[#00b8ff]/20 hover:text-[#00b8ff]"
                  }
                `}
              >
                {dayNum}
              </button>
            );
          })}
        </div>

        <p className="text-[#555] text-xs mt-3 text-center">
          Frühester Termin: {minDate.toLocaleDateString("de-DE", { day: "2-digit", month: "long" })} · Mo–Fr
        </p>
      </div>

      {/* Slots */}
      {selectedDate && (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5">
          <p className="text-[#888] text-xs mb-3">
            Verfügbare Uhrzeiten am{" "}
            <span className="text-[#f0f0f0]">
              {selectedDate.toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" })}
            </span>
          </p>

          {loadingSlots ? (
            <div className="flex items-center gap-2 text-[#888] text-sm">
              <Loader2 size={14} className="animate-spin" />
              <span>Lade Zeitfenster…</span>
            </div>
          ) : slots.length === 0 ? (
            <p className="text-[#555] text-sm">Keine freien Zeitfenster an diesem Tag.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.time}
                  onClick={() => setSelectedSlot(slot.time)}
                  className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                    selectedSlot === slot.time
                      ? "bg-[#00b8ff] text-white"
                      : "bg-[#111e30] text-[#ccc] hover:bg-[#00b8ff]/20 hover:text-[#00b8ff]"
                  }`}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirm */}
      {selectedSlot && (
        <div className="bg-[#0c1520] border border-[#1a2840] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-[#00b8ff]" />
            <p className="text-[#f0f0f0] text-sm font-medium">
              {new Date(selectedSlot).toLocaleDateString("de-DE", {
                weekday: "long", day: "2-digit", month: "long",
              })}{" "}
              um{" "}
              {new Date(selectedSlot).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
            </p>
          </div>

          <div>
            <label className="text-[#888] text-xs block mb-1">Ihre Nachricht (optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="Gibt es etwas, das wir vor dem Gespräch wissen sollten?"
              className="w-full bg-[#060a10] border border-[#1a2840] rounded-lg px-3 py-2 text-sm text-[#f0f0f0] placeholder-[#555] focus:outline-none focus:border-[#00b8ff]/40 resize-none"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs">{error}</p>
          )}

          <button
            onClick={confirmBooking}
            disabled={booking}
            className="w-full bg-[#00b8ff] hover:bg-[#0099d6] disabled:bg-[#111e30] disabled:text-[#444] text-white font-semibold text-sm rounded-lg py-2.5 flex items-center justify-center gap-2 transition-colors"
          >
            {booking ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Termin wird gebucht…
              </>
            ) : (
              "Termin verbindlich buchen"
            )}
          </button>

          <p className="text-[#555] text-xs text-center">
            Bestätigung wird an {userEmail} gesendet
          </p>
        </div>
      )}
    </div>
  );
}
