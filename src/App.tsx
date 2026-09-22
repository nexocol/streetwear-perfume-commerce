import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CatalogProvider } from './context/CatalogContext'
import { AuthProvider } from './context/AuthContext'
import { UIProvider } from './context/UIContext'
import { CommerceProvider } from './commerce/CommerceProvider'
import { StorefrontLayout } from './components/StorefrontLayout'
import { HomePage } from './pages/HomePage'
import { ShopPage } from './pages/ShopPage'
import { ProductPage } from './pages/ProductPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { AdminLoginPage } from './admin/AdminLoginPage'
import { ProtectedRoute } from './admin/ProtectedRoute'
import { AdminLayout } from './admin/AdminLayout'
import { AdminProductsPage } from './admin/AdminProductsPage'
import { AdminProductEditPage } from './admin/AdminProductEditPage'
import { AdminHomePage } from './admin/AdminHomePage'
import { AdminSettingsPage } from './admin/AdminSettingsPage'

export default function App(){
  return <BrowserRouter><AuthProvider><CatalogProvider><UIProvider><CommerceProvider><Routes>
    <Route element={<StorefrontLayout/>}><Route path="/" element={<HomePage/>}/><Route path="/shop" element={<ShopPage/>}/><Route path="/product/:slug" element={<ProductPage/>}/></Route>
    <Route path="/admin/login" element={<AdminLoginPage/>}/>
    <Route element={<ProtectedRoute/>}><Route path="/admin" element={<AdminLayout/>}><Route index element={<Navigate to="/admin/products" replace/>}/><Route path="products" element={<AdminProductsPage/>}/><Route path="products/:id" element={<AdminProductEditPage/>}/><Route path="home" element={<AdminHomePage/>}/><Route path="settings" element={<AdminSettingsPage/>}/></Route></Route>
    <Route path="*" element={<NotFoundPage/>}/>
  </Routes></CommerceProvider></UIProvider></CatalogProvider></AuthProvider></BrowserRouter>
}
