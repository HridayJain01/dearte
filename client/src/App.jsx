import { Suspense, lazy } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoadingBlock } from './components/ui/Primitives';
import { useAuth } from './hooks/useAuth';

const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })));

const LoginPage = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.ForgotPasswordPage })));

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
const AdminCataloguesPage = lazy(() => import('./pages/AdminPages').then((module) => ({ default: module.AdminCataloguesPage })));
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

function Meta({ title }) {
  return (
    <Helmet>
      <title>{title} | DeArte Jewellery</title>
    </Helmet>
  );
}

function App() {
  return (
    <Suspense fallback={<div className="page-shell py-10"><LoadingBlock label="Loading view..." /></div>}>
      <Routes>
        <Route
          element={
            <>
              <Meta title="Luxury B2B Jewellery Platform" />
              <AppLayout />
            </>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="products" element={<ProductListPage />} />
          <Route path="collections/:category" element={<ProductListPage />} />
          <Route path="products/:styleCode" element={<ProductDetailPage />} />
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
          <Route path="events" element={<EventsPage />} />
          <Route path="testimonials" element={<TestimonialsPage />} />
          <Route path="trusted-by" element={<TrustedByPage />} />
          <Route path="careers" element={<CareersPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
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
          <Route path="catalogues" element={<AdminCataloguesPage />} />
          <Route path="config" element={<AdminConfigPage />} />
          <Route path="testimonials" element={<AdminTestimonialsPage />} />
          <Route path="roles" element={<AdminRolesPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
