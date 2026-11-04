import React, { Suspense } from "react";
import lazyWithRetry from "./utils/lazyWithRetry";
import ErrorBoundary from "./components/ErrorBoundary";
import {
  Routes,
  Route,
  useLocation,
  Outlet,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { useEffect, useLayoutEffect, useRef } from "react";

/* ==================== CONTEXT HOOKS ==================== */
import { useAuth } from "./context/AuthContext";
import { useCart } from "./context/CartContext";
import { isStorefrontPreview } from "./utils/preview";
import PageSeo from "./components/seo/PageSeo";

/* ==================== GLOBAL COMPONENTS ==================== */
// Kept eager: needed immediately for every customer route, and small.
import Navbar from "./components/Navbar";
import FestiveAmbientOverlay from "./components/FestiveAmbientOverlay";
import Loader from "./components/Loader";

/* ==================== STATIC CONTENT PAGES ==================== */
// Kept eager: lightweight static editorial pages — eliminates lazy chunk Suspense spinner flash on footer clicks
import AboutPage from "./pages/static/AboutPage";
import TermsPage from "./pages/static/TermsPage";
import PrivacyPage from "./pages/static/PrivacyPage";
import HelpPage from "./pages/static/HelpPage";
import ContactPage from "./pages/static/ContactPage";

/* ==================== AUTH ==================== */
// Kept eager: tiny, and Login is the very first thing an unauthenticated visit needs.
import Login from "./login/Login";
import ProtectedRoute from "./login/ProtectedRoute";
import RequireStaffPermission from "./login/RequireStaffPermission";

/* ==================== NOTIFICATIONS ==================== */
// Kept eager: providers, not pages — needed to wrap the route tree itself.
import { NotificationProvider } from "./context/NotificationContext";
import { UserNotificationProvider } from "./context/UserNotificationContext";
import { StaffPermissionProvider } from "./context/StaffPermissionContext";

/* ==================== LAZY-LOADED ROUTE PAGES ====================
 * Every actual page is loaded on demand instead of bundled into the initial
 * download — a customer opening the storefront no longer pays for the admin,
 * super-admin, and staff dashboards' combined JS (previously all ~40 page
 * components here were eager imports, so visiting "/" downloaded the entire
 * app up front). React.lazy + the <Suspense> below split each into its own
 * chunk, fetched only when its route is actually visited. */

/* ── Dashboards ── */
const Admindashboard = lazyWithRetry(() => import("./dashboard/Admindashboard"));
const SuperAdminDashboard = lazyWithRetry(() => import("./dashboard/SuperAdminDashboard"));
const Customerdashboard = lazyWithRetry(() => import("./dashboard/Customerdashboard"));
const StaffDashboard = lazyWithRetry(() => import("./dashboard/StaffDashboard"));

/* ── Admin ── */
const UserManagementPage = lazyWithRetry(() => import("./users/UserManagementPage"));
const CustomerManagementPage = lazyWithRetry(() => import("./users/CustomerManagementPage"));

const Listcategory = lazyWithRetry(() => import("./categories/Listcategory"));
const CategoryAttributes = lazyWithRetry(() => import("./categories/CategoryAttributes"));
const LegacyCatalogRedirect = lazyWithRetry(() => import("./catalog/LegacyCatalogRedirect"));

const AdminOrderManagement = lazyWithRetry(() => import("./dashboard/AdminOrderManagement"));
const AdminProfile = lazyWithRetry(() => import("./dashboard/AdminProfile"));
const CouponManagement = lazyWithRetry(() => import("./dashboard/CouponManagement"));
const NotificationManagement = lazyWithRetry(() => import("./dashboard/NotificationManagement"));
const ReportsAnalytics = lazyWithRetry(() => import("./dashboard/ReportsAnalytics"));
const StaffManagement = lazyWithRetry(() => import("./dashboard/StaffManagement"));
const StaffProfile = lazyWithRetry(() => import("./dashboard/StaffProfile"));
const StaffDashboardHome = lazyWithRetry(() => import("./dashboard/StaffDashboardHome"));
const AuditLog = lazyWithRetry(() => import("./dashboard/AuditLog"));
const WarehouseSettings = lazyWithRetry(() => import("./dashboard/WarehouseSettings"));
const HomepageManager = lazyWithRetry(() => import("./dashboard/HomepageManager"));
const StaticPagesManager = lazyWithRetry(() => import("./dashboard/StaticPagesManager"));
const CustomerTransactions = lazyWithRetry(() => import("./dashboard/CustomerTransactions"));
const CustomerActivityTracker = lazyWithRetry(() => import("./dashboard/CustomerActivityTracker"));
const PaymentTransactionLogs = lazyWithRetry(() => import("./dashboard/PaymentTransactionLogs"));
const AdminOrderPage = lazyWithRetry(() => import("./dashboard/AdminOrderPage"));
const SuperAdminMonitoring = lazyWithRetry(() => import("./dashboard/SuperAdminMonitoring"));
const AdminProductStockManagement = lazyWithRetry(() => import("./dashboard/AdminProductStockManagement"));

/* ── Customer ── */
const ProductsPage = lazyWithRetry(() => import("./components/AllProducts"));
const AllCategoriesPage = lazyWithRetry(() => import("./pages/AllCategoriesPage"));
const CategoryProductPage = lazyWithRetry(() => import("./cart/CategoryProductPage"));
const ProductDetailPage = lazyWithRetry(() => import("./cart/ProductDetailPage"));

const CheckoutPage = lazyWithRetry(() => import("./cart/CheckoutPage"));

const MyOrdersPage = lazyWithRetry(() => import("./orders/MyOrdersPage"));
const WhishlistPage = lazyWithRetry(() => import("./pages/WishlistPage"));
const ProfilePage = lazyWithRetry(() => import("./pages/ProfilePage"));
const OrderSuccess = lazyWithRetry(() => import("./pages/OrderSuccess"));
const InvoicePage = lazyWithRetry(() => import("./pages/InvoicePage"));
const TransactionHistory = lazyWithRetry(() => import("./pages/TransactionHistory"));
const DiscountPage = lazyWithRetry(() => import("./components/DiscountPage"));
// DiscountPage is also embedded directly on the homepage (Customerdashboard.tsx) — it
// must NOT carry its own <PageSeo> there, or it would override the homepage's title on
// every render. This wrapper adds page-level SEO only for the standalone /discounts route.
const DiscountsRoutePage = () => (
  <>
    <PageSeo title="Sale & Discounts" description="Browse our current sales and discounted products." path="/discounts" />
    <DiscountPage />
  </>
);

/* ── Misc ── */
const Home = lazyWithRetry(() => import("./home/Home"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

/* Top progress indicator while a lazy route chunk is resolving — renders the Atom Loader */
const RouteFallback = () => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 backdrop-blur-xs">
    <Loader fullScreen={false} />
  </div>
);

// Auto-redirect /profile back to storefront with the Profile Drawer opened
const ProfileRedirect = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/", { replace: true });
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("open-profile-drawer"));
    }, 150);
  }, [navigate]);
  return null;
};

