import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AdminPage } from './pages/AdminPage';
import { ReceptionPage } from './pages/ReceptionPage';
import { Button } from './components/ui/button';

const Landing = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-8 bg-gray-50 p-4 text-center">
    <h1 className="text-4xl font-bold text-gray-900">Visitor Management System</h1>
    <div className="flex flex-col sm:flex-row gap-4">
      <Link to="/admin">
        <Button size="lg" className="w-48 h-16 text-lg">Admin / Booking</Button>
      </Link>
      <Link to="/reception">
        <Button size="lg" variant="secondary" className="w-48 h-16 text-lg">Reception Kiosk</Button>
      </Link>
    </div>
  </div>
);

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/reception" element={<ReceptionPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
