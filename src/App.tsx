import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Property from "./pages/Property.tsx";
import Properties from "./pages/Properties.tsx";
import PropertyDetail from "./pages/PropertyDetail.tsx";
import Gallery from "./pages/Gallery.tsx";
import Booking from "./pages/Booking.tsx";
import Services from "./pages/Services.tsx";
import Location from "./pages/Location.tsx";
import About from "./pages/About.tsx";
import Contact from "./pages/Contact.tsx";
import { SiteLayout } from "./components/layout/SiteLayout.tsx";
import { SiteContentProvider } from "./hooks/useSiteContent.tsx";
import SignIn from "./pages/SignIn.tsx";
import SignUp from "./pages/SignUp.tsx";
import MyBookings from "./pages/MyBookings.tsx";
import { ProtectedGuestRoute } from "./components/auth/ProtectedGuestRoute.tsx";

// Admin
import { AuthProvider } from "./admin/auth/AuthProvider.tsx";
import { ProtectedRoute } from "./admin/auth/ProtectedRoute.tsx";
import { AdminLayout } from "./admin/layout/AdminLayout.tsx";
import AdminLogin from "./admin/pages/AdminLogin.tsx";
import AdminResetPassword from "./admin/pages/AdminResetPassword.tsx";
import AdminDashboard from "./admin/pages/AdminDashboard.tsx";
import PagesList from "./admin/pages/PagesList.tsx";
import PageEditor from "./admin/pages/PageEditor.tsx";
import MediaLibrary from "./admin/pages/MediaLibrary.tsx";
import ContactSettings from "./admin/pages/ContactSettings.tsx";
import SiteSettings from "./admin/pages/SiteSettings.tsx";
import UsersPage from "./admin/pages/UsersPage.tsx";
import { CONTENT_MANAGER_ROLES, MEDIA_MANAGER_ROLES, SETTINGS_MANAGER_ROLES, USER_MANAGER_ROLES } from "./admin/auth/permissions.ts";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SiteContentProvider>
          <Routes>
            {/* Public site */}
            <Route element={<SiteLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/property" element={<Property />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/properties/:slug" element={<PropertyDetail />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/services" element={<Services />} />
              <Route path="/location" element={<Location />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />

              {/* Guest auth routes (public) */}
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />

              {/* Routes that require a signed-in guest */}
              <Route element={<ProtectedGuestRoute />}>
                <Route path="/booking" element={<Booking />} />
                <Route path="/my-bookings" element={<MyBookings />} />
              </Route>
            </Route>

            {/* Admin portal */}
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/reset-password" element={<AdminResetPassword />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/admin/dashboard" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route element={<ProtectedRoute allowedRoles={USER_MANAGER_ROLES} />}>
                  <Route path="users" element={<UsersPage />} />
                </Route>
                <Route element={<ProtectedRoute allowedRoles={CONTENT_MANAGER_ROLES} />}>
                  <Route path="pages" element={<PagesList />} />
                  <Route path="pages/:slug" element={<PageEditor />} />
                </Route>
                <Route element={<ProtectedRoute allowedRoles={MEDIA_MANAGER_ROLES} />}>
                  <Route path="media" element={<MediaLibrary />} />
                </Route>
                <Route element={<ProtectedRoute allowedRoles={SETTINGS_MANAGER_ROLES} />}>
                  <Route path="contact" element={<ContactSettings />} />
                  <Route path="settings" element={<SiteSettings />} />
                </Route>
              </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </SiteContentProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
