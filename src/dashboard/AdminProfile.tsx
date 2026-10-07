import React, { useEffect, useState } from "react";
import { domainUrl } from "../utils/constant";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Loader from "../components/Loader";
import { useAuth } from "../context/AuthContext";
import { useBranding } from "../context/BrandingContext";
import { useSeoSettings } from "../context/SeoContext";
import {
  Shield,
  Mail,
  User,
  CheckCircle,
  Key,
  RefreshCw,
  Smartphone,
  AlertCircle,
  Building2,
  Image,
  Type,
  Upload,
  Trash2,
  Lock,
  Pencil,
  Search,
  ChevronDown,
  QrCode,
  Info,
  Sparkles,
} from "lucide-react";
import api from "../utils/api";

interface AdminProfileData {
  username: string;
  email: string;
  role?: string;
  avatar?: string;
  phone?: string;
}

interface CompanySettings {
  COMPANY_NAME: string;
  COMPANY_TAGLINE: string;
  COMPANY_LOGO: string;
  COMPANY_FAVICON: string;
  SHOW_COMPANY_NAME: boolean;
  SHOW_COMPANY_TAGLINE: boolean;
  INVOICE_FORMAT: "A4" | "THERMAL";
  MSG91_EMAIL_FROM_NAME: string;
}

interface SeoFormData {
  SEO_TITLE_TEMPLATE: string;
  SEO_DEFAULT_DESCRIPTION: string;
  SEO_DEFAULT_OG_IMAGE: string;
  SEO_KEYWORDS: string;
  SEO_GOOGLE_SITE_VERIFICATION: string;
  SEO_GA_MEASUREMENT_ID: string;
  META_PIXEL_ID: string;
  SEO_ROBOTS_EXTRA: string;
  SEO_ORG_TYPE: string;
  SEO_ORG_ADDRESS: string;
  SEO_ORG_PHONE: string;
  SEO_ORG_EMAIL: string;
  SEO_SOCIAL_LINKS: string;
  SEO_HOME_TITLE: string;
  SEO_HOME_DESCRIPTION: string;
  SEO_PRODUCTS_TITLE: string;
  SEO_PRODUCTS_DESCRIPTION: string;
  /** Shown above the address/phone/email block on the Contact Us page. */
  PAGE_CONTACT_INTRO: string;
}

const EMPTY_SEO_FORM: SeoFormData = {
  SEO_TITLE_TEMPLATE: "",
  SEO_DEFAULT_DESCRIPTION: "",
  SEO_DEFAULT_OG_IMAGE: "",
  SEO_KEYWORDS: "",
  SEO_GOOGLE_SITE_VERIFICATION: "",
  SEO_GA_MEASUREMENT_ID: "",
  META_PIXEL_ID: "",
  SEO_ROBOTS_EXTRA: "",
  SEO_ORG_TYPE: "",
  SEO_ORG_ADDRESS: "",
  SEO_ORG_PHONE: "",
  SEO_ORG_EMAIL: "",
  SEO_SOCIAL_LINKS: "",
  SEO_HOME_TITLE: "",
  SEO_HOME_DESCRIPTION: "",
  SEO_PRODUCTS_TITLE: "",
  SEO_PRODUCTS_DESCRIPTION: "",
  PAGE_CONTACT_INTRO: "",
};

