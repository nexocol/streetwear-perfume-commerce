import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CatalogProvider } from './context/CatalogContext'
import { AdminAccessProvider } from './context/AdminAccessContext'
import { UIProvider } from './context/UIContext'
import { CommerceProvider } from './commerce/CommerceProvider'
import { StorefrontLayout } from './components/StorefrontLayout'
import { HomePage } from './pages/HomePage'
import { ShopPage } from './pages/ShopPage'
import { ProductPage } from './pages/ProductPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProtectedRoute } from './admin/ProtectedRoute'
import { AdminLayout } from './admin/AdminLayout'
import { AdminProductsPage } from './admin/AdminProductsPage'
import { AdminProductEditPage } from './admin/AdminProductEditPage'
import { AdminHomePage } from './admin/AdminHomePage'
import { AdminSettingsPage } from './admin/AdminSettingsPage'
import { ChangePasswordPage } from './admin/ChangePasswordPage'
import { PanelLogout } from './admin/PanelLogout'
import { useAdminBase } from './admin/adminMode'

function AdminBoundary(){return <AdminAccessProvider><ProtectedRoute/></AdminAccessProvider>}
function AdminIndex(){return <Navigate to={useAdminBase()+'/products'} replace/>}

// The same CMS pages serve /admin (Cloudflare Access), /panel (client login) and /demo/panel (read-only demo).
const adminPages=<>
  <Route index element={<AdminIndex/>}/>
  <Route path="products" element={<AdminProductsPage/>}/>
  <Route path="products/:id" element={<AdminProductEditPage/>}/>
  <Route path="home" element={<AdminHomePage/>}/>
  <Route path="settings" element={<AdminSettingsPage/>}/>
</>

export default function App(){
  return <BrowserRouter><CatalogProvider><UIProvider><CommerceProvider><Routes>
    <Route element={<StorefrontLayout/>}>
      <Route path="/" element={<HomePage/>}/>
      <Route path="/shop" element={<ShopPage/>}/>
      <Route path="/product/:slug" element={<ProductPage/>}/>
    </Route>
    <Route path="/panel/logout" element={<PanelLogout/>}/>
    <Route element={<AdminBoundary/>}>
      <Route path="/admin" element={<AdminLayout/>}>{adminPages}</Route>
      <Route path="/panel/cambiar-clave" element={<ChangePasswordPage/>}/>
      <Route path="/panel" element={<AdminLayout/>}>{adminPages}</Route>
      <Route path="/demo/panel" element={<AdminLayout/>}>{adminPages}</Route>
    </Route>
    <Route path="*" element={<NotFoundPage/>}/>
  </Routes></CommerceProvider></UIProvider></CatalogProvider></BrowserRouter>
}
