import React, { useState, useEffect, useRef } from "react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { createPortal } from "react-dom";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaUserCircle } from "react-icons/fa";
import api from "../utils/api";
import { domainUrl, APP_VERSION } from "../utils/constant";
import logo123 from "../assets/logo.png";
import { useLocation } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import NotificationBell from "../components/NotificationBell";
import OrderToast from "../components/OrderToast";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  TransitionChild,
} from "@headlessui/react";

import {
  Bars3Icon,
  HomeIcon,
  CubeIcon,
  XMarkIcon,
  UsersIcon,
  TagIcon,
  ShoppingBagIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TicketIcon,
  BellIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  BuildingStorefrontIcon,
  CreditCardIcon,
  EyeIcon,
  ArrowRightOnRectangleIcon,
  ComputerDesktopIcon,
  ShoppingCartIcon,
  CalendarIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../context/AuthContext";
import { useBranding } from "../context/BrandingContext";

// ── Admin navigation ──────────────────────────────────────────────────────────
const ADMIN_NAVIGATION = [
  {
    name: "Dashboard",
    href: "/admin-dashboard",
    icon: HomeIcon,
  },
  {
    name: "Place Order",
    href: "/admin-dashboard/place-order",
    icon: ShoppingCartIcon,
  },
  {
    name: "Order Management",
    href: "/admin-dashboard/order-management",
    icon: ShoppingBagIcon,
  },
  {
    name: "Products & Stock",
    href: "/admin-dashboard/products",
    icon: CubeIcon,
  },
  {
    name: "User Management",
    icon: UsersIcon,
    subLinks: [
      { name: "Admin & Staff", href: "/admin-dashboard/manage-user" },
      { name: "Customers", href: "/admin-dashboard/manage-customers" },
    ],
  },
  {
    name: "Catalog Management",
    href: "/admin-dashboard/manage-catalog",
    icon: TagIcon,
  },
  {
    name: "Coupon Management",
    href: "/admin-dashboard/coupon-management",
    icon: TicketIcon,
  },
  {
    name: "Reports & Analytics",
    href: "/admin-dashboard/reports",
    icon: ChartBarIcon,
  },
  {
    name: "Settings",
    icon: Cog6ToothIcon,
    subLinks: [
      {
        name: "Notifications",
        href: "/admin-dashboard/notifications",
      },
      {
        name: "Warehouse Settings",
        href: "/admin-dashboard/warehouse",
      },
      {
        name: "Audit Log",
        href: "/admin-dashboard/audit-log",
      },
    ],
  },

  {
    name: "Payments",
    icon: CreditCardIcon,
    subLinks: [
      {
        name: "Payment History",
        href: "/admin-dashboard/customer-transactions",
      },
      {
        name: "Payment Logs",
        href: "/admin-dashboard/payment-logs",
      },
    ],
  },
  {
    name: "Customer Activity",
    href: "/admin-dashboard/customer-activity",
    icon: EyeIcon,
  },
  {
    name: "Homepage Manager",
    href: "/admin-dashboard/homepage",
    icon: ComputerDesktopIcon,
  },
  {
    name: "Content Pages",
    href: "/admin-dashboard/content-pages",
    icon: DocumentTextIcon,
  },
];

interface SubLink {
  name: string;
  href: string;
}

interface NavItem {
  name: string;
  href?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  subLinks?: SubLink[];
}

interface AdminInfo {
  name: string;
  role: string;
  avatar?: string;
}

const classNames = (...classes: (string | false | undefined | null)[]) =>
  classes.filter(Boolean).join(" ");

// ── Collapsed-rail nav item with a portaled hover flyout for sub-links ────────
// See the comment at its call site in NavLink for why this can't just be an
// absolutely-positioned <div> nested in the sidebar's scroll container.
const CollapsedNavItem = ({
  item,
  isActiveParent,
  activeClasses,
  inactiveClasses,
  baseClasses,
  currentPathname,
  onLinkClick,
}: {
  item: NavItem;
  isActiveParent: boolean;
  activeClasses: string;
  inactiveClasses: string;
  baseClasses: string;
  currentPathname: string;
  onLinkClick?: () => void;
}) => {
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLLIElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const openFlyout = () => {
    cancelClose();
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setFlyoutPos({ top: rect.top, left: rect.right + 8 });
    setFlyoutOpen(true);
  };

  // Small grace delay so moving the cursor from the icon to the flyout across
  // the gap between them doesn't close it mid-transit.
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setFlyoutOpen(false), 150);
  };

  useEffect(() => () => cancelClose(), []);

  return (
    <li
      ref={triggerRef}
      key={item.name}
      className="relative"
      onMouseEnter={openFlyout}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        title={item.name}
        className={classNames(
          isActiveParent ? activeClasses : inactiveClasses,
          baseClasses,
          "w-full justify-center",
        )}
      >
        <item.icon aria-hidden="true" className="size-6 shrink-0" />
      </button>

      {flyoutOpen &&
        createPortal(
          <div
            onMouseEnter={openFlyout}
            onMouseLeave={scheduleClose}
            style={{ position: "fixed", top: flyoutPos.top, left: flyoutPos.left }}
            className="z-50 w-48 rounded-md border border-slate-100 bg-white p-1 shadow-lg"
          >
            <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
              {item.name}
            </div>
            {item.subLinks!.map((sub: SubLink) => {
              const isSubActive = currentPathname === sub.href;
              return (
                <Link
                  key={sub.name}
                  to={sub.href}
                  onClick={onLinkClick}
                  className={classNames(
                    isSubActive
                      ? "bg-slate-200 text-slate-950 font-bold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    "block px-3 py-2 rounded-md text-sm/6 font-semibold transition-colors duration-200 whitespace-nowrap",
                  )}
                >
                  {sub.name}
                </Link>
              );
            })}
          </div>,
          document.body,
        )}
    </li>
  );
};

