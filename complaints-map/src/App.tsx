import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import MapPage from './pages/MapPage';
import SemakPage from './pages/SemakPage';
import DonationsPage from './pages/DonationsPage';
import AduanLayout, { AduanIndexRedirect, AduanStepPage } from './pages/AduanPage';
import AduanSuccessPage from './pages/aduan/AduanSuccessPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<MapPage />} />
          <Route path="semak" element={<SemakPage />} />
          <Route path="sumbangan" element={<DonationsPage />} />
          <Route path="aduan" element={<AduanLayout />}>
            <Route index element={<AduanIndexRedirect />} />
            <Route path="berjaya" element={<AduanSuccessPage />} />
            <Route path=":langkah" element={<AduanStepPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
