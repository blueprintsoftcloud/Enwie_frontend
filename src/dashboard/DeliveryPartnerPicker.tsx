import { useEffect, useRef, useState } from "react";
import { MagnifyingGlassIcon, PlusCircleIcon, TruckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import api from "../utils/api";
import CourierLogo from "../components/CourierLogo";

interface DeliveryPartner {
  id: string;
  name: string;
}

export type DeliveryPartnerValue =
  | { mode: "existing"; id: string; name: string }
  | { mode: "new"; name: string }
  | { mode: "manual" };

type PickerMode = "existing" | "new" | "manual";

interface DeliveryPartnerPickerProps {
  value: DeliveryPartnerValue | null;
  onChange: (value: DeliveryPartnerValue | null) => void;
}

const PartnerAvatar = ({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) => (
  <CourierLogo name={name} size={size === "md" ? "md" : "xs"} />
);

const HighlightMatch = ({ name, query }: { name: string; query: string }) => {
  const q = query.trim();
  if (!q) return <>{name}</>;
  const idx = name.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{name}</>;
  return (
    <>
      {name.slice(0, idx)}
      <mark className="bg-indigo-100 text-indigo-700 rounded-sm px-0.5">{name.slice(idx, idx + q.length)}</mark>
      {name.slice(idx + q.length)}
    </>
  );
};

const MODE_TABS: { key: PickerMode; label: string; icon: typeof MagnifyingGlassIcon }[] = [
  { key: "existing", label: "Existing", icon: MagnifyingGlassIcon },
  { key: "new", label: "Add New", icon: PlusCircleIcon },
  { key: "manual", label: "Manual", icon: TruckIcon },
];

const POPULAR_PARTNERS = ["Delhivery", "Blue Dart", "DTDC", "Shadowfax", "FedEx", "India Post (Speed Post)"];

export default function DeliveryPartnerPicker({ value, onChange }: DeliveryPartnerPickerProps) {
  const [mode, setMode] = useState<PickerMode>("existing");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<DeliveryPartner[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const runSearch = (val: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/delivery-partners", { params: val.trim() ? { search: val } : {} });
        setResults(data.list ?? []);
      } catch {
        // silent — same convention as the customer picker this mirrors
      } finally {
        setLoading(false);
        setHasSearched(true);
      }
    }, val.trim() ? 250 : 0);
  };

  useEffect(() => {
    runSearch("");
  }, []);

  const handleSearch = (val: string) => {
    setSearch(val);
    setHighlighted(0);
    setOpen(true);
    if (value?.mode === "existing") onChange(null);
    runSearch(val);
  };

  // Browse the full list on focus, before the admin types anything
  const handleFocus = () => {
    setOpen(true);
    if (results.length === 0) runSearch(search);
  };

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectExisting = (partner: DeliveryPartner) => {
    onChange({ mode: "existing", id: partner.id, name: partner.name });
    setOpen(false);
    setSearch(partner.name);
  };

  const switchMode = (next: PickerMode) => {
    setMode(next);
    setSearch("");
    if (next === "existing") {
      runSearch("");
      setOpen(true);
    } else {
      setOpen(false);
    }
    onChange(next === "manual" ? { mode: "manual" } : null);
  };

  const addSearchAsNew = () => {
    const prefill = search.trim();
    setMode("new");
    setOpen(false);
    onChange(prefill ? { mode: "new", name: prefill } : null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const picked = results[highlighted];
      if (picked) selectExisting(picked);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Segmented mode switcher */}
      <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
        {MODE_TABS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => switchMode(opt.key)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              mode === opt.key ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <opt.icon className="w-3.5 h-3.5" />
            {opt.label}
          </button>
        ))}
      </div>

      {mode === "existing" && (
        <div ref={containerRef} className="relative">
          {value?.mode === "existing" ? (
            <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl animate-fadeIn">
              <div className="flex items-center gap-2.5 min-w-0">
                <PartnerAvatar name={value.name} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-emerald-900 truncate">{value.name}</p>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide flex items-center gap-1">
                    <CheckCircleSolid className="w-3 h-3" /> Selected
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { onChange(null); setSearch(""); setOpen(true); }}
                className="shrink-0 text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-white transition px-2.5 py-1.5 rounded-lg"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search or browse delivery partners…"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  onFocus={handleFocus}
                  onKeyDown={handleKeyDown}
                  className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
                {loading ? (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
                ) : search ? (
                  <button
                    type="button"
                    onClick={() => handleSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                ) : null}
              </div>

              {/* Popular quick-pick chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Quick pick:</span>
                {POPULAR_PARTNERS.map((name) => {
                  const partner = results.find((r) => r.name.toLowerCase() === name.toLowerCase());
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        if (partner) {
                          selectExisting(partner);
                        } else {
                          handleSearch(name);
                        }
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-700 transition active:scale-95 border border-transparent hover:border-indigo-200"
                    >
                      {name}
                    </button>
                  );
                })}
              </div>

              {open && (
                <div className="absolute z-20 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-lg shadow-gray-900/10 overflow-hidden animate-fadeIn">
                  {results.length > 0 ? (
                    <ul className="max-h-52 overflow-y-auto py-1">
                      {results.map((p, i) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onMouseEnter={() => setHighlighted(i)}
                            onClick={() => selectExisting(p)}
                            className={`w-full flex items-center gap-2.5 text-left px-3 py-2 text-sm transition ${
                              i === highlighted ? "bg-indigo-50" : ""
                            }`}
                          >
                            <PartnerAvatar name={p.name} />
                            <span className="text-gray-800 font-medium truncate">
                              <HighlightMatch name={p.name} query={search} />
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : loading ? (
                    <div className="px-3 py-5 text-center text-xs text-gray-400">Searching…</div>
                  ) : (
                    <div className="px-3 py-4 text-center">
                      <p className="text-xs text-gray-400 mb-2">
                        {search.trim() ? `No partner matching "${search.trim()}"` : "No delivery partners yet"}
                      </p>
                      <button
                        type="button"
                        onClick={addSearchAsNew}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                      >
                        <PlusCircleIcon className="w-4 h-4" />
                        {search.trim() ? `Add "${search.trim()}" as new partner` : "Add a new partner"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {mode === "new" && (() => {
        const typedName = value?.mode === "new" ? value.name.trim().toLowerCase() : "";
        const match = results.find((p) => typedName && p.name.toLowerCase() === typedName);
        return (
          <div>
            <div className="relative">
              <PlusCircleIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                autoFocus
                placeholder="New delivery partner name…"
                value={value?.mode === "new" ? value.name : ""}
                onChange={(e) => {
                  const name = e.target.value;
                  onChange(name.trim() ? { mode: "new", name } : null);
                }}
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
            </div>
            {match ? (
              <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 animate-fadeIn">
                <p className="text-xs text-emerald-900 font-medium">
                  <strong>{match.name}</strong> is already installed!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMode("existing");
                    selectExisting(match);
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs shrink-0"
                >
                  Select "{match.name}"
                </button>
              </div>
            ) : (
              <p className="mt-1.5 text-[11px] text-gray-400 pl-1">Saved to your delivery partner list for future orders.</p>
            )}
          </div>
        );
      })()}

      {mode === "manual" && (
        <div className="flex items-start gap-2.5 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 animate-fadeIn">
          <TruckIcon className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <p>No courier will be recorded — use this for self-delivery, local pickup, or hand-delivered orders. Tracking ID becomes optional.</p>
        </div>
      )}
    </div>
  );
}