const NavLink = ({
  item,
  openMenu,
  toggleMenu,
  setOpenMenu,
  onLinkClick,
  isCollapsed = false,
}: {
  item: NavItem;
  openMenu: string;
  toggleMenu: (menuName: string) => void;
  setOpenMenu: React.Dispatch<React.SetStateAction<string>>;
  onLinkClick?: () => void;
  /** Icon-only desktop rail — only ever true outside the mobile slide-over,
   * which always renders full-width regardless of this flag. */
  isCollapsed?: boolean;
}) => {
  const location = useLocation();

  const hasSubLinks = item.subLinks && item.subLinks.length > 0;

  // MAIN LINK ACTIVE CHECK
  const isCurrent = item.href ? location.pathname.startsWith(item.href) : false;

  // SUBMENU ACTIVE CHECK
  const isActiveParent =
    hasSubLinks &&
    item.subLinks!.some((sub: SubLink) =>
      location.pathname.startsWith(sub.href),
    );

  const baseClasses =
    "group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold transition-colors duration-200 cursor-pointer";
  const activeClasses = "bg-slate-100 text-slate-900 font-bold";
  const inactiveClasses =
    "text-slate-600 hover:bg-slate-50 hover:text-slate-900";

  //  NORMAL MENU ITEM (no submenu)
  if (!hasSubLinks) {
    return (
      <li key={item.name}>
        <Link
          to={item.href ?? "#"}
          onClick={onLinkClick}
          title={isCollapsed ? item.name : undefined}
          className={classNames(
            isCurrent ? activeClasses : inactiveClasses,
            baseClasses,
            "w-full whitespace-nowrap",
            isCollapsed && "justify-center",
          )}
        >
          <item.icon aria-hidden="true" className="size-6 shrink-0" />
          {!isCollapsed && <span className="flex-1">{item.name}</span>}
        </Link>
      </li>
    );
  }

  // Collapsed rail: no room for an inline dropdown, so sub-links surface as a
  // hover flyout instead of expanding in place. Portaled to <body> and fixed-
  // positioned from the trigger's bounding rect — an absolutely-positioned
  // flyout nested inside the sidebar's overflow-y-auto scroll container gets
  // clipped at the container's right edge (setting overflow-y also forces
  // overflow-x to clip per the CSS overflow spec), so it can't stay in-tree.
  if (isCollapsed) {
    return (
      <CollapsedNavItem
        item={item}
        isActiveParent={!!isActiveParent}
        activeClasses={activeClasses}
        inactiveClasses={inactiveClasses}
        baseClasses={baseClasses}
        currentPathname={location.pathname}
        onLinkClick={onLinkClick}
      />
    );
  }

  //  MENU ITEM WITH SUBMENU
  return (
    <li key={item.name}>
      <button
        onClick={() => toggleMenu(item.name)}
        className={classNames(
          isActiveParent ? activeClasses : inactiveClasses,
          baseClasses,
          "w-full flex justify-between items-center whitespace-nowrap",
        )}
      >
        <div className="flex items-center gap-x-3 whitespace-nowrap">
          <item.icon aria-hidden="true" className="size-6 shrink-0" />
          {item.name}
        </div>
        <div className="flex items-center gap-x-1.5 shrink-0">
          <ChevronDownIcon
            className={classNames(
              "size-5 transition-transform duration-200",
              isActiveParent ? "rotate-180" : "rotate-0",
            )}
          />
        </div>
      </button>

      {/* Submenu */}
      <motion.ul
        initial={{ height: 0 }}
        animate={{
          height: openMenu === item.name || isActiveParent ? "auto" : 0,
        }}
        transition={{ duration: 0.2 }}
        className={classNames(
          "mt-1 space-y-1 overflow-hidden ml-4 rounded-md bg-slate-50/80",
          openMenu === item.name || isActiveParent
            ? "p-1 border border-slate-100"
            : "p-0 border-0",
        )}
      >
        {item.subLinks!.map((sub: SubLink) => {
          const isSubActive = location.pathname === sub.href;

          return (
            <li key={sub.name}>
              <Link
                to={sub.href}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenu(item.name); // keep parent open
                  if (onLinkClick) onLinkClick();
                }}
                className={classNames(
                  isSubActive
                    ? "bg-slate-200 text-slate-950 font-bold"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  "flex justify-between items-center px-3 py-2 rounded-md transition-colors duration-200 whitespace-nowrap",
                )}
              >
                <span>{sub.name}</span>
              </Link>
            </li>
          );
        })}
      </motion.ul>
    </li>
  );
};

