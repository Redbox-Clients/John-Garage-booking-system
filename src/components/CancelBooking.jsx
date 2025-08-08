import React, { useState } from 'react';
// Removed useSearchParams and useNavigate as they require a Router context
// import { useSearchParams, useNavigate } from 'react-router-dom';

const CancelBooking = () => {
  // const [searchParams] = useSearchParams(); // Removed
  // const navigate = useNavigate(); // Removed
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);
  const [cancelled, setCancelled] = useState(false);

  // Get bookingId directly from window.location.search
  const searchParams = new URLSearchParams(window.location.search);
  let bookingId = searchParams.get('bookingId');
  
  // Fix the timestamp format - replace space with + for timezone offset
  if (bookingId && bookingId.includes(' 00:00')) {
    bookingId = bookingId.replace(' 00:00', '+00:00');
  }

  const handleCancel = async () => {
    if (!bookingId) {
      setError('No booking ID provided');
      return;
    }

    setCancelling(true);
    setError(null);

    try {
      const response = await fetch('https://redboxrob.app.n8n.cloud/webhook/9069c6f8-96b2-44a7-bda9-ce78fae02e3e', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }

      const data = await response.json();
      console.log('Full n8n response:', data);
      console.log('What n8n received as bookingId:', data.bookingId || 'No bookingId in response');
      console.log('Cancellation response:', data);
      setCancelled(true);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setError('Failed to cancel booking. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const handleNewBooking = () => {
    // Redirect to the root of the current host (e.g., localhost:5173 or netlify.app)
    window.location.href = '/';
  };

  if (!bookingId) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 md:p-10 w-full max-w-md text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
            Invalid Booking
          </h1>
          <p className="text-gray-600 mb-6">
            No booking ID provided. Please use the link from your booking confirmation email.
          </p>
          <div className="text-center">
            <button
              onClick={handleNewBooking}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Make a New Booking
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 md:p-10 w-full max-w-md text-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
          {cancelled ? 'Booking Cancelled' : 'Cancel Booking'}
        </h1>

        {!cancelled && (
          <p className="text-gray-600 mb-6">
            Are you sure you want to cancel this booking? This action cannot be undone.
          </p>
        )}

        {cancelled && (
          <p className="text-green-600 font-medium mb-6">
            Your booking has been successfully cancelled.
          </p>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-6" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          {!cancelled && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className={`py-2 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2
                ${cancelling
                  ? 'bg-red-300 text-white cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
                }`}
            >
              {cancelling ? (
                <svg className="animate-spin h-5 w-5 text-white mx-auto" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Cancel Booking'
              )}
            </button>
          )}

          <button
            onClick={handleNewBooking}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Make a New Booking
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelBooking;