// Auto-redirect /cart back to storefront with the Cart Drawer opened
const CartRedirect = () => {
  const navigate = useNavigate();
  const { openCartDrawer } = useCart();
  useEffect(() => {
    navigate("/", { replace: true });
    setTimeout(() => {
      openCartDrawer();
      window.dispatchEvent(new CustomEvent("open-cart-drawer"));
    }, 150);
  }, [navigate, openCartDrawer]);
  return null;
};

/* ======================================================= */
/* ==================== CUSTOMER LAYOUT ================== */
/* ======================================================= */

const CustomerLayout = () => {
  const { logout, user } = useAuth();
  const { cartItems } = useCart();
  const { pathname } = useLocation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Prevent global window scrollbar by locking body/html scroll
    document.body.style.overflow = "hidden";
    document.body.style.height = "100vh";
    
    return () => {
      document.body.style.overflow = "";
      document.body.style.height = "";
    };
  }, []);

  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      scrollContainerRef.current.scrollLeft = 0;
    }
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  // Privileged roles must never see the customer-facing layout.
  // Handles the browser back-button case or slow internet load where an admin lands on "/".
  // Exception: Homepage Manager's live-preview iframe deliberately embeds this same
  // layout under an admin/super-admin session — isStorefrontPreview() only returns true
  // there (requires both ?preview=1 AND actually being framed), never for a real
  // top-level visit, so this doesn't relax the redirect for anyone else.
  const effectiveRole = (user.role || (typeof window !== "undefined" ? localStorage.getItem("userRole") : null))?.toUpperCase();
  const isPrivileged = effectiveRole === "SUPER_ADMIN" || effectiveRole === "ADMIN" || effectiveRole === "STAFF";

  if (isPrivileged && !isStorefrontPreview()) {
    if (effectiveRole === "SUPER_ADMIN")
      return <Navigate to="/super-admin-dashboard" replace />;
    if (effectiveRole === "ADMIN") return <Navigate to="/admin-dashboard" replace />;
    if (effectiveRole === "STAFF") return <Navigate to="/staff-dashboard" replace />;
  }

  // If still in initial load on a slow connection, do not render customer navbar until auth resolves
  if (user.isInitialLoad) {
    return null;
  }

  return (
    <UserNotificationProvider>
      <Navbar
        user={user}
        role={user.role}
        cartItemCount={user.isAuthenticated ? cartItems.length : 0}
        handleLogout={logout}
      />
      <FestiveAmbientOverlay />

      {/* Locked inside-scroll wrapper container under the fixed Navbar */}
      <div ref={scrollContainerRef} className="h-screen overflow-y-auto w-full select-text scrollbar-thin">
        <ErrorBoundary>
          <Suspense
            fallback={
              <div className="min-h-[calc(100vh-var(--app-header-h,80px))] flex items-center justify-center">
                <Loader fullScreen={false} />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </div>
    </UserNotificationProvider>
  );
};