// =========================
// COOKIE-BASED ADMIN PANEL
// =========================
export default function Admindashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState("");
  const [adminInfo, setAdminInfo] = useState<AdminInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => localStorage.getItem("adminSidebarCollapsed") === "true",
  );
  useBodyScrollLock(sidebarOpen || showLogoutConfirm);
  const { user, checkAuthStatus, logout } = useAuth();
  const { latestNotification } = useNotifications();
  const { branding } = useBranding();

  // ── Real-time order toast (fires whenever latestNotification changes) ────────

  const navigate = useNavigate();
  const location = useLocation();

  const visibleNavigation: NavItem[] = ADMIN_NAVIGATION;

  // Auto-close inactive submenus when changing active routes
  useEffect(() => {
    const activeParent = visibleNavigation.find(
      (item) =>
        item.subLinks &&
        item.subLinks.some((sub) => location.pathname.startsWith(sub.href)),
    );
    if (activeParent) {
      setOpenMenu(activeParent.name);
    } else {
      setOpenMenu("");
    }
  }, [location.pathname]);

  // Auto-close mobile sidebar when transitioning to desktop widths to prevent Headless UI portalled overlay scroll-locks
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem("adminSidebarCollapsed", String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const toggleMenu = (menuName: string) => {
    setOpenMenu(openMenu === menuName ? "" : menuName);
  };

  const handleLogout = () => {
    setAdminInfo(null);
    logout();
  };

  // =========================
  // FETCH ADMIN PROFILE
  // =========================
  const fetchAdminProfile = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/admin/adminProfile");
      const data = res.data.adminData;
      setAdminInfo({
        name: data.username || data.name || "Administrator",
        role: data.role || "Admin",
        avatar: data.avatar || "",
      });
    } catch (err) {
      const status = (err as any)?.response?.status;
      console.error("Auth failed:", err);
      if (status === 404 || status === 401 || status === 403) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // RUN ON MOUNT
  useEffect(() => {
    fetchAdminProfile();
  }, []);

  // Shared markup for both the mobile slide-over and the desktop rail — kept as one
  // function (not a component) so it closes over this render's state/handlers directly
  // instead of threading a dozen props through a separate component boundary.
  const sidebarInner = (onLinkClick?: () => void, collapsed = false) => (
    <>
      <div
        className={classNames(
          "relative flex h-16 shrink-0 items-center",
          collapsed ? "justify-center px-2" : "gap-2.5 px-3",
        )}
      >
        <img
          src={branding.companyLogo || logo123}
          alt={branding.companyName || "CRM Logo"}
          className={classNames(
            "object-contain shrink-0 transition-all duration-300",
            collapsed ? "h-9 w-auto max-w-[36px]" : "h-9 w-auto max-w-[125px]",
          )}
        />
        {!collapsed && (
          <div className="flex items-center min-w-0">
            <div className="h-6 w-px bg-slate-200 mx-1 shrink-0" />
            <div className="flex flex-col justify-center min-w-0 pl-1.5 text-left">
              <span className="font-extrabold text-xs tracking-tight text-slate-900 truncate leading-tight">
                {branding.companyName || "blueprint_crm"}
              </span>
              {branding.companyTagline && (
                <span className="text-[10px] text-slate-400 font-medium tracking-wide truncate leading-tight mt-0.5">
                  {branding.companyTagline}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <nav className="relative flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {visibleNavigation.map((item) => (
                <NavLink
                  key={item.name}
                  item={item}
                  openMenu={openMenu}
                  toggleMenu={toggleMenu}
                  setOpenMenu={setOpenMenu}
                  onLinkClick={onLinkClick}
                  isCollapsed={collapsed}
                />
              ))}
            </ul>
          </li>
          <a
            onClick={() => setShowLogoutConfirm(true)}
            title={collapsed ? "Logout" : undefined}
            className={classNames(
              "group -mx-2 flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 mt-auto cursor-pointer transition-colors",
              collapsed && "justify-center",
            )}
          >
            <ArrowRightOnRectangleIcon
              aria-hidden="true"
              className="size-6 shrink-0 text-slate-500 group-hover:text-red-600"
            />
            {!collapsed && "Logout"}
          </a>
          <li
            className={classNames(
              "px-2 pb-1 text-[11px] font-medium text-slate-400 select-none",
              collapsed && "text-center px-0",
            )}
            title={collapsed ? `v${APP_VERSION}` : undefined}
          >
            {collapsed ? "v" + APP_VERSION.split(".")[0] : `v${APP_VERSION}`}
          </li>
        </ul>
      </nav>
    </>
  );

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 font-sans">
        <p className="text-sm uppercase font-bold tracking-widest text-slate-400 font-mono text-center select-none">
          Loading...
        </p>
      </div>
    );
  }

  // =========================
  // RENDER (UI UNCHANGED)
  // =========================
  return (
    <>
      {/* Real-time order toast — appears top-right on new admin-notification */}
      <OrderToast notification={latestNotification} />

      <div>
        {/* Mobile Sidebar */}
        <Dialog
          open={sidebarOpen}
          onClose={setSidebarOpen}
          className="relative z-50 lg:hidden"
        >
          <DialogBackdrop
            transition
            className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
          />

          <div className="fixed inset-0 flex">
            <DialogPanel
              transition
              className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
            >
              <TransitionChild>
                <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="-m-2.5 p-2.5"
                  >
                    <span className="sr-only">Close sidebar</span>
                    <XMarkIcon
                      aria-hidden="true"
                      className="size-6 text-white"
                    />
                  </button>
                </div>
              </TransitionChild>

              <div
                className="relative flex h-full grow flex-col gap-y-5 overflow-y-auto scrollbar-thin px-6 pb-4 border-r border-slate-200 text-slate-900 bg-white"
                style={{ backgroundColor: "var(--sidebar-start)" }}
              >
                {sidebarInner(() => setSidebarOpen(false))}
              </div>
            </DialogPanel>
          </div>
        </Dialog>

        {/* Desktop Sidebar */}
        <div
          className={classNames(
            "hidden text-slate-900 border-r border-slate-200 lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:flex-col transition-[width] duration-300 ease-in-out",
            isSidebarCollapsed ? "lg:w-20" : "lg:w-72",
          )}
          style={{ backgroundColor: "var(--sidebar-start)" }}
        >
          <div
            className={classNames(
              "flex h-full grow flex-col gap-y-5 overflow-y-auto scrollbar-thin pb-4",
              isSidebarCollapsed ? "px-3 overflow-x-visible" : "px-6",
            )}
          >
            {sidebarInner(undefined, isSidebarCollapsed)}
          </div>
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute top-20 -right-3 hidden lg:flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-slate-900 hover:shadow-md transition-colors"
          >
            {isSidebarCollapsed ? (
              <ChevronRightIcon className="size-3.5" />
            ) : (
              <ChevronLeftIcon className="size-3.5" />
            )}
          </button>
        </div>

        {/* Top Navbar */}
        <div
          className={classNames(
            "transition-[padding] duration-300 ease-in-out",
            isSidebarCollapsed ? "lg:pl-20" : "lg:pl-72",
          )}
        >
          <div
            className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-100 bg-white/95 backdrop-blur-md px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8"
            style={{ background: "linear-gradient(to right, #ffffff, #f8faf8)" }}
          >
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="-m-2.5 p-2.5 text-gray-700 hover:text-gray-900 lg:hidden"
            >
              <Bars3Icon aria-hidden="true" className="size-6" />
            </button>

            <div
              aria-hidden="true"
              className="h-6 w-px bg-gray-900/10 lg:hidden"
            />

            <div className="flex flex-1 justify-end self-stretch">
              <div className="flex items-center gap-x-4 lg:gap-x-6">
                <NotificationBell dashboardPath="/admin-dashboard" />

                <div
                  aria-hidden="true"
                  className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-900/10"
                />

                <Menu as="div" className="relative">
                  <MenuButton className="relative flex items-center">
                    <span className="absolute -inset-1.5" />
                    <span className="sr-only">Open user menu</span>

                    {adminInfo?.avatar ? (
                      <img src={adminInfo.avatar} alt={adminInfo.name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <FaUserCircle size={28} className="text-gray-700" />
                    )}

                    <span className="hidden lg:flex lg:items-center">
                      <span
                        aria-hidden="true"
                        className="ml-4 text-sm/6 font-semibold text-gray-900"
                      >
                        {adminInfo?.name || "Administrator"}
                      </span>
                      <ChevronDownIcon
                        aria-hidden="true"
                        className="ml-2 size-5 text-gray-400"
                      />
                    </span>
                  </MenuButton>

                  <MenuItems
                    transition
                    className="absolute right-0 z-10 mt-2.5 w-48 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 transition"
                  >
                    <MenuItem>
                      <Link
                        to="/admin-dashboard/profile"
                        className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        View Profile
                      </Link>
                    </MenuItem>

                    <MenuItem>
                      <a
                        onClick={() => setShowLogoutConfirm(true)}
                        className="block px-3 py-2 text-sm text-red-600 hover:bg-gray-100 cursor-pointer"
                      >
                        Sign out
                      </a>
                    </MenuItem>
                  </MenuItems>
                </Menu>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <main>
            <div>
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full bg-red-100">
                <ArrowRightOnRectangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Sign Out</h3>
            </div>
            <p className="text-gray-500 text-sm mb-6 ml-1">Are you sure you want to sign out of the admin panel?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
