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

function AdminBoundary(){return <AdminAccessProvider><ProtectedRoute/></AdminAccessProvider>}

export default function App(){
  return <BrowserRouter><CatalogProvider><UIProvider><CommerceProvider><Routes>
    <Route element={<StorefrontLayout/>}>
      <Route path="/" element={<HomePage/>}/>
      <Route path="/shop" element={<ShopPage/>}/>
      <Route path="/product/:slug" element={<ProductPage/>}/>
    </Route>
    <Route element={<AdminBoundary/>}>
      <Route path="/admin" element={<AdminLayout/>}>
        <Route index element={<Navigate to="/admin/products" replace/>}/>
        <Route path="products" element={<AdminProductsPage/>}/>
        <Route path="products/:id" element={<AdminProductEditPage/>}/>
        <Route path="home" element={<AdminHomePage/>}/>
        <Route path="settings" element={<AdminSettingsPage/>}/>
      </Route>
    </Route>
    <Route path="*" element={<NotFoundPage/>}/>
  </Routes></CommerceProvider></UIProvider></CatalogProvider></BrowserRouter>
}
