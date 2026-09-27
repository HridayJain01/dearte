import { Component, Suspense, lazy, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Seo } from './components/seo/Seo';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { Button, EmptyState, LoadingBlock } from './components/ui/Primitives';
import { useAuth } from './hooks/useAuth';
import { siteSettingsQuery } from './hooks/useSiteSettings';

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })));

const LoginPage = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.ForgotPasswordPage })));

const CollectionsPage = lazy(() => import('./pages/StorePages').then((module) => ({ default: module.CollectionsPage })));
const OccasionsPage = lazy(() => import('./pages/StorePages').then((module) => ({ default: module.OccasionsPage })));
const ProductListPage = lazy(() => import('./pages/StorePages').then((module) => ({ default: module.ProductListPage })));
const ProductDetailPage = lazy(() => import('./pages/StorePages').then((module) => ({ default: module.ProductDetailPage })));
const CartPage = lazy(() => import('./pages/StorePages').then((module) => ({ default: module.CartPage })));
const WishlistPage = lazy(() => import('./pages/StorePages').then((module) => ({ default: module.WishlistPage })));
const CheckoutPage = lazy(() => import('./pages/StorePages').then((module) => ({ default: module.CheckoutPage })));
const CataloguePage = lazy(() => import('./pages/StorePages').then((module) => ({ default: module.CataloguePage })));
const ProfilePage = lazy(() => import('./pages/StorePages').then((module) => ({ default: module.ProfilePage })));

const ContactPage = lazy(() => import('./pages/ContentPages').then((module) => ({ default: module.ContactPage })));
const AboutPage = lazy(() => import('./pages/ContentPages').then((module) => ({ default: module.AboutPage })));
const EducationPage = lazy(() => import('./pages/ContentPages').then((module) => ({ default: module.EducationPage })));
const StaticPage = lazy(() => import('./pages/ContentPages').then((module) => ({ default: module.StaticPage })));
const FAQPage = lazy(() => import('./pages/ContentPages').then((module) => ({ default: module.FAQPage })));
const EventsPage = lazy(() => import('./pages/ContentPages').then((module) => ({ default: module.EventsPage })));
const TestimonialsPage = lazy(() => import('./pages/ContentPages').then((module) => ({ default: module.TestimonialsPage })));
const TrustedByPage = lazy(() => import('./pages/ContentPages').then((module) => ({ default: module.TrustedByPage })));
const CareersPage = lazy(() => import('./pages/ContentPages').then((module) => ({ default: module.CareersPage })));
const NotFoundPage = lazy(() => import('./pages/ContentPages').then((module) => ({ default: module.NotFoundPage })));

const AdminDashboardPage = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.AdminDashboardPage })));
const AdminPromotionsPage = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.AdminPromotionsPage })));
const AdminUsersPage = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.AdminUsersPage })));
const AdminProductsPage = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.AdminProductsPage })));
const AdminOrdersPage = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.AdminOrdersPage })));
const AdminWhatsAppPage = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.AdminWhatsAppPage })));
const AdminCataloguesPage = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.AdminCataloguesPage })));
const AdminCollectionsPage = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.AdminCollectionsPage })));
const AdminConfigPage = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.AdminConfigPage })));
const AdminTestimonialsPage = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.AdminTestimonialsPage })));
const AdminRolesPage = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.AdminRolesPage })));
const AdminReportsPage = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.AdminReportsPage })));

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && role !== 'admin') return <Navigate to="/" replace />;

  return children;
}

// The same modules the lazy pages above import; calling one only starts the
// download early, so a guarded page's code arrives while access is checked.
const loadStorePages = () => import('./pages/StorePages');
const loadContentPages = () => import('./pages/ContentPages');