/**
 * Redirects already-authenticated privileged users away from the login page.
 * Prevents admins from pressing back and landing on /login.
 */
const LoginGuard = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const effectiveRole = (user.role || (typeof window !== "undefined" ? localStorage.getItem("userRole") : null))?.toUpperCase();
  const isPrivileged = effectiveRole === "SUPER_ADMIN" || effectiveRole === "ADMIN" || effectiveRole === "STAFF";
  const isLoggedIn = user.isAuthenticated || (typeof window !== "undefined" && localStorage.getItem("isLoggedIn") === "true");

  if (isLoggedIn && isPrivileged) {
    if (effectiveRole === "SUPER_ADMIN")
      return <Navigate to="/super-admin-dashboard" replace />;
    if (effectiveRole === "ADMIN") return <Navigate to="/admin-dashboard" replace />;
    if (effectiveRole === "STAFF") return <Navigate to="/staff-dashboard" replace />;
  }
  return <>{children}</>;
};

/* ======================================================= */
/* ==================== MAIN ROUTES ====================== */
/* ======================================================= */

const AppRoutes = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
      {/* ===================== ADMIN ROUTES (ADMIN & SUPER_ADMIN) ===================== */}
      <Route
        path="/admin-dashboard"
        element={
          <ProtectedRoute
            requiredRoles={["ADMIN", "SUPER_ADMIN"]}
          >
            <NotificationProvider>
              <StaffPermissionProvider>
                <Admindashboard />
              </StaffPermissionProvider>
            </NotificationProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
        {/* Combined Admin/Staff + Customer Management */}
        <Route path="manage-user" element={<UserManagementPage />} />
        <Route path="manage-customers" element={<CustomerManagementPage />} />
        {/* Unified Catalog Management (Category + Product merge) */}
        <Route path="manage-catalog" element={<Listcategory />} />
        <Route path="manage-catalog/attributes/:categoryId" element={<CategoryAttributes />} />
        <Route path="products" element={<AdminProductStockManagement />} />
        {/* Legacy paths — kept working as redirects for existing bookmarks */}
        <Route path="manage-categories/add-category" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-categories/list-category" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-categories/attributes/:categoryId" element={<LegacyCatalogRedirect toSuffix="manage-catalog/attributes/:categoryId" />} />
        <Route path="manage-products" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-products/add-products" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-products/list-products" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="product-management" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="order-management" element={<AdminOrderManagement />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="coupon-management" element={<CouponManagement />} />
        <Route path="notifications" element={<NotificationManagement />} />
        <Route path="reports" element={<ReportsAnalytics />} />
        <Route path="audit-log" element={<AuditLog />} />
        <Route path="warehouse" element={<WarehouseSettings />} />
        <Route path="homepage" element={<HomepageManager />} />
        <Route path="content-pages" element={<StaticPagesManager />} />
        <Route path="staff-management" element={<StaffManagement />} />
        <Route
          path="customer-transactions"
          element={<CustomerTransactions />}
        />
        <Route path="customer-activity" element={<CustomerActivityTracker />} />
        <Route path="payment-logs" element={<PaymentTransactionLogs />} />
        <Route path="place-order" element={<AdminOrderPage />} />
      </Route>

      {/* ===================== SUPER ADMIN ROUTES (SUPER_ADMIN role only) ===================== */}
      <Route
        path="/super-admin-dashboard"
        element={
          <ProtectedRoute
            requiredRoles={["SUPER_ADMIN"]}
          >
            <NotificationProvider>
              <StaffPermissionProvider>
                <SuperAdminDashboard />
              </StaffPermissionProvider>
            </NotificationProvider>
          </ProtectedRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="manage-user" element={<UserManagementPage />} />
        <Route path="manage-customers" element={<CustomerManagementPage />} />
        {/* Unified Catalog Management (Category + Product merge) */}
        <Route path="manage-catalog" element={<Listcategory />} />
        <Route path="manage-catalog/attributes/:categoryId" element={<CategoryAttributes />} />
        <Route path="products" element={<AdminProductStockManagement />} />
        {/* Legacy paths — kept working as redirects for existing bookmarks */}
        <Route path="manage-categories/add-category" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-categories/list-category" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-categories/attributes/:categoryId" element={<LegacyCatalogRedirect toSuffix="manage-catalog/attributes/:categoryId" />} />
        <Route path="manage-products" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-products/add-products" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-products/list-products" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="product-management" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="order-management" element={<AdminOrderManagement />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="coupon-management" element={<CouponManagement />} />
        <Route path="notifications" element={<NotificationManagement />} />
        <Route path="reports" element={<ReportsAnalytics />} />
        <Route path="audit-log" element={<AuditLog />} />
        <Route path="warehouse" element={<WarehouseSettings />} />
        <Route path="homepage" element={<HomepageManager />} />
        <Route path="content-pages" element={<StaticPagesManager />} />
        <Route
          path="customer-transactions"
          element={<CustomerTransactions />}
        />
        <Route path="customer-activity" element={<CustomerActivityTracker />} />
        <Route path="payment-logs" element={<PaymentTransactionLogs />} />
        <Route path="place-order" element={<AdminOrderPage />} />
        <Route path="monitoring" element={<SuperAdminMonitoring />} />
      </Route>

      {/* ===================== STAFF ROUTES ===================== */}
      <Route
        path="/staff-dashboard"
        element={
          <ProtectedRoute requiredRoles={["STAFF"]}>
            <NotificationProvider>
              <StaffPermissionProvider>
                <StaffDashboard />
              </StaffPermissionProvider>
            </NotificationProvider>
          </ProtectedRoute>
        }
      >
        <Route path="profile" element={<StaffProfile />} />
        <Route index element={<StaffDashboardHome />} />
        {/* Permission requirements below mirror StaffDashboard.tsx's buildNav() —
            keep both in sync: buildNav decides which sidebar links a staff member
            sees, these guards decide what happens if they (or an old bookmark)
            reach the route directly without that permission. */}
        {/* Unified Catalog Management (Category + Product merge) */}
        <Route
          path="manage-catalog"
          element={
            <RequireStaffPermission
              anyOf={["CATEGORY_VIEW", "CATEGORY_ADD", "CATEGORY_EDIT", "CATEGORY_DELETE", "PRODUCT_VIEW", "PRODUCT_ADD", "PRODUCT_EDIT", "PRODUCT_DELETE"]}
            >
              <Listcategory />
            </RequireStaffPermission>
          }
        />
        <Route
          path="manage-catalog/attributes/:categoryId"
          element={
            <RequireStaffPermission
              anyOf={["CATEGORY_VIEW", "CATEGORY_ADD", "CATEGORY_EDIT", "CATEGORY_DELETE", "PRODUCT_VIEW", "PRODUCT_ADD", "PRODUCT_EDIT", "PRODUCT_DELETE"]}
            >
              <CategoryAttributes />
            </RequireStaffPermission>
          }
        />
        <Route
          path="products"
          element={
            <RequireStaffPermission
              anyOf={["PRODUCT_VIEW", "PRODUCT_ADD", "PRODUCT_EDIT", "PRODUCT_DELETE"]}
            >
              <AdminProductStockManagement />
            </RequireStaffPermission>
          }
        />
        {/* Legacy paths — kept working as redirects for existing bookmarks */}
        <Route path="manage-categories/add-category" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-categories/list-category" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-categories/attributes/:categoryId" element={<LegacyCatalogRedirect toSuffix="manage-catalog/attributes/:categoryId" />} />
        <Route path="manage-products" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-products/add-products" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="manage-products/list-products" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route path="product-management" element={<LegacyCatalogRedirect toSuffix="manage-catalog" />} />
        <Route
          path="order-management"
          element={
            <RequireStaffPermission anyOf={["ORDER_VIEW", "ORDER_UPDATE"]}>
              <AdminOrderManagement />
            </RequireStaffPermission>
          }
        />
        <Route
          path="place-order"
          element={
            <RequireStaffPermission anyOf={["ORDER_CREATE"]}>
              <AdminOrderPage />
            </RequireStaffPermission>
          }
        />
        {/* Notifications has no dedicated permission — unconditionally in buildNav's Settings group */}
        <Route path="notifications" element={<NotificationManagement />} />
        <Route
          path="customer-transactions"
          element={
            <RequireStaffPermission anyOf={["ORDER_VIEW"]}>
              <CustomerTransactions />
            </RequireStaffPermission>
          }
        />
        <Route
          path="coupon-management"
          element={
            <RequireStaffPermission anyOf={["COUPON_VIEW", "COUPON_ADD", "COUPON_EDIT", "COUPON_DELETE"]}>
              <CouponManagement />
            </RequireStaffPermission>
          }
        />
        <Route
          path="reports"
          element={
            <RequireStaffPermission anyOf={["ANALYTICS_VIEW"]}>
              <ReportsAnalytics />
            </RequireStaffPermission>
          }
        />
        <Route
          path="warehouse"
          element={
            <RequireStaffPermission anyOf={["SETTINGS_VIEW", "SETTINGS_EDIT"]}>
              <WarehouseSettings />
            </RequireStaffPermission>
          }
        />
        <Route
          path="homepage"
          element={
            <RequireStaffPermission anyOf={["BANNER_VIEW", "BANNER_ADD", "BANNER_EDIT", "BANNER_DELETE"]}>
              <HomepageManager />
            </RequireStaffPermission>
          }
        />
        <Route
          path="content-pages"
          element={
            <RequireStaffPermission anyOf={["BANNER_VIEW", "BANNER_ADD", "BANNER_EDIT", "BANNER_DELETE"]}>
              <StaticPagesManager />
            </RequireStaffPermission>
          }
        />
        <Route
          path="customer-activity"
          element={
            <RequireStaffPermission anyOf={["CUSTOMER_ACTIVITY_VIEW"]}>
              <CustomerActivityTracker />
            </RequireStaffPermission>
          }
        />
        <Route
          path="payment-logs"
          element={
            <RequireStaffPermission anyOf={["PAYMENT_VIEW"]}>
              <PaymentTransactionLogs />
            </RequireStaffPermission>
          }
        />
      </Route>

      {/* ===================== CUSTOMER ROUTES ===================== */}
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<Customerdashboard />} />
        <Route path="/discounts" element={<DiscountsRoutePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/categories" element={<AllCategoriesPage />} />
        <Route path="/categories/:slug" element={<CategoryProductPage />} />
        <Route path="/products/:productId" element={<ProductDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* /cart opens the side bar Cart Drawer on the storefront */}
        <Route path="/cart" element={<CartRedirect />} />

        <Route
          path="/checkout"
          element={
            <ProtectedRoute unauthenticatedRedirectTo="/">
              <CheckoutPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/WishlistPage"
          element={
            <ProtectedRoute unauthenticatedRedirectTo="/">
              <WhishlistPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/myorders"
          element={
            <ProtectedRoute unauthenticatedRedirectTo="/">
              <MyOrdersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/transactions"
          element={
            <ProtectedRoute unauthenticatedRedirectTo="/">
              <TransactionHistory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute unauthenticatedRedirectTo="/">
              <ProfileRedirect />
            </ProtectedRoute>
          }
        />

        <Route
          path="/order-success"
          element={
            <ProtectedRoute unauthenticatedRedirectTo="/">
              <OrderSuccess />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* ===================== INVOICE ROUTE (all authenticated roles) ===================== */}
      <Route
        path="/invoice/:orderId"
        element={
          <ProtectedRoute>
            <InvoicePage />
          </ProtectedRoute>
        }
      />

      {/* ===================== AUTH ROUTES ===================== */}
      {/* /signup replaced by CustomerAuthModal — redirect to home */}
      <Route path="/signup" element={<Navigate to="/" replace />} />
      <Route
        path="/login"
        element={
          <LoginGuard>
            <Login />
          </LoginGuard>
        }
      />

      {/* ===================== FALLBACK ===================== */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
    </ErrorBoundary>
  );
};

export default AppRoutes;