const AdminProfile = () => {
  const navigate = useNavigate();
  const { checkAuthStatus, logout } = useAuth();
  const { refresh: refreshBranding } = useBranding();
  const { refresh: refreshSeo } = useSeoSettings();

  const [profile, setProfile] = useState<AdminProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [formData, setFormData] = useState({ newUsername: "", newEmail: "" });

  const [requestingOtp, setRequestingOtp] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [showSecurityTips, setShowSecurityTips] = useState(false);

  const [company, setCompany] = useState<CompanySettings>({
    COMPANY_NAME: "",
    COMPANY_TAGLINE: "",
    COMPANY_LOGO: "",
    COMPANY_FAVICON: "",
    SHOW_COMPANY_NAME: true,
    SHOW_COMPANY_TAGLINE: true,
    INVOICE_FORMAT: "A4",
    MSG91_EMAIL_FROM_NAME: "",
  });
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companySaving, setCompanySaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  const [seo, setSeo] = useState<SeoFormData>(EMPTY_SEO_FORM);
  const [seoSaving, setSeoSaving] = useState(false);
  const [seoAdvancedOpen, setSeoAdvancedOpen] = useState(false);
  const [ogImageFile, setOgImageFile] = useState<File | null>(null);
  const [ogImagePreview, setOgImagePreview] = useState<string | null>(null);

  // ── Pay with QR state ───────────────────────────────────────────────────
  const [paymentQr, setPaymentQr] = useState({
    PAYMENT_QR_CODE: "",
    PAYMENT_QR_ENABLED: false,
    PAYMENT_QR_UPI_ID: "",
    PAYMENT_QR_ACCOUNT_NAME: "",
    PAYMENT_QR_INSTRUCTIONS: "",
  });
  const [qrSaving, setQrSaving] = useState(false);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);



  // ── Fetch admin profile ──────────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoadingProfile(true);
        const res = await api.get(`/admin/adminProfile?_t=${Date.now()}`);
        if (!res.data || !res.data.adminData) throw new Error("Invalid profile response");
        const data = res.data.adminData;
        setProfile(data);
        setFormData({ newUsername: data.username || "", newEmail: data.email || "" });
      } catch (err) {
        const _e = err as any;
        console.error("Admin profile error:", err);
        if (_e.response?.status === 404 || _e.response?.status === 401 || _e.response?.status === 403) {
          logout();
        } else {
          toast.error("Failed to load admin profile.");
        }
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [navigate]);

  // ── Fetch company settings ───────────────────────────────────────────────
  useEffect(() => {
    api.get("/admin/company-settings")
      .then((res) => {
        const s = res.data.settings;
        setCompany({
          COMPANY_NAME: s.COMPANY_NAME ?? "",
          COMPANY_TAGLINE: s.COMPANY_TAGLINE ?? "",
          COMPANY_LOGO: s.COMPANY_LOGO ?? "",
          COMPANY_FAVICON: s.COMPANY_FAVICON ?? "",
          SHOW_COMPANY_NAME:
            s.SHOW_COMPANY_NAME === "true" ||
            s.SHOW_COMPANY_NAME === "1" ||
            s.SHOW_COMPANY_NAME === undefined ||
            s.SHOW_COMPANY_NAME === null,
          SHOW_COMPANY_TAGLINE:
            s.SHOW_COMPANY_TAGLINE === "true" ||
            s.SHOW_COMPANY_TAGLINE === "1" ||
            s.SHOW_COMPANY_TAGLINE === undefined ||
            s.SHOW_COMPANY_TAGLINE === null,
          INVOICE_FORMAT: s.INVOICE_FORMAT === "THERMAL" ? "THERMAL" : "A4",
          MSG91_EMAIL_FROM_NAME: s.MSG91_EMAIL_FROM_NAME ?? "",
        });
        if (s.COMPANY_LOGO) setLogoPreview(s.COMPANY_LOGO);
        if (s.COMPANY_FAVICON) setFaviconPreview(s.COMPANY_FAVICON);
        setSeo({
          SEO_TITLE_TEMPLATE: s.SEO_TITLE_TEMPLATE ?? "",
          SEO_DEFAULT_DESCRIPTION: s.SEO_DEFAULT_DESCRIPTION ?? "",
          SEO_DEFAULT_OG_IMAGE: s.SEO_DEFAULT_OG_IMAGE ?? "",
          SEO_KEYWORDS: s.SEO_KEYWORDS ?? "",
          SEO_GOOGLE_SITE_VERIFICATION: s.SEO_GOOGLE_SITE_VERIFICATION ?? "",
          SEO_GA_MEASUREMENT_ID: s.SEO_GA_MEASUREMENT_ID ?? "",
          META_PIXEL_ID: s.META_PIXEL_ID ?? "",
          SEO_ROBOTS_EXTRA: s.SEO_ROBOTS_EXTRA ?? "",
          SEO_ORG_TYPE: s.SEO_ORG_TYPE ?? "",
          SEO_ORG_ADDRESS: s.SEO_ORG_ADDRESS ?? "",
          SEO_ORG_PHONE: s.SEO_ORG_PHONE ?? "",
          SEO_ORG_EMAIL: s.SEO_ORG_EMAIL ?? "",
          SEO_SOCIAL_LINKS: s.SEO_SOCIAL_LINKS ?? "",
          SEO_HOME_TITLE: s.SEO_HOME_TITLE ?? "",
          SEO_HOME_DESCRIPTION: s.SEO_HOME_DESCRIPTION ?? "",
          SEO_PRODUCTS_TITLE: s.SEO_PRODUCTS_TITLE ?? "",
          SEO_PRODUCTS_DESCRIPTION: s.SEO_PRODUCTS_DESCRIPTION ?? "",
          PAGE_CONTACT_INTRO: s.PAGE_CONTACT_INTRO ?? "",
        });
        if (s.SEO_DEFAULT_OG_IMAGE) setOgImagePreview(s.SEO_DEFAULT_OG_IMAGE);

        setPaymentQr({
          PAYMENT_QR_CODE: s.PAYMENT_QR_CODE ?? "",
          PAYMENT_QR_ENABLED:
            s.PAYMENT_QR_ENABLED === "true" ||
            s.PAYMENT_QR_ENABLED === "1" ||
            s.PAYMENT_QR_ENABLED === true,
          PAYMENT_QR_UPI_ID: s.PAYMENT_QR_UPI_ID ?? "",
          PAYMENT_QR_ACCOUNT_NAME: s.PAYMENT_QR_ACCOUNT_NAME ?? "",
          PAYMENT_QR_INSTRUCTIONS: s.PAYMENT_QR_INSTRUCTIONS ?? "",
        });
        if (s.PAYMENT_QR_CODE) setQrPreview(s.PAYMENT_QR_CODE);
      })
      .catch(() => { })
      .finally(() => setCompanyLoading(false));
  }, []);

  // ── OTP Timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  useEffect(() => {
    if (otpRequested && otpTimer === 0) {
      toast("Security code expired. Please try again.", { icon: "⏰", id: "otp-expired" });
      setOtpRequested(false);
      setOtp("");
      setShowSecurityTips(false);
    }
  }, [otpTimer, otpRequested]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name.toLowerCase().includes("email") ? value.toLowerCase() : value }));
  };

  // ── Company save ──────────────────────────────────────────────────────────
  const handleCompanySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.COMPANY_NAME.trim()) { toast.error("Company name is required."); return; }
    try {
      setCompanySaving(true);
      const fd = new FormData();
      fd.append("companyName", company.COMPANY_NAME.trim());
      fd.append("companyTagline", company.COMPANY_TAGLINE.trim());
      fd.append("showCompanyName", String(company.SHOW_COMPANY_NAME));
      fd.append("showCompanyTagline", String(company.SHOW_COMPANY_TAGLINE));
      fd.append("invoiceFormat", company.INVOICE_FORMAT);
      fd.append("emailSenderName", company.MSG91_EMAIL_FROM_NAME.trim());
      if (logoFile) { fd.append("logo", logoFile); }
      else if (company.COMPANY_LOGO) { fd.append("logoUrl", company.COMPANY_LOGO); }
      if (faviconFile) { fd.append("favicon", faviconFile); }
      else if (company.COMPANY_FAVICON) { fd.append("faviconUrl", company.COMPANY_FAVICON); }
      const res = await api.put("/admin/company-settings", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const s = res.data.settings;
      setCompany({
        COMPANY_NAME: s.COMPANY_NAME ?? "",
        COMPANY_TAGLINE: s.COMPANY_TAGLINE ?? "",
        COMPANY_LOGO: s.COMPANY_LOGO ?? "",
        COMPANY_FAVICON: s.COMPANY_FAVICON ?? "",
        SHOW_COMPANY_NAME:
          s.SHOW_COMPANY_NAME === "true" ||
          s.SHOW_COMPANY_NAME === "1" ||
          s.SHOW_COMPANY_NAME === undefined ||
          s.SHOW_COMPANY_NAME === null,
        SHOW_COMPANY_TAGLINE:
          s.SHOW_COMPANY_TAGLINE === "true" ||
          s.SHOW_COMPANY_TAGLINE === "1" ||
          s.SHOW_COMPANY_TAGLINE === undefined ||
          s.SHOW_COMPANY_TAGLINE === null,
        INVOICE_FORMAT: s.INVOICE_FORMAT === "THERMAL" ? "THERMAL" : "A4",
        MSG91_EMAIL_FROM_NAME: s.MSG91_EMAIL_FROM_NAME ?? "",
      });
      if (s.COMPANY_LOGO) setLogoPreview(s.COMPANY_LOGO);
      if (s.COMPANY_FAVICON) setFaviconPreview(s.COMPANY_FAVICON);
      refreshBranding();
      setLogoFile(null);
      setFaviconFile(null);
      toast.success("Company branding saved!");
      refreshBranding();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to save company settings.");
    } finally {
      setCompanySaving(false);
    }
  };

  // ── SEO save ─────────────────────────────────────────────────────────────
  // Separate save from branding above — sends only the SEO_* fields, so this never
  // touches logo/favicon/name (the backend only updates keys present in the body).
  const handleSeoSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSeoSaving(true);
      const fd = new FormData();
      fd.append("seoTitleTemplate", seo.SEO_TITLE_TEMPLATE.trim());
      fd.append("seoDefaultDescription", seo.SEO_DEFAULT_DESCRIPTION.trim());
      fd.append("seoKeywords", seo.SEO_KEYWORDS.trim());
      fd.append("seoGoogleSiteVerification", seo.SEO_GOOGLE_SITE_VERIFICATION.trim());
      fd.append("seoGaMeasurementId", seo.SEO_GA_MEASUREMENT_ID.trim());
      fd.append("metaPixelId", seo.META_PIXEL_ID.trim());
      fd.append("seoRobotsExtra", seo.SEO_ROBOTS_EXTRA);
      fd.append("seoOrgType", seo.SEO_ORG_TYPE.trim());
      fd.append("seoOrgAddress", seo.SEO_ORG_ADDRESS.trim());
      fd.append("seoOrgPhone", seo.SEO_ORG_PHONE.trim());
      fd.append("seoOrgEmail", seo.SEO_ORG_EMAIL.trim());
      fd.append("seoSocialLinks", seo.SEO_SOCIAL_LINKS);
      fd.append("seoHomeTitle", seo.SEO_HOME_TITLE.trim());
      fd.append("seoHomeDescription", seo.SEO_HOME_DESCRIPTION.trim());
      fd.append("seoProductsTitle", seo.SEO_PRODUCTS_TITLE.trim());
      fd.append("seoProductsDescription", seo.SEO_PRODUCTS_DESCRIPTION.trim());
      fd.append("pageContactIntro", seo.PAGE_CONTACT_INTRO.trim());
      if (ogImageFile) fd.append("ogImage", ogImageFile);
      else if (seo.SEO_DEFAULT_OG_IMAGE) fd.append("ogImageUrl", seo.SEO_DEFAULT_OG_IMAGE);

      const res = await api.put("/admin/company-settings", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const s = res.data.settings;
      if (s.SEO_DEFAULT_OG_IMAGE) {
        setSeo((p) => ({ ...p, SEO_DEFAULT_OG_IMAGE: s.SEO_DEFAULT_OG_IMAGE }));
        setOgImagePreview(s.SEO_DEFAULT_OG_IMAGE);
      }
      setOgImageFile(null);
      refreshSeo();
      toast.success("SEO settings saved!");
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? "Failed to save SEO settings.");
    } finally {
      setSeoSaving(false);
    }
  };

  const MAX_IMAGE_SIZE = 1 * 1024 * 1024; // 1 MB

  const handleOgImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (file.size >= MAX_IMAGE_SIZE) {
      toast.error("Please add image below 1 MB");
      e.target.value = "";
      return;
    }
    setOgImageFile(file);
    setOgImagePreview(URL.createObjectURL(file));
  };
  const removeOgImage = () => {
    setOgImageFile(null);
    setOgImagePreview(null);
    setSeo((p) => ({ ...p, SEO_DEFAULT_OG_IMAGE: "" }));
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (file.size >= MAX_IMAGE_SIZE) {
      toast.error("Please add image below 1 MB");
      e.target.value = "";
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };
  const removeLogo = () => { setLogoFile(null); setLogoPreview(null); setCompany((prev) => ({ ...prev, COMPANY_LOGO: "" })); };

  const handleFaviconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }
    if (file.size >= MAX_IMAGE_SIZE) {
      toast.error("Please add image below 1 MB");
      e.target.value = "";
      return;
    }
    setFaviconFile(file);
    setFaviconPreview(URL.createObjectURL(file));
  };
  const removeFavicon = () => {
    setFaviconFile(null);
    setFaviconPreview(null);
    setCompany((p) => ({ ...p, COMPANY_FAVICON: "" }));
  };

  // ── Payment QR handlers ─────────────────────────────────────────────────
  const handleQrFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WebP)");
      return;
    }
    if (file.size >= MAX_IMAGE_SIZE) {
      toast.error("Please add image below 1 MB");
      e.target.value = "";
      return;
    }
    setQrFile(file);
    setQrPreview(URL.createObjectURL(file));
    setPaymentQr((p) => ({ ...p, PAYMENT_QR_ENABLED: true }));
  };

  const removeQr = () => {
    setQrFile(null);
    setQrPreview(null);
    setPaymentQr((p) => ({ ...p, PAYMENT_QR_CODE: "" }));
  };

  const handleSavePaymentQr = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setQrSaving(true);
      const fd = new FormData();
      fd.append("paymentQrEnabled", String(paymentQr.PAYMENT_QR_ENABLED));
      fd.append("paymentQrUpiId", paymentQr.PAYMENT_QR_UPI_ID.trim());
      fd.append("paymentQrAccountName", paymentQr.PAYMENT_QR_ACCOUNT_NAME.trim());
      fd.append("paymentQrInstructions", paymentQr.PAYMENT_QR_INSTRUCTIONS.trim());
      if (qrFile) {
        fd.append("qrCode", qrFile);
      } else if (paymentQr.PAYMENT_QR_CODE) {
        fd.append("paymentQrCodeUrl", paymentQr.PAYMENT_QR_CODE);
      } else {
        fd.append("paymentQrCodeUrl", "");
      }
      const res = await api.put("/admin/company-settings", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updated = res.data.settings;
      if (updated?.PAYMENT_QR_CODE) {
        setPaymentQr((p) => ({ ...p, PAYMENT_QR_CODE: updated.PAYMENT_QR_CODE }));
        setQrPreview(updated.PAYMENT_QR_CODE);
      } else if (!qrFile && !paymentQr.PAYMENT_QR_CODE) {
        setQrPreview(null);
      }
      setQrFile(null);
      toast.success("Payment QR settings updated successfully!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update QR settings");
    } finally {
      setQrSaving(false);
    }
  };



  // ── Request profile update OTP ────────────────────────────────────────────
  const handleRequestUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const newUsername = formData.newUsername.trim();
    const newEmail = formData.newEmail.trim();
    if (!newUsername || !newEmail) { toast("Please fill in both username and email."); return; }
    if (!emailRegex.test(newEmail)) { toast("Please enter a valid email address."); return; }
    if (profile && newUsername === profile.username && newEmail === profile.email) {
      toast("No changes detected in profile.", { icon: "❗", id: "no changes" });
      return;
    }
    try {
      setRequestingOtp(true);
      const res = await api.post("/admin/adminProfile/request-update", { newUsername, newEmail });
      toast.success(res.data?.message || "Security code sent to your email.");
      setOtpRequested(true);
      setOtpTimer(300);
      setShowSecurityTips(true);
    } catch (err) {
      const _e = err as any;
      toast.error(_e.response?.data?.message || "Failed to send security code.");
    } finally {
      setRequestingOtp(false);
    }
  };

  // ── Verify OTP ────────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpTimer === 0) { toast("Security code expired. Please request again.", { icon: "⛔", id: "otp-expired-verify" }); return; }
    if (!otp.trim()) { toast("Please enter the security code."); return; }
    if (!/^\d{6}$/.test(otp)) { toast("Please enter a valid 6-digit code."); return; }
    try {
      setVerifyingOtp(true);
      const res = await api.post("/admin/adminProfile/verify-update", { otp: otp.trim() });
      toast.success("Profile updated successfully!");
      if (res.data?.user) {
        setProfile(res.data.user);
        setFormData({ newUsername: res.data.user.username, newEmail: res.data.user.email });
      }
      checkAuthStatus();
      setOtp(""); setOtpRequested(false); setShowSecurityTips(false);
    } catch (err) {
      const _e = err as any;
      toast.error(_e.response?.data?.message || "Invalid or expired security code.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadingProfile) {
    return <Loader />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f4f9]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Failed to load admin profile.</h2>
        </div>
      </div>
    );
  }

  // ── Shared input class ─────────────────────────────────────────────────────
  const inputCls = "w-full px-4 py-2.5 pl-10 rounded-xl border border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all text-sm outline-none";

  return (
    <div className="min-h-screen bg-[#f3f4f9] py-8 px-8 font-sans antialiased">
      <div className="w-full space-y-6">

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-indigo-600 uppercase mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
              Admin Panel
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Profile Settings</h1>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">Manage your administrator account &amp; company branding</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-xl text-xs font-bold text-green-700">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Active Session
          </div>
        </div>

        {/* ── Main 2-column grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

          {/* ── Left: Identity Card ── */}
          <div className="xl:col-span-4 space-y-5">

            {/* Profile card — clean flat design */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
              {/* Initial circle */}
              <div className="flex flex-col items-center text-center">
                <div className="w-15 h-15 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-lg mb-4">
                  <span className="text-2xl font-black text-white select-none">
                    {(profile.username ?? "A").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <h2 className="text-lg font-black text-slate-900">{profile.username}</h2>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100 uppercase tracking-wide">
                    <Shield className="w-3 h-3" />{profile.role}
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="break-all">{profile.email}</span>
                </p>
                <div className="flex items-center gap-1.5 mt-3 px-3 py-1 bg-green-50 border border-green-200 rounded-lg text-[11px] font-bold text-green-700">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Active Session
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100 my-5" />

              {/* Credential tiles */}
              <div className="space-y-2.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Credentials</p>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-xs shrink-0">
                    <User className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Username</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{profile.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-xs shrink-0">
                    <Mail className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Email</p>
                    <p className="text-sm font-bold text-slate-900 break-all">{profile.email}</p>
                  </div>
                </div>
                {profile.role === "SUPER_ADMIN" && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="p-1.5 bg-white rounded-lg border border-slate-200 shadow-xs shrink-0">
                      <Smartphone className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Phone Number</p>
                      <p className="text-sm font-bold text-slate-900 break-all">{profile.phone || "Not Provided"}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* ── Right: Edit + Branding ── */}
          <div className="xl:col-span-8 space-y-6">

            {/* Edit Profile Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="p-2 bg-slate-900 rounded-xl">
                  <Pencil className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 text-sm tracking-tight">Edit Profile Information</h2>
                  <p className="text-[11px] text-slate-400 font-medium">Update your administrative credentials securely</p>
                </div>
              </div>

              <div className="p-6">
                {!otpRequested ? (
                  <form onSubmit={handleRequestUpdate} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">New Username</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input name="newUsername" type="text" value={formData.newUsername} onChange={handleChange} className={inputCls} placeholder="Enter new username" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">New Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input name="newEmail" type="email" value={formData.newEmail} onChange={handleChange} className={inputCls} placeholder="Enter new email" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 font-medium flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 shrink-0" />
                      A 6-digit security code will be sent to your new email address for verification.
                    </div>
                    <button type="submit" disabled={requestingOtp} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                      {requestingOtp ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sending…</> : <><Key className="w-3.5 h-3.5" /> Request Security Code</>}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                      <Key className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                      <div className="text-sm text-slate-700 space-y-1.5">
                        <p className="font-bold text-slate-800">Security Tips</p>
                        <p className="flex items-center gap-1.5 text-xs"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Check spam folder if code isn't received</p>
                        <p className="flex items-center gap-1.5 text-xs"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Code expires in 5 minutes</p>
                        <p className="flex items-center gap-1.5 text-xs"><CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" /> Keep your new credentials secure</p>
                      </div>
                    </div>

                    <form onSubmit={handleVerifyOtp} className="space-y-5">
                      <div className="text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 border border-blue-100 mb-4">
                          <Smartphone className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-1">Enter Security Code</h3>
                        <p className="text-xs text-slate-400">We've sent a 6-digit code to your new email address</p>

                        <div className="relative max-w-xs mx-auto mt-5">
                          <input
                            type="text" maxLength={6} value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            className="w-full text-center text-3xl font-black tracking-[0.5em] px-4 py-4 rounded-2xl border-2 border-slate-200 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none transition-all"
                            placeholder="000000"
                          />
                          {otpTimer > 0 && (
                            <p className="mt-3 text-xs text-slate-500">
                              Expires in <span className="font-bold text-red-600">{formatTime(otpTimer)}</span>
                            </p>
                          )}
                        </div>

                        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xs mx-auto">
                          <button type="submit" disabled={verifyingOtp || otpTimer === 0} className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 shadow-sm">
                            {verifyingOtp ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying…</> : <><CheckCircle className="w-3.5 h-3.5" /> Verify & Update</>}
                          </button>
                          <button type="button" onClick={() => { setOtpRequested(false); setOtp(""); setOtpTimer(0); setShowSecurityTips(false); }} className="text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors py-2 px-4 rounded-xl hover:bg-slate-100">
                            ← Back
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* Company Branding Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="p-2 bg-slate-900 rounded-xl">
                  <Building2 className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 text-sm tracking-tight">Company Branding</h2>
                  <p className="text-[11px] text-slate-400 font-medium">Appears on invoices &amp; receipts sent to customers</p>
                </div>
              </div>

              <div className="p-6">
                {companyLoading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <p className="text-sm uppercase font-bold tracking-widest text-slate-400 font-mono select-none">
                      Loading company settings...
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleCompanySave} className="space-y-6">
                    {/* Logo + Favicon row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Logo */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Company Logo</label>
                        <div className="flex items-start gap-3">
                          <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 shrink-0 relative group">
                            {logoPreview ? (
                              <>
                                <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain p-2" />
                                <button type="button" onClick={removeLogo} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                                  <Trash2 className="w-4 h-4 text-white" />
                                </button>
                              </>
                            ) : (
                              <Image className="w-6 h-6 text-slate-300" />
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors text-xs font-medium text-slate-600">
                              <Upload className="w-3.5 h-3.5" />
                              {logoFile ? logoFile.name : "Upload logo"}
                              <input type="file" accept="image/*" className="hidden" onChange={handleLogoFileChange} />
                            </label>
                            <div className="relative">
                              <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <input type="url" value={logoFile ? "" : company.COMPANY_LOGO} onChange={(e) => { setCompany((p) => ({ ...p, COMPANY_LOGO: e.target.value })); setLogoPreview(e.target.value || null); setLogoFile(null); }} disabled={!!logoFile} placeholder="Or paste URL…" className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 disabled:opacity-40 disabled:cursor-not-allowed" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Favicon */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Favicon <span className="font-normal normal-case">(tab icon)</span></label>
                        <div className="flex items-start gap-3">
                          <div className="w-14 h-14 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 shrink-0 relative group">
                            {faviconPreview ? (
                              <>
                                <img src={faviconPreview} alt="Favicon preview" className="w-full h-full object-contain p-1" />
                                <button type="button" onClick={removeFavicon} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                                  <Trash2 className="w-3.5 h-3.5 text-white" />
                                </button>
                              </>
                            ) : (
                              <Image className="w-5 h-5 text-slate-300" />
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors text-xs font-medium text-slate-600">
                              <Upload className="w-3.5 h-3.5" />
                              {faviconFile ? faviconFile.name : "Upload favicon"}
                              <input type="file" accept="image/*" className="hidden" onChange={handleFaviconFileChange} />
                            </label>
                            <div className="relative">
                              <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <input type="url" value={faviconFile ? "" : company.COMPANY_FAVICON} onChange={(e) => { setCompany((p) => ({ ...p, COMPANY_FAVICON: e.target.value })); setFaviconPreview(e.target.value || null); setFaviconFile(null); }} disabled={!!faviconFile} placeholder="Or paste URL…" className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 disabled:opacity-40 disabled:cursor-not-allowed" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Company Name + Tagline */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Company Name <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="text" value={company.COMPANY_NAME} onChange={(e) => setCompany((p) => ({ ...p, COMPANY_NAME: e.target.value }))} placeholder="e.g. blueprint_crm" className={inputCls} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Tagline</label>
                        <div className="relative">
                          <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input type="text" value={company.COMPANY_TAGLINE} onChange={(e) => setCompany((p) => ({ ...p, COMPANY_TAGLINE: e.target.value }))} placeholder="e.g. Premium Fabric & Draping Solutions" className={inputCls} />
                        </div>
                      </div>
                    </div>

                    {/* Email Sender Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Email Sender Name</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={company.MSG91_EMAIL_FROM_NAME}
                          onChange={(e) => setCompany((p) => ({ ...p, MSG91_EMAIL_FROM_NAME: e.target.value }))}
                          placeholder="Defaults to the platform-wide sender name"
                          className={inputCls}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        The "From" name customers see on OTP, order, and status emails — e.g. your own business name instead of the shared default. Leave blank to use the default.
                      </p>
                    </div>

                    {/* Display Company Name & Tagline Toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                        <div className="space-y-0.5">
                          <label htmlFor="showCompanyNameToggle" className="text-xs font-bold text-slate-900 cursor-pointer block">
                            Display Company Name in Navbar
                          </label>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Display company name text next to logo in header.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          id="showCompanyNameToggle"
                          checked={company.SHOW_COMPANY_NAME}
                          onChange={(e) => setCompany((p) => ({ ...p, SHOW_COMPANY_NAME: e.target.checked }))}
                          className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900 cursor-pointer shrink-0"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                        <div className="space-y-0.5">
                          <label htmlFor="showCompanyTaglineToggle" className="text-xs font-bold text-slate-900 cursor-pointer block">
                            Display Tagline in Navbar
                          </label>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Display subtitle tagline under company name in header.
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          id="showCompanyTaglineToggle"
                          checked={company.SHOW_COMPANY_TAGLINE}
                          onChange={(e) => setCompany((p) => ({ ...p, SHOW_COMPANY_TAGLINE: e.target.checked }))}
                          className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-slate-900 cursor-pointer shrink-0"
                        />
                      </div>

                      <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-900">Invoice Format</p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            Default layout for new invoices — each invoice page also has its own toggle to switch formats for that download only.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(["A4", "THERMAL"] as const).map((opt) => (
                            <label
                              key={opt}
                              htmlFor={`invoiceFormat-${opt}`}
                              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition ${
                                company.INVOICE_FORMAT === opt
                                  ? "border-slate-900 bg-white shadow-sm"
                                  : "border-slate-200 bg-white/60 hover:bg-white"
                              }`}
                            >
                              <input
                                type="radio"
                                id={`invoiceFormat-${opt}`}
                                name="invoiceFormat"
                                checked={company.INVOICE_FORMAT === opt}
                                onChange={() => setCompany((p) => ({ ...p, INVOICE_FORMAT: opt }))}
                                className="w-4 h-4 text-slate-900 border-slate-300 focus:ring-slate-900 cursor-pointer shrink-0"
                              />
                              <span className="text-xs font-semibold text-slate-800">
                                {opt === "A4" ? "A4 (Full Page)" : "Thermal Receipt (80mm)"}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Live invoice preview */}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Invoice Header Preview</p>
                      <div className="bg-slate-900 text-white rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          {logoPreview && (
                            <img src={logoPreview} alt="logo" className="w-12 h-12 object-contain rounded-lg bg-white/10 p-1 shrink-0" />
                          )}
                          <div>
                            <p className="text-lg font-extrabold tracking-tight">{company.COMPANY_NAME || "Your Company Name"}</p>
                            <p className="text-slate-400 text-xs mt-0.5">{company.COMPANY_TAGLINE || "Your tagline goes here"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Invoice</p>
                          <p className="text-base font-bold text-white mt-0.5">INV-XXXXXXXXXX</p>
                        </div>
                      </div>
                    </div>

                    <button type="submit" disabled={companySaving} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                      {companySaving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><Building2 className="w-3.5 h-3.5" /> Save Company Branding</>}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Pay with QR Setup Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-600 rounded-xl">
                    <QrCode className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-black text-slate-900 text-sm tracking-tight">Pay with QR Setup</h2>
                    <p className="text-[11px] text-slate-400 font-medium">Add payment QR code (UPI, GPay, PhonePe, Paytm) for customer checkout</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${paymentQr.PAYMENT_QR_ENABLED ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${paymentQr.PAYMENT_QR_ENABLED ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                    {paymentQr.PAYMENT_QR_ENABLED ? "Enabled at Checkout" : "Disabled"}
                  </span>
                </div>
              </div>

              <div className="p-6">
                {companyLoading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <p className="text-sm uppercase font-bold tracking-widest text-slate-400 font-mono select-none">
                      Loading QR settings...
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSavePaymentQr} className="space-y-6">
                    {/* Enable toggle banner */}
                    <div
                      onClick={() => setPaymentQr((p) => ({ ...p, PAYMENT_QR_ENABLED: !p.PAYMENT_QR_ENABLED }))}
                      className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                        paymentQr.PAYMENT_QR_ENABLED
                          ? "bg-purple-50/70 border-purple-200"
                          : "bg-slate-50 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="space-y-0.5 select-none pr-4">
                        <span className="text-xs font-bold text-slate-900 block">
                          Enable "Pay with QR" on Checkout Page
                        </span>
                        <p className="text-[11px] text-slate-500 font-medium">
                          When active, customers will see the "Pay with QR" option alongside Pay Online and Cash on Delivery.
                        </p>
                      </div>
                      {/* Toggle Switch */}
                      <div
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          paymentQr.PAYMENT_QR_ENABLED ? "bg-purple-600" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            paymentQr.PAYMENT_QR_ENABLED ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </div>
                    </div>

                    {/* How Pay with QR Works Info Box */}
                    <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-3">
                      <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                        <Info className="w-4 h-4 text-purple-600 shrink-0" />
                        <span>How Payment QR Works & How Amount is Charged</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                        <div className="p-3 rounded-xl bg-white border border-purple-100/90 shadow-2xs space-y-1">
                          <p className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                            If Custom QR Image is uploaded:
                          </p>
                          <p className="text-slate-500 leading-relaxed">
                            Shows only your static QR image at checkout. The customer scans it and must manually enter the order amount in their UPI app.
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-white border border-purple-100/90 shadow-2xs space-y-1">
                          <p className="font-bold text-slate-800 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
                            If UPI ID is provided (Recommended):
                          </p>
                          <p className="text-slate-500 leading-relaxed">
                            The system automatically generates a dynamic QR code pre-filled with the customer's exact payable amount. The customer scans and pays the exact order amount without typing it.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 text-[11px] text-amber-800 bg-amber-50 border border-amber-200/70 p-3 rounded-xl">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block">Testing Recommendation:</span>
                          <span className="text-amber-700 leading-relaxed">
                            Always place a test order with a small amount on checkout (e.g. ₹1) and scan the QR with your UPI app to verify that payments successfully credit your bank account with the correct amount.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* QR Code image uploader */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">
                        Custom QR Code Image <span className="text-slate-400 font-normal">(optional fallback)</span>
                      </label>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <div className="w-36 h-36 rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/30 flex items-center justify-center overflow-hidden shrink-0 relative group shadow-xs">
                          {qrPreview ? (
                            <>
                              <img src={qrPreview} alt="QR Code Preview" className="w-full h-full object-contain p-2" />
                              <button
                                type="button"
                                onClick={removeQr}
                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl"
                                title="Remove QR code"
                              >
                                <Trash2 className="w-5 h-5 text-white" />
                              </button>
                            </>
                          ) : (
                            <div className="text-center p-3">
                              <QrCode className="w-10 h-10 text-purple-300 mx-auto mb-1" />
                              <p className="text-[10px] text-slate-400 font-semibold">No QR uploaded</p>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-3 w-full">
                          <label className="flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors text-xs font-bold text-slate-700 shadow-xs">
                            <Upload className="w-4 h-4 text-purple-600" />
                            {qrFile ? qrFile.name : "Upload QR Code Image"}
                            <input type="file" accept="image/*" className="hidden" onChange={handleQrFileChange} />
                          </label>

                          <div className="relative">
                            <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                              type="url"
                              value={qrFile ? "" : paymentQr.PAYMENT_QR_CODE}
                              onChange={(e) => {
                                setPaymentQr((p) => ({ ...p, PAYMENT_QR_CODE: e.target.value }));
                                setQrPreview(e.target.value || null);
                                setQrFile(null);
                              }}
                              disabled={!!qrFile}
                              placeholder="Or paste QR Image URL…"
                              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-600/10 focus:border-purple-600 disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Upload a high-quality UPI QR code image (PhonePe, Google Pay, Paytm, or BHIM).
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* UPI ID + Account Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                          UPI ID / VPA <span className="text-purple-600 font-semibold">(Enables Auto-Amount)</span>
                        </label>
                        <div className="relative">
                          <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={paymentQr.PAYMENT_QR_UPI_ID}
                            onChange={(e) => setPaymentQr((p) => ({ ...p, PAYMENT_QR_UPI_ID: e.target.value }))}
                            placeholder="e.g. yourstore@upi or 9876543210@paytm"
                            className={inputCls}
                          />
                        </div>
                        <p className="text-[10px] text-purple-600 font-medium">When provided, the checkout QR dynamically locks in the customer's exact order amount.</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                          Payee / Account Name <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="text"
                            value={paymentQr.PAYMENT_QR_ACCOUNT_NAME}
                            onChange={(e) => setPaymentQr((p) => ({ ...p, PAYMENT_QR_ACCOUNT_NAME: e.target.value }))}
                            placeholder="e.g. Storra Store / Merchant Name"
                            className={inputCls}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400">Customer verifies this name in their UPI app before paying.</p>
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        Checkout Instructions <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={paymentQr.PAYMENT_QR_INSTRUCTIONS}
                        onChange={(e) => setPaymentQr((p) => ({ ...p, PAYMENT_QR_INSTRUCTIONS: e.target.value }))}
                        placeholder="e.g. Scan with any UPI app and upload the payment screenshot or enter Transaction ID"
                        className={inputCls}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={qrSaving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {qrSaving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><QrCode className="w-3.5 h-3.5" /> Save Pay with QR Settings</>}
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* SEO & Discoverability Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                <div className="p-2 bg-slate-900 rounded-xl">
                  <Search className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <h2 className="font-black text-slate-900 text-sm tracking-tight">SEO &amp; Discoverability</h2>
                  <p className="text-[11px] text-slate-400 font-medium">Controls how this store appears in Google search results and when links are shared on WhatsApp/social</p>
                </div>
              </div>

              <div className="p-6">
                {companyLoading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <p className="text-sm uppercase font-bold tracking-widest text-slate-400 font-mono select-none">
                      Loading SEO settings...
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSeoSave} className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Title Template</label>
                      <input
                        type="text"
                        value={seo.SEO_TITLE_TEMPLATE}
                        onChange={(e) => setSeo((p) => ({ ...p, SEO_TITLE_TEMPLATE: e.target.value }))}
                        placeholder={`%s | ${company.COMPANY_NAME || "Your Store"}`}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all text-sm outline-none"
                      />
                      <p className="text-[11px] text-slate-400">Use <code className="bg-slate-100 px-1 rounded">%s</code> as a placeholder for each page's own title. Leave blank to just append the store name.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Default Meta Description</label>
                      <textarea
                        value={seo.SEO_DEFAULT_DESCRIPTION}
                        onChange={(e) => setSeo((p) => ({ ...p, SEO_DEFAULT_DESCRIPTION: e.target.value.slice(0, 160) }))}
                        rows={2}
                        maxLength={160}
                        placeholder="Shop the latest collection — quality products, fast delivery."
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all text-sm outline-none resize-none"
                      />
                      <p className="text-[11px] text-slate-400 text-right">{seo.SEO_DEFAULT_DESCRIPTION.length}/160</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Default Social Share Image</label>
                      <p className="text-[11px] text-slate-400 -mt-1 mb-2">Shown when a product/page link is shared on WhatsApp, Facebook, etc. Recommended 1200×630px.</p>
                      <div className="flex items-start gap-3">
                        <div className="w-32 h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50 shrink-0 relative group">
                          {ogImagePreview ? (
                            <>
                              <img src={ogImagePreview} alt="OG image preview" className="w-full h-full object-cover" />
                              <button type="button" onClick={removeOgImage} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                                <Trash2 className="w-4 h-4 text-white" />
                              </button>
                            </>
                          ) : (
                            <Image className="w-6 h-6 text-slate-300" />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5" /> Upload Image
                            <input type="file" accept="image/*" className="hidden" onChange={handleOgImageFileChange} />
                          </label>
                          <input
                            type="url"
                            value={ogImageFile ? "" : seo.SEO_DEFAULT_OG_IMAGE}
                            onChange={(e) => { setSeo((p) => ({ ...p, SEO_DEFAULT_OG_IMAGE: e.target.value })); setOgImagePreview(e.target.value || null); setOgImageFile(null); }}
                            disabled={!!ogImageFile}
                            placeholder="Or paste URL…"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 disabled:opacity-40 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Keywords <span className="font-normal normal-case text-slate-400">(optional, comma-separated)</span></label>
                      <input
                        type="text"
                        value={seo.SEO_KEYWORDS}
                        onChange={(e) => setSeo((p) => ({ ...p, SEO_KEYWORDS: e.target.value }))}
                        placeholder="handloom sarees, ethnic wear, cotton fabric"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all text-sm outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setSeoAdvancedOpen((v) => !v)}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${seoAdvancedOpen ? "rotate-180" : ""}`} />
                      Advanced settings
                    </button>

                    {seoAdvancedOpen && (
                      <div className="space-y-6 pt-2 border-t border-slate-100">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Google Search Console</label>
                            <input type="text" value={seo.SEO_GOOGLE_SITE_VERIFICATION} onChange={(e) => setSeo((p) => ({ ...p, SEO_GOOGLE_SITE_VERIFICATION: e.target.value }))} placeholder="Verification code" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all text-sm outline-none" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Google Analytics (GA4)</label>
                            <input type="text" value={seo.SEO_GA_MEASUREMENT_ID} onChange={(e) => setSeo((p) => ({ ...p, SEO_GA_MEASUREMENT_ID: e.target.value }))} placeholder="G-XXXXXXXXXX" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all text-sm outline-none" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Meta / Facebook Pixel ID</label>
                            <input type="text" value={seo.META_PIXEL_ID} onChange={(e) => setSeo((p) => ({ ...p, META_PIXEL_ID: e.target.value }))} placeholder="e.g. 1234567890123456" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all text-sm outline-none" />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Business info (for search engine rich results)</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Business Type</label>
                            <input type="text" value={seo.SEO_ORG_TYPE} onChange={(e) => setSeo((p) => ({ ...p, SEO_ORG_TYPE: e.target.value }))} placeholder="e.g. ClothingStore, Organization" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all text-sm outline-none" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Business Phone</label>
                            <input type="text" value={seo.SEO_ORG_PHONE} onChange={(e) => setSeo((p) => ({ ...p, SEO_ORG_PHONE: e.target.value }))} placeholder="+91 98765 43210" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all text-sm outline-none" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Business Email</label>
                            <input type="email" value={seo.SEO_ORG_EMAIL} onChange={(e) => setSeo((p) => ({ ...p, SEO_ORG_EMAIL: e.target.value }))} placeholder="hello@yourstore.com" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all text-sm outline-none" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Business Address</label>
                            <input type="text" value={seo.SEO_ORG_ADDRESS} onChange={(e) => setSeo((p) => ({ ...p, SEO_ORG_ADDRESS: e.target.value }))} placeholder="Street, City, State, PIN" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all text-sm outline-none" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Contact Page Intro <span className="font-normal normal-case text-slate-400">(optional)</span></label>
                          <input type="text" value={seo.PAGE_CONTACT_INTRO} onChange={(e) => setSeo((p) => ({ ...p, PAGE_CONTACT_INTRO: e.target.value }))} placeholder="We'd love to hear from you." className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all text-sm outline-none" />
                          <p className="text-[11px] text-slate-400">Shown at the top of the Contact Us page, above the address/phone/email above.</p>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Social Profile Links <span className="font-normal normal-case text-slate-400">(one per line)</span></label>
                          <textarea value={seo.SEO_SOCIAL_LINKS} onChange={(e) => setSeo((p) => ({ ...p, SEO_SOCIAL_LINKS: e.target.value }))} rows={3} placeholder={"https://instagram.com/yourstore\nhttps://facebook.com/yourstore"} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all text-sm outline-none resize-none font-mono" />
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Per-page overrides <span className="font-normal normal-case text-slate-400">(optional — falls back to the defaults above)</span></p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Homepage Title</label>
                            <input type="text" value={seo.SEO_HOME_TITLE} onChange={(e) => setSeo((p) => ({ ...p, SEO_HOME_TITLE: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all text-sm outline-none" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Homepage Description</label>
                            <input type="text" value={seo.SEO_HOME_DESCRIPTION} onChange={(e) => setSeo((p) => ({ ...p, SEO_HOME_DESCRIPTION: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all text-sm outline-none" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Products Page Title</label>
                            <input type="text" value={seo.SEO_PRODUCTS_TITLE} onChange={(e) => setSeo((p) => ({ ...p, SEO_PRODUCTS_TITLE: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all text-sm outline-none" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Products Page Description</label>
                            <input type="text" value={seo.SEO_PRODUCTS_DESCRIPTION} onChange={(e) => setSeo((p) => ({ ...p, SEO_PRODUCTS_DESCRIPTION: e.target.value }))} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all text-sm outline-none" />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Extra robots.txt rules <span className="font-normal normal-case text-slate-400">(optional, advanced)</span></label>
                          <textarea value={seo.SEO_ROBOTS_EXTRA} onChange={(e) => setSeo((p) => ({ ...p, SEO_ROBOTS_EXTRA: e.target.value }))} rows={3} placeholder={"Disallow: /some-path"} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 transition-all text-sm outline-none resize-none font-mono" />
                        </div>
                      </div>
                    )}

                    <button type="submit" disabled={seoSaving} className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
                      {seoSaving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</> : <><Search className="w-3.5 h-3.5" /> Save SEO Settings</>}
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
