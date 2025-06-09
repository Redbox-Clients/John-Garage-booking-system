import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BookingForm from './components/BookingForm';
import CancelBooking from './components/CancelBooking';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<BookingForm />} />
          <Route path="/cancel-booking" element={<CancelBooking />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