function GuestAccessRoute({ children, accessKey, preload }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  // The guest flags live in site settings, which the header is already
  // fetching. This used to wait for the whole /site/home payload instead.
  const { data: settings, isLoading: settingsLoading } = useQuery(siteSettingsQuery);

  useEffect(() => {
    // A failed download resurfaces when the lazy page renders, via PageBoundary.
    preload?.().catch(() => {});
  }, [preload]);

  // Signed-in users are never gated, so they don't wait for the settings.
  if (authLoading || (!isAuthenticated && settingsLoading)) {
    return (
      <div className="page-shell py-10">
        <LoadingBlock label="Verifying access..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    const guestAccess = settings?.guestAccess || {};
    // If the setting explicitly denies access, redirect to login
    if (guestAccess[accessKey] === false) {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}

function LegacyCollectionRedirect() {
  const { category } = useParams();
  return <Navigate to={category ? `/products?category=${encodeURIComponent(category)}` : '/products'} replace />;
}

// Pages are lazy chunks: a spinner while one loads, and a way out if it can't.
// A chunk fails to load offline before that page was ever opened, or after a
// deploy deleted the chunk this tab still points at. Without the error half,
// React unmounts everything to a white screen.
class PageBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <section className="page-shell section-gap">
          <EmptyState
            title="This page couldn't load."
            description="Check your connection and try again."
            action={<Button onClick={() => window.location.reload()}>Try again</Button>}
          />
        </section>
      );
    }
    return (
      <Suspense fallback={<div className="page-shell py-10"><LoadingBlock label="Loading view..." /></div>}>
        {this.props.children}
      </Suspense>
    );
  }
}

function App() {
  return (
    <PageBoundary>
      <Routes>
        <Route
          element={
            /* No layout-level <Seo>: it would be the last effect to run and
               would overwrite the page's own head. Pages declare their own, and
               anything that does not keeps the served shell's tags. */
            <AppLayout />
          }
        >
          <Route index element={<HomePage />} />
          {/* Product list + detail are open to guests (limited to the showToGuests
              teaser); cart, wishlist, checkout and account pages stay gated. */}
          <Route path="products" element={<GuestAccessRoute accessKey="pageProducts" preload={loadStorePages}><ProductListPage /></GuestAccessRoute>} />
          <Route path="collections" element={<GuestAccessRoute accessKey="pageCollections" preload={loadStorePages}><CollectionsPage /></GuestAccessRoute>} />
          <Route path="collections/:category" element={<LegacyCollectionRedirect />} />
          <Route path="occasions" element={<OccasionsPage />} />
          <Route path="products/:styleCode" element={<GuestAccessRoute accessKey="pageProducts" preload={loadStorePages}><ProductDetailPage /></GuestAccessRoute>} />
          <Route path="cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
          <Route path="wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
          <Route path="checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="catalogue" element={<ProtectedRoute><CataloguePage /></ProtectedRoute>} />
          <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="education/:slug" element={<EducationPage />} />
          <Route path="privacy-policy" element={<StaticPage slug="privacy-policy" />} />
          <Route path="terms" element={<StaticPage slug="terms" />} />
          <Route path="return-policy" element={<StaticPage slug="return-policy" />} />
          <Route path="faq" element={<FAQPage />} />
          <Route path="events" element={<GuestAccessRoute accessKey="pageEvents" preload={loadContentPages}><EventsPage /></GuestAccessRoute>} />
          <Route path="testimonials" element={<GuestAccessRoute accessKey="pageTestimonials" preload={loadContentPages}><TestimonialsPage /></GuestAccessRoute>} />
          <Route path="trusted-by" element={<GuestAccessRoute accessKey="pageTrustedBrands" preload={loadContentPages}><TrustedByPage /></GuestAccessRoute>} />
          <Route path="careers" element={<CareersPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              {/* The whole admin tree is session-only; keep it out of the index. */}
              <Seo title="Admin" noindex />
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="promotions" element={<AdminPromotionsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="whatsapp" element={<AdminWhatsAppPage />} />
          <Route path="catalogues" element={<AdminCataloguesPage />} />
          <Route path="collections" element={<AdminCollectionsPage />} />
          <Route path="config" element={<AdminConfigPage />} />
          <Route path="testimonials" element={<AdminTestimonialsPage />} />
          <Route path="roles" element={<AdminRolesPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
        </Route>
      </Routes>
    </PageBoundary>
  );
}

export default App;
