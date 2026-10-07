import React, { useEffect, useState, useRef, useMemo } from "react";
import { MapPinIcon, BuildingStorefrontIcon, ChevronDownIcon, TruckIcon } from "@heroicons/react/24/outline";
import { CheckCircle, AlertTriangle, Loader2, Trash2, Search, X, Check, Banknote, CreditCard, QrCode, Truck, Sparkles, Pencil, Link2, ExternalLink, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useStaffPermissions } from "../context/StaffPermissionContext";
import api from "../utils/api";
import CourierLogo from "../components/CourierLogo";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { INDIAN_DISTRICTS_BY_STATE } from "../constants/indianDistricts";

const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [6.5, 68.0],
  [37.5, 97.5],
];

interface ShippingConfig {
  sameStatePerKmRate: number;
  sameStateFreeKmThreshold: number;
  noLocationFlatRate: number;
  stateRates: Record<string, number>;
  /** Per-district/city override nested under the state it belongs to — wins over that
   * state's flat stateRates value when the customer's city matches (case-insensitive). */
  districtRates: Record<string, Record<string, number>>;
  /** Whether shipping charge should be calculated for Cash on Delivery (COD/POD) */
  calculateShippingForCOD?: boolean;
  /** Whether shipping charge should be calculated for Pay Online */
  calculateShippingForOnline?: boolean;
  /** Whether shipping charge should be calculated for Pay via QR Code */
  calculateShippingForQR?: boolean;
}

interface WarehouseSettings {
  lat: number;
  lng: number;
  name: string;
}

const INDIAN_STATES_AND_UTS = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

/** Invisible component that listens for map clicks */
function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Draggable warehouse marker that allows dragging the pin directly while updating coordinates */
function DraggableWarehouseMarker({
  position,
  canEdit,
  onPick,
}: {
  position: [number, number];
  canEdit: boolean;
  onPick: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker | null>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend(e: any) {
        const marker = markerRef.current || e?.target;
        if (marker != null) {
          const latlng = marker.getLatLng();
          onPick(latlng.lat, latlng.lng);
        }
      },
    }),
    [onPick]
  );

  return (
    <Marker
      draggable={canEdit}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={customIcon}
    />
  );
}

/** Component to smoothly update the map view center without unmounting */
function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

/** Searchable state/UT picker — shared by both the Per-State and Per-District
 * shipping forms below so they present one consistent input instead of a fancy
 * dropdown in one place and a plain native <select> in the other. */
