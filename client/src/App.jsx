import { Helmet } from 'react-helmet-async';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { useAuth } from './hooks/useAuth';
import { LoginPage, RegisterPage, ForgotPasswordPage } from './pages/AuthPages';
import { HomePage } from './pages/HomePage';
import {
  CartPage,
  CataloguePage,
  CheckoutPage,
  ProductDetailPage,
  ProductListPage,
  ProfilePage,
  WishlistPage,
} from './pages/StorePages';
import {
  CareersPage,
  ContactPage,
  EducationPage,
  EventsPage,
  FAQPage,
  NotFoundPage,
  StaticPage,
  TestimonialsPage,
} from './pages/ContentPages';
import {
  AdminCataloguesPage,
  AdminConfigPage,
  AdminDashboardPage,
  AdminOrdersPage,
  AdminProductsPage,
  AdminPromotionsPage,
  AdminReportsPage,
  AdminRolesPage,
  AdminTestimonialsPage,
  AdminUsersPage,
} from './pages/AdminPages';

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
        <Route path="education/:slug" element={<EducationPage />} />
        <Route path="privacy-policy" element={<StaticPage slug="privacy-policy" />} />
        <Route path="terms" element={<StaticPage slug="terms" />} />
        <Route path="return-policy" element={<StaticPage slug="return-policy" />} />
        <Route path="faq" element={<FAQPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="testimonials" element={<TestimonialsPage />} />
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
  );
}

export default App;