function StateSearchSelect({
  value,
  onChange,
  excludeValues = [],
  placeholder = "-- Select State --",
}: {
  value: string;
  onChange: (state: string) => void;
  /** States to hide from the option list — e.g. ones already configured elsewhere. */
  excludeValues?: string[];
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: Event) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const options = INDIAN_STATES_AND_UTS.filter((st) => {
    if (excludeValues.includes(st)) return false;
    if (!query) return true;
    return st.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setQuery("");
        }}
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-white shadow-sm hover:bg-slate-50/50 focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-all duration-200 flex items-center justify-between text-slate-700"
      >
        <span className={value ? "font-semibold text-slate-900" : "text-slate-500"}>
          {value || placeholder}
        </span>
        <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 flex flex-col z-[999] overflow-hidden transition-all duration-200 origin-top">
          <div className="p-2 border-b border-slate-100 bg-white sticky top-0 z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search state..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-black focus:ring-1 focus:ring-black bg-slate-50/50"
                onClick={(e) => e.stopPropagation()}
              />
              {query && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuery("");
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto max-h-48 py-1 custom-dropdown-scroll">
            {options.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-400 italic text-center">
                {query ? "No states match search" : "All states configured"}
              </div>
            ) : (
              options.map((st) => {
                const isSelected = value === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      onChange(st);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between group/item ${
                      isSelected
                        ? "bg-slate-100 font-semibold text-slate-900"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span>{st}</span>
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5 text-black" />
                    ) : (
                      <span className="opacity-0 group-hover/item:opacity-100 transition-opacity text-slate-400 text-xs font-normal">
                        Select
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Searchable district / city picker for the selected state.
 * Allows picking from the state's official districts list or typing a custom city name. */
function DistrictSearchSelect({
  state,
  value,
  onChange,
  excludeValues = [],
  placeholder = "-- Select District / City --",
}: {
  state: string;
  value: string;
  onChange: (district: string) => void;
  excludeValues?: string[];
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: Event) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const stateDistricts = (state && INDIAN_DISTRICTS_BY_STATE[state]) || [];

  const filteredDistricts = stateDistricts.filter((dist) => {
    if (excludeValues.includes(dist)) return false;
    if (!query) return true;
    return dist.toLowerCase().includes(query.toLowerCase());
  });

  const isCustomMatch =
    query.trim() &&
    !stateDistricts.some((d) => d.toLowerCase() === query.trim().toLowerCase());

  if (!state) {
    return (
      <div className="relative">
        <button
          type="button"
          disabled
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-slate-50 shadow-sm text-slate-400 cursor-not-allowed flex items-center justify-between"
        >
          <span>-- Select State First --</span>
          <ChevronDownIcon className="h-4 w-4 text-slate-300" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setQuery("");
        }}
        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-white shadow-sm hover:bg-slate-50/50 focus:border-black focus:ring-1 focus:ring-black focus:outline-none transition-all duration-200 flex items-center justify-between text-slate-700"
      >
        <span className={value ? "font-semibold text-slate-900" : "text-slate-500"}>
          {value || placeholder}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 flex flex-col z-[999] overflow-hidden transition-all duration-200 origin-top">
          <div className="p-2 border-b border-slate-100 bg-white sticky top-0 z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={`Search or type custom ${state} district...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-black focus:ring-1 focus:ring-black bg-slate-50/50"
                onClick={(e) => e.stopPropagation()}
              />
              {query && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuery("");
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto max-h-48 py-1 custom-dropdown-scroll">
            {isCustomMatch && (
              <button
                type="button"
                onClick={() => {
                  onChange(query.trim());
                  setIsOpen(false);
                  setQuery("");
                }}
                className="w-full text-left px-4 py-2 text-sm bg-blue-50/60 hover:bg-blue-100/70 text-blue-900 border-b border-blue-100 font-medium flex items-center justify-between"
              >
                <span>Use custom: <strong>"{query.trim()}"</strong></span>
                <span className="text-[11px] bg-blue-200/80 text-blue-800 px-1.5 py-0.5 rounded font-mono">Custom</span>
              </button>
            )}

            {filteredDistricts.length === 0 && !isCustomMatch ? (
              <div className="px-4 py-3 text-xs text-slate-400 italic text-center">
                {query ? "No districts match search. Type custom name above." : "All districts configured"}
              </div>
            ) : (
              filteredDistricts.map((dist) => {
                const isSelected = value === dist;
                return (
                  <button
                    key={dist}
                    type="button"
                    onClick={() => {
                      onChange(dist);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between group/item ${
                      isSelected
                        ? "bg-slate-100 font-semibold text-slate-900"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span>{dist}</span>
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5 text-black" />
                    ) : (
                      <span className="opacity-0 group-hover/item:opacity-100 transition-opacity text-slate-400 text-xs font-normal">
                        Select
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WarehouseSettings() {
  const { user } = useAuth();
  const { hasPermission } = useStaffPermissions();
  // Nav/route access to this page (see StaffDashboard.tsx's buildNav) is granted by
  // EITHER SETTINGS_VIEW or SETTINGS_EDIT — a staff member with only SETTINGS_EDIT (no
  // VIEW) could reach this page while both GET requests below (warehouse + shipping
  // config, both SETTINGS_VIEW-gated on the backend) silently failed with an empty
  // catch block, leaving the form stuck on hardcoded defaults with zero explanation.
  // canEdit was previously hardcoded `true` ("both admin and super admin can edit forms
  // in frontend") — a leftover from before staff access to this page existed at all, so
  // it never actually reflected whether the logged-in staff member had SETTINGS_EDIT.
  const isStaff = user.role === "STAFF";
  const canView = !isStaff || hasPermission("SETTINGS_VIEW");
  const canEdit = !isStaff || hasPermission("SETTINGS_EDIT");

  const [settings, setSettings] = useState<WarehouseSettings>({ lat: 9.9312, lng: 76.2673, name: "Main Warehouse" });
  const [form, setForm] = useState<WarehouseSettings>({ lat: 9.9312, lng: 76.2673, name: "Main Warehouse" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Shipping config state
  const DEFAULT_SHIPPING: ShippingConfig = {
    sameStatePerKmRate: 5,
    sameStateFreeKmThreshold: 10,
    noLocationFlatRate: 50,
    stateRates: { Kerala: 50 },
    districtRates: {},
    calculateShippingForCOD: true,
    calculateShippingForOnline: true,
    calculateShippingForQR: true,
  };
  const [shippingConfig, setShippingConfig] = useState<ShippingConfig>(DEFAULT_SHIPPING);
  const [shippingForm, setShippingForm] = useState<ShippingConfig>(DEFAULT_SHIPPING);
  const [selectedState, setSelectedState] = useState("");
  const [stateBaseRate, setStateBaseRate] = useState("");
  const [districtStateFilter, setDistrictStateFilter] = useState("");
  const [districtName, setDistrictName] = useState("");
  const [districtRate, setDistrictRate] = useState("");
  const [shippingSaving, setShippingSaving] = useState(false);
  const [shippingSuccess, setShippingSuccess] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const shippingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Customer tracking partner settings state
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [enabledPartners, setEnabledPartners] = useState<string[]>(["DTDC", "Delhivery"]);
  const [availablePartners, setAvailablePartners] = useState<{ name: string; trackingUrlTemplate: string }[]>([]);
  const [partnerUrls, setPartnerUrls] = useState<Record<string, string>>({});
  const [deletedPartners, setDeletedPartners] = useState<string[]>([]);
  const [editingPartner, setEditingPartner] = useState<{ name: string; url: string } | null>(null);
  const [showAllLinksTable, setShowAllLinksTable] = useState(false);
  const [partnerUrlSearch, setPartnerUrlSearch] = useState("");
  const [trackingSaving, setTrackingSaving] = useState(false);
  const [trackingSuccess, setTrackingSuccess] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [customPartnerName, setCustomPartnerName] = useState("");
  const [savedTrackingSettings, setSavedTrackingSettings] = useState<{
    enabled: boolean;
    enabledPartners: string[];
    partnerUrls: Record<string, string>;
    deletedPartners: string[];
  } | null>(null);

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      return;
    }
    api.get("/settings/warehouse")
      .then((res) => {
        setSettings(res.data);
        setForm(res.data);
      })
      .catch(() => { setError("Failed to load warehouse settings"); })
      .finally(() => setLoading(false));
    // Load shipping config
    api.get("/settings/shipping-config")
      .then((res) => {
        const loaded: ShippingConfig = {
          ...res.data,
          districtRates: res.data.districtRates ?? {},
          calculateShippingForCOD: res.data.calculateShippingForCOD !== false,
          calculateShippingForOnline: res.data.calculateShippingForOnline !== false,
          calculateShippingForQR: res.data.calculateShippingForQR !== false,
        };
        setShippingConfig(loaded);
        setShippingForm(loaded);
      })
      .catch(() => { setShippingError("Failed to load shipping config"); });
    // Load tracking partner settings
    api.get("/settings/tracking-partners")
      .then((res) => {
        const isEnabled = res.data.enabled !== false;
        const partners = Array.isArray(res.data.enabledPartners) && res.data.enabledPartners.length > 0
          ? res.data.enabledPartners
          : ["DTDC", "Delhivery"];
        const urls = res.data.partnerUrls || {};
        const deleted = res.data.deletedPartners || [];

        setTrackingEnabled(isEnabled);
        setEnabledPartners(partners);
        setAvailablePartners(res.data.availablePartners || []);
        setPartnerUrls(urls);
        setDeletedPartners(deleted);

        setSavedTrackingSettings({
          enabled: isEnabled,
          enabledPartners: [...partners].sort(),
          partnerUrls: { ...urls },
          deletedPartners: [...deleted].sort(),
        });
      })
      .catch(() => {});
  }, [canView]);

  const handleMapPick = (lat: number, lng: number) => {
    if (!canEdit) return;
    setForm((f) => ({ ...f, lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) }));
  };

  const handleSave = async () => {
    if (!canEdit) {
      setError("You don't have permission to edit warehouse settings — ask an admin to grant it.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await api.put("/settings/warehouse", form);
      setSettings({ lat: res.data.lat, lng: res.data.lng, name: res.data.name });
      setSuccess(true);
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const isShippingDirty = JSON.stringify(shippingConfig) !== JSON.stringify(shippingForm);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isShippingDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isShippingDirty]);

  const persistShipping = async (newConfig: ShippingConfig, successToast?: string) => {
    if (!canEdit) {
      setShippingError("You don't have permission to edit shipping config — ask an admin to grant it.");
      toast.error("You don't have permission to edit shipping config.");
      return false;
    }
    setShippingSaving(true);
    setShippingError(null);
    setShippingSuccess(false);
    try {
      await api.put("/settings/shipping-config", newConfig);
      setShippingConfig(newConfig);
      setShippingForm(newConfig);
      setShippingSuccess(true);
      if (shippingTimer.current) clearTimeout(shippingTimer.current);
      shippingTimer.current = setTimeout(() => setShippingSuccess(false), 3000);
      if (successToast) {
        toast.success(successToast);
      }
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.message ?? "Failed to save shipping config";
      setShippingError(msg);
      toast.error(msg);
      return false;
    } finally {
      setShippingSaving(false);
    }
  };

  const handleShippingSave = async () => {
    await persistShipping(shippingForm, "Shipping rates saved successfully!");
  };

  const togglePaymentShipping = (
    key: "calculateShippingForCOD" | "calculateShippingForOnline" | "calculateShippingForQR"
  ) => {
    setShippingForm((prev) => {
      const currentVal = prev[key] !== false;
      return {
        ...prev,
        [key]: !currentVal,
      };
    });
  };

  const handleAddStateRate = async () => {
    if (!selectedState) {
      toast.error("Please select a state.");
      return;
    }
    const rate = parseFloat(stateBaseRate);
    if (isNaN(rate) || rate < 0) {
      toast.error("Please enter a valid base rate.");
      return;
    }
    const stateName = selectedState;
    const updated: ShippingConfig = {
      ...shippingForm,
      stateRates: {
        ...(shippingForm.stateRates || {}),
        [stateName]: rate,
      },
    };
    setShippingForm(updated);
    setSelectedState("");
    setStateBaseRate("");
    await persistShipping(updated, `Saved ${stateName} base rate (₹${rate}) successfully!`);
  };

  const handleDeleteStateRate = async (st: string) => {
    const nextStateRates = { ...shippingForm.stateRates };
    delete nextStateRates[st];
    const updated: ShippingConfig = {
      ...shippingForm,
      stateRates: nextStateRates,
    };
    setShippingForm(updated);
    await persistShipping(updated, `Removed ${st} base rate.`);
  };

  const handleAddDistrictRate = async () => {
    if (!districtStateFilter) {
      toast.error("Please select a state.");
      return;
    }
    const name = districtName.trim();
    if (!name) {
      toast.error("Please enter a district or city name.");
      return;
    }
    const rate = parseFloat(districtRate);
    if (isNaN(rate) || rate < 0) {
      toast.error("Please enter a valid rate.");
      return;
    }
    const updated: ShippingConfig = {
      ...shippingForm,
      districtRates: {
        ...(shippingForm.districtRates || {}),
        [districtStateFilter]: {
          ...((shippingForm.districtRates || {})[districtStateFilter] || {}),
          [name]: rate,
        },
      },
    };
    setShippingForm(updated);
    setDistrictName("");
    setDistrictRate("");
    await persistShipping(updated, `Saved ${name}, ${districtStateFilter} (₹${rate}) successfully!`);
  };

  const handleDeleteDistrictRate = async (st: string, dist: string) => {
    const nextState = { ...(shippingForm.districtRates?.[st] || {}) };
    delete nextState[dist];
    const nextDistrictRates = { ...(shippingForm.districtRates || {}) };
    if (Object.keys(nextState).length === 0) {
      delete nextDistrictRates[st];
    } else {
      nextDistrictRates[st] = nextState;
    }
    const updated: ShippingConfig = {
      ...shippingForm,
      districtRates: nextDistrictRates,
    };
    setShippingForm(updated);
    await persistShipping(updated, `Removed override for ${dist}, ${st}.`);
  };

  const togglePartner = (name: string) => {
    if (!canEdit) return;
    setEnabledPartners((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  };

  const handleSelectAllPartners = () => {
    if (!canEdit) return;
    const allNames = availablePartners.map((p) => p.name);
    setEnabledPartners(allNames);
  };

  const handleClearAllPartners = () => {
    if (!canEdit) return;
    setEnabledPartners([]);
  };

  const handleResetToDefaults = () => {
    if (!canEdit) return;
    setEnabledPartners(["DTDC", "Delhivery"]);
  };

  const openEditPartnerUrl = (partnerName: string) => {
    const currentPartner = availablePartners.find(
      (p) => p.name.toLowerCase() === partnerName.toLowerCase()
    );
    const currentUrl =
      partnerUrls[partnerName] ||
      currentPartner?.trackingUrlTemplate ||
      `https://${encodeURIComponent(partnerName.toLowerCase().replace(/\s+/g, ""))}.com`;

    setEditingPartner({
      name: partnerName,
      url: currentUrl,
    });
  };

  const handleSaveEditingPartnerUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingPartner) return;

    const cleanUrl = editingPartner.url.trim();
    if (!cleanUrl) {
      toast.error("Please enter a valid tracking URL.");
      return;
    }

    setPartnerUrls((prev) => ({
      ...prev,
      [editingPartner.name]: cleanUrl,
    }));

    setAvailablePartners((prev) =>
      prev.map((p) =>
        p.name.toLowerCase() === editingPartner.name.toLowerCase()
          ? { ...p, trackingUrlTemplate: cleanUrl }
          : p
      )
    );

    toast.success(`Updated tracking link for ${editingPartner.name}! Click 'Save Tracking Settings' to persist.`);
    setEditingPartner(null);
  };

  const handleResetEditingPartnerUrl = () => {
    if (!editingPartner) return;
    const partnerName = editingPartner.name;
    const norm = partnerName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    let defaultUrl = `https://${encodeURIComponent(partnerName.toLowerCase().replace(/\s+/g, ""))}.com`;
    if (norm.includes("dhl")) defaultUrl = "https://www.dhl.com/en/express/tracking.html?AWB={trackingNumber}&brand=DHL";
    else if (norm.includes("delhivery")) defaultUrl = "https://www.delhivery.com/track/package/{trackingNumber}";
    else if (norm.includes("dtdc")) defaultUrl = "https://tracking.dtdc.com/ctapp/services?cType=awb&awbNo={trackingNumber}";
    else if (norm.includes("bluedart") || (norm.includes("blue") && norm.includes("dart"))) defaultUrl = "https://www.bluedart.com/web/guest/trackdartresult?trackFor=0&trackNo={trackingNumber}";
    else if (norm.includes("indiapost") || norm.includes("speedpost") || norm.includes("post")) defaultUrl = "https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx";
    else if (norm.includes("shadowfax")) defaultUrl = "https://tracker.shadowfax.in/#/track/{trackingNumber}";
    else if (norm.includes("ekart")) defaultUrl = "https://ekartlogistics.com/shipmenttrack/{trackingNumber}";
    else if (norm.includes("xpress") || norm.includes("xpressbees")) defaultUrl = "https://www.xpressbees.com/track?awb={trackingNumber}";
    else if (norm.includes("ecomexpress") || norm.includes("ecom")) defaultUrl = "https://ecomexpress.in/tracking/?awb={trackingNumber}";
    else if (norm.includes("fedex")) defaultUrl = "https://www.fedex.com/fedextrack/?trknbr={trackingNumber}";
    else if (norm.includes("amazon")) defaultUrl = "https://track.amazon.in/tracking/{trackingNumber}";
    else if (norm.includes("aramex")) defaultUrl = "https://www.aramex.com/track/results?ShipmentNumber={trackingNumber}";
    else if (norm.includes("ups")) defaultUrl = "https://www.ups.com/track?tracknum={trackingNumber}";
    else if (norm.includes("gati")) defaultUrl = "https://www.gati.com/";
    else if (norm.includes("professional") || norm.includes("tpc")) defaultUrl = "https://www.tpcindia.com/";
    else if (norm.includes("stcourier") || (norm.includes("st") && norm.includes("courier"))) defaultUrl = "https://stcourier.com/";
    else if (norm.includes("trackon")) defaultUrl = "https://trackon.in/";
    else if (norm.includes("vrl")) defaultUrl = "https://www.vrlgroup.in/";
    else if (norm.includes("maruti")) defaultUrl = "https://shreemaruticourier.com/";
    else if (norm.includes("nandan")) defaultUrl = "https://www.shreenandan.com/";
    else if (norm.includes("overnite")) defaultUrl = "https://www.overnite-express.com/";

    setEditingPartner({
      ...editingPartner,
      url: defaultUrl,
    });
    toast.success(`Reset ${partnerName} link to official default.`);
  };

  const handleAddCustomPartner = () => {
    if (!canEdit) return;
    const trimmed = customPartnerName.trim();
    if (!trimmed) return;
    const defaultUrl = `https://${encodeURIComponent(trimmed.toLowerCase().replace(/\s+/g, ""))}.com`;
    if (!availablePartners.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setAvailablePartners((prev) => [
        ...prev,
        {
          name: trimmed,
          trackingUrlTemplate: defaultUrl,
        },
      ]);
    }
    if (!enabledPartners.includes(trimmed)) {
      setEnabledPartners((prev) => [...prev, trimmed]);
    }
    setDeletedPartners((prev) => prev.filter((p) => p.toLowerCase() !== trimmed.toLowerCase()));
    setCustomPartnerName("");
    toast.success(`Added ${trimmed} to delivery partners! You can edit its link by clicking the pencil icon.`);
  };

  const isTrackingDirty = useMemo(() => {
    if (!savedTrackingSettings) return false;

    if (savedTrackingSettings.enabled !== trackingEnabled) return true;

    const currentPartners = [...enabledPartners].sort();
    if (
      currentPartners.length !== savedTrackingSettings.enabledPartners.length ||
      currentPartners.some((val, idx) => val !== savedTrackingSettings.enabledPartners[idx])
    ) {
      return true;
    }

    const savedUrls = savedTrackingSettings.partnerUrls || {};
    const currentUrls = partnerUrls || {};
    const savedKeys = Object.keys(savedUrls);
    const currentKeys = Object.keys(currentUrls);
    if (savedKeys.length !== currentKeys.length) return true;
    for (const key of currentKeys) {
      if (currentUrls[key] !== savedUrls[key]) return true;
    }

    const currentDeleted = [...deletedPartners].sort();
    if (
      currentDeleted.length !== savedTrackingSettings.deletedPartners.length ||
      currentDeleted.some((val, idx) => val !== savedTrackingSettings.deletedPartners[idx])
    ) {
      return true;
    }

    return false;
  }, [savedTrackingSettings, trackingEnabled, enabledPartners, partnerUrls, deletedPartners]);

  const handleDeletePartner = async (partnerName: string) => {
    if (!canEdit) {
      toast.error("You don't have permission to edit tracking settings.");
      return;
    }
    const confirmed = window.confirm(`Are you sure you want to remove "${partnerName}" from delivery partners?`);
    if (!confirmed) return;

    try {
      await api.delete(`/settings/tracking-partners/${encodeURIComponent(partnerName)}`);
      setAvailablePartners((prev) => prev.filter((p) => p.name.toLowerCase() !== partnerName.toLowerCase()));
      setEnabledPartners((prev) => prev.filter((p) => p.toLowerCase() !== partnerName.toLowerCase()));
      setDeletedPartners((prev) => (prev.includes(partnerName) ? prev : [...prev, partnerName]));
      setSavedTrackingSettings((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          enabledPartners: prev.enabledPartners.filter((p) => p.toLowerCase() !== partnerName.toLowerCase()),
          deletedPartners: prev.deletedPartners.includes(partnerName)
            ? prev.deletedPartners
            : [...prev.deletedPartners, partnerName],
        };
      });
      toast.success(`Removed ${partnerName} from delivery partners!`);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to delete delivery partner";
      toast.error(msg);
    }
  };

  const handleSaveTrackingPartners = async () => {
    if (!canEdit) {
      toast.error("You don't have permission to edit tracking settings.");
      return;
    }
    if (!isTrackingDirty) return;

    setTrackingSaving(true);
    setTrackingError(null);
    try {
      await api.put("/settings/tracking-partners", {
        enabled: trackingEnabled,
        enabledPartners,
        partnerUrls,
        deletedPartners,
      });
      setSavedTrackingSettings({
        enabled: trackingEnabled,
        enabledPartners: [...enabledPartners].sort(),
        partnerUrls: { ...partnerUrls },
        deletedPartners: [...deletedPartners].sort(),
      });
      setTrackingSuccess(true);
      toast.success("Customer tracking settings & custom links saved successfully!");
      setTimeout(() => setTrackingSuccess(false), 4000);
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to save tracking settings";
      setTrackingError(msg);
      toast.error(msg);
    } finally {
      setTrackingSaving(false);
    }
  };


  const parseNum = (val: string, fallback: number) => {
    const n = parseFloat(val);
    return isNaN(n) ? fallback : n;
  };

  const parseCoord = (val: string, fallback: number) => {
    const n = parseFloat(val);
    return isNaN(n) ? fallback : n;
  };

  const mapCenter: [number, number] = [form.lat, form.lng];



  /** Automatically triggers a layout sync when map coordinates initialize or shift */
  function MapResizeTrigger() {
    const map = useMapEvents({});

    useEffect(() => {
      setTimeout(() => {
        map.invalidateSize();
      }, 250); // Small timeout to ensure the DOM layout rendering paint has completed
    }, [map]);

    return null;
  }

  return (
    <div className="px-8 pt-8 pb-80 w-full bg-slate-50/50 min-h-screen">
      <style>{`
        .leaflet-container {
          cursor: pointer !important;
        }
        .leaflet-marker-icon.leaflet-marker-draggable {
          cursor: grab !important;
        }
        .leaflet-marker-icon.leaflet-marker-draggable:active,
        .leaflet-marker-dragging .leaflet-marker-icon {
          cursor: grabbing !important;
        }
        .custom-dropdown-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .custom-dropdown-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-dropdown-scroll::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 4px;
        }
        .custom-dropdown-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }
      `}</style>
      {/* Premium Dashboard Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 mb-6 border-b border-gray-200">
        <div>

          <h1 className="text-3xl font-black tracking-tight text-gray-950 flex items-center gap-2.5">
            {/* <BuildingStorefrontIcon className="w-8 h-8 text-emerald-600" strokeWidth={2.2} /> */}
            Warehouse Location
          </h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Set the warehouse geo-coordinates used to dynamically calculate customer shipping charges and determine baseline per-kilometer fulfillment distribution rates.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm uppercase font-bold tracking-widest text-slate-400 font-mono select-none">
            Loading warehouse settings...
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── Form ── */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">


              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Warehouse Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  disabled={!canEdit}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-400"
                  placeholder="e.g. Kochi Warehouse"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={form.lat}
                    disabled={!canEdit}
                    onChange={(e) => setForm((f) => ({ ...f, lat: parseCoord(e.target.value, f.lat) }))}
                    className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-sm font-mono shadow-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={form.lng}
                    disabled={!canEdit}
                    onChange={(e) => setForm((f) => ({ ...f, lng: parseCoord(e.target.value, f.lng) }))}
                    className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-sm font-mono shadow-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
              </div>

              {canEdit && (
                <p className="text-xs text-gray-400">
                  Tip: click anywhere on the map or drag the pin to set the exact warehouse location.
                </p>
              )}

              {/* Current saved value */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-500 flex items-start gap-2">
                <MapPinIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span>
                  Current saved: <strong className="font-mono text-gray-700">{settings.lat}, {settings.lng}</strong> — {settings.name}
                </span>
              </div>

              {/* Feedback */}
              {success && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                  <CheckCircle className="w-4 h-4" />
                  Warehouse location saved successfully!
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {canEdit && (
                 <button
                   onClick={handleSave}
                   disabled={saving || JSON.stringify(settings) === JSON.stringify(form)}
                   className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                 >
                   {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPinIcon className="w-4 h-4" />}
                   {saving ? "Saving…" : "Save Warehouse Location"}
                 </button>
              )}
            </div>

            {/* ── Map ── */}
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ minHeight: 380, isolation: "isolate" }}>

              <MapContainer
                center={mapCenter}
                zoom={12}
                minZoom={4}
                maxBounds={INDIA_BOUNDS}
                maxBoundsViscosity={1.0}
                style={{ height: "100%", minHeight: 380, width: "100%", cursor: canEdit ? "pointer" : "default" }}
                key={`${settings.lat}-${settings.lng}`}
              >
                <TileLayer
                  attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                  url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
                <DraggableWarehouseMarker
                  position={[form.lat, form.lng]}
                  canEdit={canEdit}
                  onPick={handleMapPick}
                />
                {canEdit && <MapClickHandler onPick={handleMapPick} />}
                <MapRecenter center={mapCenter} />

                {/* Add this single line here */}
                <MapResizeTrigger />
              </MapContainer>
              {canEdit && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-full px-4 py-1.5 text-xs text-gray-700 shadow-md font-medium pointer-events-none z-[1000] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Click anywhere on the map or drag the pin to move</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Shipping Rates Configuration ── */}
          <div className="mt-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Shipping Rates Configuration</h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Configure how shipping is calculated for different regions. Adding or removing a rate automatically saves to the database.
                  </p>
                </div>
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  {isShippingDirty && (
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                      Unsaved changes
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleShippingSave}
                    disabled={shippingSaving || !isShippingDirty}
                    className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-xs font-bold text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    {shippingSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    {shippingSaving ? "Saving…" : "Save Shipping Rates"}
                  </button>
                </div>
              )}
            </div>

            {isShippingDirty && (
              <div className="mb-5 flex items-center justify-between gap-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>You have unsaved changes. Click <strong>Save Shipping Rates</strong> to persist them to the database.</span>
                </div>
                <button
                  type="button"
                  onClick={handleShippingSave}
                  disabled={shippingSaving}
                  className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1 rounded-lg text-xs transition"
                >
                  Save Now
                </button>
              </div>
            )}

            {!canEdit ? (
              <p className="text-sm text-gray-400 italic">Shipping rates are read-only while Warehouse Settings is disabled.</p>
            ) : (
              <>
                {/* ── Payment Method Shipping Calculation Toggles ── */}
                <div className="mb-6 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/80 via-white to-slate-50/50 p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-200/60">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-slate-600" />
                        Payment Method Shipping Calculation
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Enable or disable shipping charges for each payment method. When disabled, customers get Free Shipping (₹0) at checkout.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Cash on Delivery */}
                    <div
                      className={`relative rounded-xl border p-4 transition-all duration-200 ${
                        shippingForm.calculateShippingForCOD !== false
                          ? "bg-white border-slate-200 shadow-sm"
                          : "bg-amber-50/40 border-amber-200/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            shippingForm.calculateShippingForCOD !== false
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-amber-100/70 text-amber-700"
                          }`}>
                            <Banknote className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">Cash on Delivery</h4>
                            <span className="text-[11px] font-mono text-slate-400">COD / POD</span>
                          </div>
                        </div>

                        {/* Switch */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={shippingForm.calculateShippingForCOD !== false}
                          disabled={shippingSaving}
                          onClick={() => togglePaymentShipping("calculateShippingForCOD")}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 ${
                            shippingForm.calculateShippingForCOD !== false ? "bg-emerald-600" : "bg-slate-300"
                          } ${shippingSaving ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              shippingForm.calculateShippingForCOD !== false ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">Shipping Fee:</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            shippingForm.calculateShippingForCOD !== false
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {shippingForm.calculateShippingForCOD !== false ? "Calculated by distance/state" : "FREE (₹0 fee)"}
                        </span>
                      </div>
                    </div>

                    {/* Pay Online */}
                    <div
                      className={`relative rounded-xl border p-4 transition-all duration-200 ${
                        shippingForm.calculateShippingForOnline !== false
                          ? "bg-white border-slate-200 shadow-sm"
                          : "bg-amber-50/40 border-amber-200/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            shippingForm.calculateShippingForOnline !== false
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-amber-100/70 text-amber-700"
                          }`}>
                            <CreditCard className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">Pay Online</h4>
                            <span className="text-[11px] font-mono text-slate-400">Cards, UPI, NetBanking</span>
                          </div>
                        </div>

                        {/* Switch */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={shippingForm.calculateShippingForOnline !== false}
                          disabled={shippingSaving}
                          onClick={() => togglePaymentShipping("calculateShippingForOnline")}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 ${
                            shippingForm.calculateShippingForOnline !== false ? "bg-emerald-600" : "bg-slate-300"
                          } ${shippingSaving ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              shippingForm.calculateShippingForOnline !== false ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">Shipping Fee:</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            shippingForm.calculateShippingForOnline !== false
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {shippingForm.calculateShippingForOnline !== false ? "Calculated by distance/state" : "FREE (₹0 fee)"}
                        </span>
                      </div>
                    </div>

                    {/* Pay via QR Code */}
                    <div
                      className={`relative rounded-xl border p-4 transition-all duration-200 ${
                        shippingForm.calculateShippingForQR !== false
                          ? "bg-white border-slate-200 shadow-sm"
                          : "bg-amber-50/40 border-amber-200/80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            shippingForm.calculateShippingForQR !== false
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-amber-100/70 text-amber-700"
                          }`}>
                            <QrCode className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">Pay via QR Code</h4>
                            <span className="text-[11px] font-mono text-slate-400">Scan & Upload</span>
                          </div>
                        </div>

                        {/* Switch */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={shippingForm.calculateShippingForQR !== false}
                          disabled={shippingSaving}
                          onClick={() => togglePaymentShipping("calculateShippingForQR")}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 ${
                            shippingForm.calculateShippingForQR !== false ? "bg-emerald-600" : "bg-slate-300"
                          } ${shippingSaving ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              shippingForm.calculateShippingForQR !== false ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">Shipping Fee:</span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            shippingForm.calculateShippingForQR !== false
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {shippingForm.calculateShippingForQR !== false ? "Calculated by distance/state" : "FREE (₹0 fee)"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Per-State Base Rates */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <MapPinIcon className="w-4 h-4 text-slate-400" />
                      <h3 className="text-sm font-bold text-gray-900">Per-State Base Rates</h3>
                      <span className="ml-auto text-[11px] font-bold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                        {Object.keys(shippingForm.stateRates || {}).length}
                      </span>
                    </div>

                    {/* Add state rate form */}
                    <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 mb-4 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Select State
                        </label>
                        <StateSearchSelect
                          value={selectedState}
                          onChange={setSelectedState}
                          excludeValues={Object.keys(shippingForm.stateRates || {})}
                        />
                      </div>
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Base Rate (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={stateBaseRate}
                            onChange={(e) => setStateBaseRate(e.target.value)}
                            placeholder="e.g. 50"
                            className="w-full rounded-xl border-slate-200 px-4 py-2.5 text-sm font-mono shadow-sm focus:border-black focus:ring-1 focus:ring-black focus:outline-none bg-white transition-all duration-200"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={shippingSaving}
                          onClick={handleAddStateRate}
                          className="shrink-0 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-5 py-2.5 text-sm font-semibold transition shadow-sm hover:shadow"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Configured state rates list */}
                    {Object.keys(shippingForm.stateRates || {}).length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <p className="text-xs text-slate-400 italic">No states configured yet. Select a state and rate above to add one.</p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 overflow-hidden max-h-[360px] overflow-y-auto custom-dropdown-scroll">
                        <div className="divide-y divide-slate-100">
                          {Object.entries(shippingForm.stateRates || {}).map(([st, rate]) => (
                            <div
                              key={st}
                              className="group flex items-center justify-between gap-3 px-4 py-3 bg-white hover:bg-slate-50/70 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                  <MapPinIcon className="w-4 h-4 text-slate-500" />
                                </div>
                                <span className="text-sm font-semibold text-slate-800 truncate" title={st}>{st}</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-sm font-bold text-slate-900 font-mono">₹{rate}</span>
                                <button
                                  type="button"
                                  disabled={shippingSaving}
                                  onClick={() => handleDeleteStateRate(st)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors duration-150"
                                  title={`Delete ${st}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Per-District/City Overrides */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <BuildingStorefrontIcon className="w-4 h-4 text-slate-400" />
                      <h3 className="text-sm font-bold text-gray-900">Per-District / City Overrides</h3>
                      <span className="ml-auto text-[11px] font-bold text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                        {Object.values(shippingForm.districtRates || {}).reduce((n, m) => n + Object.keys(m).length, 0)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-3">
                      Optional — set a more specific rate for a district or city within a state. When a customer's
                      address city matches, this wins over that state's base rate.
                    </p>

                    <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 mb-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            State
                          </label>
                          <StateSearchSelect
                            value={districtStateFilter}
                            onChange={(st) => {
                              setDistrictStateFilter(st);
                              setDistrictName("");
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            District / City
                          </label>
                          <DistrictSearchSelect
                            state={districtStateFilter}
                            value={districtName}
                            onChange={setDistrictName}
                            excludeValues={Object.keys((shippingForm.districtRates || {})[districtStateFilter] || {})}
                          />
                        </div>
                      </div>
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            Rate (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={districtRate}
                            onChange={(e) => setDistrictRate(e.target.value)}
                            placeholder="e.g. 40"
                            className="w-full rounded-xl border-slate-200 px-4 py-2.5 text-sm font-mono shadow-sm focus:border-black focus:ring-1 focus:ring-black focus:outline-none bg-white transition-all duration-200"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={shippingSaving}
                          onClick={handleAddDistrictRate}
                          className="shrink-0 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-5 py-2.5 text-sm font-semibold transition shadow-sm hover:shadow"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Configured district rates, grouped by state */}
                    {Object.keys(shippingForm.districtRates || {}).length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        <p className="text-xs text-slate-400 italic">No district overrides configured yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1 custom-dropdown-scroll">
                        {Object.entries(shippingForm.districtRates || {}).map(([st, districts]) => (
                          Object.keys(districts).length === 0 ? null : (
                            <div key={st} className="rounded-2xl border border-slate-200 overflow-hidden">
                              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5">
                                <MapPinIcon className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{st}</span>
                              </div>
                              <div className="divide-y divide-slate-100">
                                {Object.entries(districts).map(([dist, rate]) => (
                                  <div
                                    key={dist}
                                    className="group flex items-center justify-between gap-3 px-4 py-3 bg-white hover:bg-slate-50/70 transition-colors"
                                  >
                                    <span className="text-sm font-semibold text-slate-800 truncate" title={dist}>{dist}</span>
                                    <div className="flex items-center gap-3 shrink-0">
                                      <span className="text-sm font-bold text-slate-900 font-mono">₹{rate}</span>
                                      <button
                                        type="button"
                                        disabled={shippingSaving}
                                        onClick={() => handleDeleteDistrictRate(st, dist)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors duration-150"
                                        title={`Delete ${dist}`}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Live preview */}
                <div className="mt-6 bg-blue-50/60 border border-blue-200 rounded-2xl p-4">
                  <p className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2.5">Current effective rates</p>
                  {Object.keys(shippingForm.stateRates || {}).length === 0 &&
                  Object.values(shippingForm.districtRates || {}).every((m) => Object.keys(m).length === 0) ? (
                    <p className="text-xs text-blue-700">No custom rates configured yet — defaults apply.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(shippingForm.stateRates || {}).map(([st, val]) => (
                        <span
                          key={st}
                          className="inline-flex items-center gap-1 bg-white border border-blue-200 rounded-full px-2.5 py-1 text-[11px] font-medium text-blue-800"
                        >
                          {st} <span className="font-mono font-bold">₹{val}</span>
                        </span>
                      ))}
                      {Object.entries(shippingForm.districtRates || {}).flatMap(([st, districts]) =>
                        Object.entries(districts).map(([dist, val]) => (
                          <span
                            key={`${st}-${dist}`}
                            className="inline-flex items-center gap-1 bg-white border border-blue-200 rounded-full px-2.5 py-1 text-[11px] font-medium text-blue-800"
                          >
                            {dist}, {st} <span className="font-mono font-bold">₹{val}</span>
                          </span>
                        )),
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-blue-600 mt-2.5">No international shipping.</p>
                </div>

                {shippingSuccess && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                    <CheckCircle className="w-4 h-4" />
                    Shipping rates saved successfully!
                  </div>
                )}
                {shippingError && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                    <AlertTriangle className="w-4 h-4" />
                    {shippingError}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Customer Shipment Tracking & Delivery Partners Card */}
          <div className="mt-8 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-xs">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                    Customer Shipment Tracking & Delivery Partners
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure delivery couriers that customers and guest visitors can track directly from the navbar.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={trackingSaving || !canEdit || !isTrackingDirty}
                onClick={handleSaveTrackingPartners}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all shrink-0 ${
                  !isTrackingDirty || !canEdit || trackingSaving
                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
                    : "bg-slate-900 text-white shadow-sm hover:bg-slate-800 active:scale-95 cursor-pointer ring-2 ring-slate-900/10"
                }`}
              >
                {trackingSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {isTrackingDirty ? "Save Tracking Settings" : "Settings Saved"}
                  </>
                )}
              </button>
            </div>

            {/* Master Switch: Enable in Navbar */}
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    Show "Shipment Tracking" in Customer Navbar
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      trackingEnabled
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : "bg-slate-200 text-slate-600 border-slate-300"
                    }`}
                  >
                    {trackingEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  When turned on, a "Shipment Tracking" button with a truck icon appears in the desktop header and mobile menu for all visitors (no login required).
                </p>
              </div>

              <button
                type="button"
                disabled={!canEdit}
                onClick={() => setTrackingEnabled((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  trackingEnabled ? "bg-slate-900" : "bg-slate-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    trackingEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Partner Selector */}
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Active Delivery Partners for Customer Search
                  </label>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select which couriers your customers can choose from when entering a tracking number.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={handleSelectAllPartners}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={handleResetToDefaults}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                  >
                    DTDC & Delhivery Only
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={handleClearAllPartners}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 transition"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Couriers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {availablePartners.map((partner) => {
                  const isSelected = enabledPartners.includes(partner.name);
                  const customUrl = partnerUrls[partner.name];
                  const hasCustomUrl = !!customUrl;
                  const currentUrl = customUrl || partner.trackingUrlTemplate || "";

                  return (
                    <div
                      key={partner.name}
                      className={`group relative flex items-center justify-between p-3 rounded-2xl border transition-all duration-150 ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-white hover:border-slate-300"
                      }`}
                    >
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => togglePartner(partner.name)}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                      >
                        <CourierLogo name={partner.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold truncate">{partner.name}</span>
                            {hasCustomUrl && (
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tight ${
                                  isSelected ? "bg-amber-400 text-slate-950" : "bg-amber-100 text-amber-900 border border-amber-200"
                                }`}
                              >
                                Custom
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-[10px] truncate max-w-[130px] font-mono mt-0.5 ${
                              isSelected ? "text-slate-300" : "text-slate-400"
                            }`}
                            title={currentUrl}
                          >
                            {currentUrl ? currentUrl.replace(/^https?:\/\//, "") : "Direct Portal"}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0 ml-1.5">
                        {/* Edit URL Button */}
                        <button
                          type="button"
                          disabled={!canEdit}
                          title={`Edit tracking link for ${partner.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditPartnerUrl(partner.name);
                          }}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isSelected
                              ? "text-slate-300 hover:text-white hover:bg-white/10"
                              : "text-slate-400 hover:text-slate-900 hover:bg-slate-200/70"
                          }`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Partner Button */}
                        <button
                          type="button"
                          disabled={!canEdit}
                          title={`Remove ${partner.name} from list`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePartner(partner.name);
                          }}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isSelected
                              ? "text-slate-300 hover:text-rose-300 hover:bg-rose-500/20"
                              : "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle Checkbox */}
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => togglePartner(partner.name)}
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Custom Partner Input */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
                <input
                  type="text"
                  disabled={!canEdit}
                  value={customPartnerName}
                  onChange={(e) => setCustomPartnerName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomPartner();
                    }
                  }}
                  placeholder="Add custom courier name (e.g. ST Courier, Trackon)..."
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs shadow-sm bg-white focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
                />
                <button
                  type="button"
                  disabled={!canEdit || !customPartnerName.trim()}
                  onClick={handleAddCustomPartner}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 text-xs font-bold transition shadow-xs shrink-0 cursor-pointer"
                >
                  + Add Courier
                </button>
              </div>

              {/* View & Edit All Tracking Links Accordion */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAllLinksTable((prev) => !prev)}
                  className="flex items-center justify-between w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100/70 text-xs font-bold text-slate-800 transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-slate-600" />
                    <span>View & Configure All Courier Tracking URLs ({availablePartners.length})</span>
                  </div>
                  <ChevronDownIcon
                    className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${
                      showAllLinksTable ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showAllLinksTable && (
                  <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Filter couriers..."
                          value={partnerUrlSearch}
                          onChange={(e) => setPartnerUrlSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Click <strong>Edit</strong> to configure tracking link or <strong>Delete</strong> to remove.
                      </p>
                    </div>

                    <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-100 text-xs">
                      {availablePartners
                        .filter((p) =>
                          p.name.toLowerCase().includes(partnerUrlSearch.toLowerCase())
                        )
                        .map((partner) => {
                          const customUrl = partnerUrls[partner.name];
                          const activeUrl = customUrl || partner.trackingUrlTemplate || "";
                          const isSelected = enabledPartners.includes(partner.name);

                          return (
                            <div
                              key={partner.name}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 gap-2 hover:bg-slate-50/60 transition"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 sm:w-1/3">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    isSelected ? "bg-emerald-500" : "bg-slate-300"
                                  }`}
                                  title={isSelected ? "Enabled in Navbar" : "Disabled in Navbar"}
                                />
                                <CourierLogo name={partner.name} size="xs" />
                                <span className="font-bold text-slate-900 truncate">
                                  {partner.name}
                                </span>
                                {customUrl && (
                                  <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-amber-100 text-amber-800 shrink-0">
                                    Custom
                                  </span>
                                )}
                              </div>

                              <div className="flex-1 min-w-0 font-mono text-[11px] text-slate-500 truncate" title={activeUrl}>
                                {activeUrl}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  disabled={!canEdit}
                                  onClick={() => openEditPartnerUrl(partner.name)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer"
                                >
                                  <Pencil className="w-3 h-3" />
                                  <span>Edit Link</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={!canEdit}
                                  onClick={() => handleDeletePartner(partner.name)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 transition cursor-pointer"
                                  title={`Remove ${partner.name}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Mode Explanation Box */}
              <div className="rounded-2xl p-4 border bg-blue-50/60 border-blue-200 text-xs text-blue-950 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Customer Experience Preview:
                </div>
                {!trackingEnabled ? (
                  <p className="text-slate-600">
                    Tracking is currently <strong>disabled</strong>. The "Shipment Tracking" button will be hidden from the navbar.
                  </p>
                ) : enabledPartners.length === 0 ? (
                  <p className="text-amber-800 font-semibold">
                    ⚠️ No delivery partners selected. Select at least one courier above for tracking to appear in the navbar.
                  </p>
                ) : enabledPartners.length === 1 ? (
                  <p>
                    🎯 <strong>Single Partner Mode:</strong> Customer clicks "Shipment Tracking" in navbar &rarr; enters tracking number &rarr; directly redirected to <strong>{enabledPartners[0]}</strong>'s configured tracking portal.
                  </p>
                ) : (
                  <p>
                    ⚡ <strong>Multi-Partner Mode:</strong> Customer clicks "Shipment Tracking" in navbar &rarr; selects their courier (<strong>{enabledPartners.join(", ")}</strong>) &rarr; enters tracking number &rarr; redirected to that respective courier's configured tracking portal.
                  </p>
                )}
              </div>

              {trackingSuccess && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 animate-fadeIn">
                  <CheckCircle className="w-4 h-4" />
                  Customer tracking delivery partners & custom URLs saved successfully!
                </div>
              )}
              {trackingError && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 animate-fadeIn">
                  <AlertTriangle className="w-4 h-4" />
                  {trackingError}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Edit Courier Tracking URL Modal */}
      {editingPartner && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <CourierLogo name={editingPartner.name} size="md" />
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Edit Tracking Link: {editingPartner.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Configure the destination URL when customer tracks package with {editingPartner.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPartner(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditingPartnerUrl} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Tracking URL Template
                </label>
                <input
                  type="text"
                  value={editingPartner.url}
                  onChange={(e) => setEditingPartner({ ...editingPartner, url: e.target.value })}
                  placeholder="https://example.com/track?awb={trackingNumber}"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:border-black focus:ring-1 focus:ring-black focus:outline-none bg-slate-50/50 focus:bg-white transition"
                  spellCheck="false"
                />
                <div className="rounded-2xl p-3.5 bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 space-y-1.5">
                  <p className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Dynamic Placeholder:
                  </p>
                  <p>
                    Include <code className="bg-slate-200 text-slate-900 px-1.5 py-0.5 rounded font-bold font-mono">{"{trackingNumber}"}</code> in your URL where the user's tracking or AWB code should be inserted.
                  </p>
                  {editingPartner.url.includes("{trackingNumber}") ? (
                    <div className="text-emerald-700 font-medium bg-emerald-50 border border-emerald-200/60 p-2 rounded-lg">
                      ✅ Preview: <span className="font-mono text-[10px] break-all">{editingPartner.url.replace("{trackingNumber}", "1234567890")}</span>
                    </div>
                  ) : (
                    <div className="text-amber-800 font-medium bg-amber-50 border border-amber-200/60 p-2 rounded-lg">
                      ℹ️ Direct Portal: Redirects customer to this portal with tracking number automatically copied to clipboard.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleResetEditingPartnerUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Default URL
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPartner(null)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition shadow-sm cursor-pointer"
                  >
                    Update URL
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
