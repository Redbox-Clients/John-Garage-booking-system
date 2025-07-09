import React, { useState, useEffect, useMemo } from 'react';

// Helper function to get days in a month
const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

// Helper function to get the day of the week for the first day of the month
const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month, 1).getDay(); // 0 for Sunday, 1 for Monday, etc.
};

// Main Booking Form component
export default function BookingForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '+353', // Initialized with the +353 prefix
    carReg: '',
    carMake: '',
    carModel: '',
    appointmentDate: '', // Will store the selected date string (YYYY-MM-DD)
    carNeeds: '',
  });

  const [loading, setLoading] = useState(false); // For form submission
  const [message, setMessage] = useState(''); // General form messages (success/error)
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  // States for custom datepicker logic
  const [unavailableDates, setUnavailableDates] = useState([]); // Stores dates from webhook (YYYY-MM-DD)
  const [fetchingAvailability, setFetchingAvailability] = useState(true); // Loading state for availability fetch
  const [availabilityError, setAvailabilityError] = useState(null); // Error for availability fetch
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showCalendar, setShowCalendar] = useState(false); // To toggle calendar visibility
  const [dateSelectionError, setDateSelectionError] = useState(null);

  // Your n8n webhook URL for availability check (GET)
  const n8nAvailabilityWebhookUrl = 'https://redboxrob.app.n8n.cloud/webhook/a807a240-f285-4d9e-969b-a3107955c178';

  // Your n8n webhook URL for submitting bookings (POST)
  const n8nBookingWebhookUrl = 'https://redboxrob.app.n8n.cloud/webhook/797f3300-663d-42bb-9337-92790b5d26a8';

  // Define apiKey as an empty string as per instructions, even if not used by this specific n8n webhook
  const apiKey = "";

  // Fetch unavailable dates from n8n on component mount
  useEffect(() => {
    const fetchUnavailableDates = async () => {
      try {
        setFetchingAvailability(true);
        setAvailabilityError(null);
        const response = await fetch(n8nAvailabilityWebhookUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setUnavailableDates(data.dates || []);
      } catch (e) {
        console.error("Failed to fetch unavailable dates:", e);
        setAvailabilityError("Failed to load unavailable dates. Please try again later.");
      } finally {
        setFetchingAvailability(false);
      }
    };

    fetchUnavailableDates();
  }, [n8nAvailabilityWebhookUrl, apiKey]);

  // Helper to format date to YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get today's date (start of the disabled range)
  const todayDate = useMemo(() => { // Renamed from getTodayDate to todayDate to reflect it's a value, not a function
    const today = new Date();
    // Normalize to start of day for accurate comparison
    today.setHours(0, 0, 0, 0);
    return today;
  }, []);

  // Calculate the date one month from today (end of the disabled range)
  const oneMonthFromToday = useMemo(() => { // Renamed from getOneMonthFromToday to oneMonthFromToday
    const today = new Date();
    const oneMonthLater = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
    // Normalize to end of day for accurate comparison to include the full day
    oneMonthLater.setHours(23, 59, 59, 999);
    return oneMonthLater;
  }, []);

  // Generate calendar days for the current month
  const calendarDays = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayOfWeek = getFirstDayOfMonth(currentYear, currentMonth); // 0 for Sunday

    const days = [];
    // Add leading empty cells for days before the 1st of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    // Add actual days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentYear, currentMonth, i);
      // Normalize to start of day for consistent comparison
      date.setHours(0, 0, 0, 0);
      days.push(date);
    }
    return days;
  }, [currentYear, currentMonth]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const handlePrevMonth = () => {
    setCurrentMonth(prevMonth => {
      if (prevMonth === 0) {
        setCurrentYear(prevYear => prevYear - 1);
        return 11;
      }
      return prevMonth - 1;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth(prevMonth => {
      if (prevMonth === 11) {
        setCurrentYear(prevYear => prevYear + 1);
        return 0;
      }
      return prevMonth + 1;
    });
  };

  const handleDayClick = (date) => {
    if (!date) return;

    const dateString = formatDate(date);

    // Check if the date is a weekend (Saturday = 6, Sunday = 0)
    if (date.getDay() === 0 || date.getDay() === 6) {
      setMessage(`Weekends are not available for appointments. Please choose a weekday.`);
      setMessageType('error');
      setFormData(prevData => ({ ...prevData, appointmentDate: '' }));
      setDateSelectionError(`Weekends are not available for appointments. Please choose a weekday.`);
      return;
    }

    // Check if the date is specifically unavailable from webhook
    if (unavailableDates.includes(dateString)) {
      setMessage(`Date ${dateString} is unavailable. Please choose another date.`);
      setMessageType('error');
      setFormData(prevData => ({ ...prevData, appointmentDate: '' }));
      setDateSelectionError(`Date ${dateString} is unavailable. Please choose another date.`);
    }
    // Check if the date is in the disabled range (today up to one month from today)
    else if (date >= todayDate && date <= oneMonthFromToday) { // Use todayDate and oneMonthFromToday directly
      setMessage(`Appointments cannot be booked within the next month. Please select a date after ${formatDate(oneMonthFromToday)}.`);
      setMessageType('error');
      setFormData(prevData => ({ ...prevData, appointmentDate: '' }));
      setDateSelectionError(`Appointments cannot be booked within the next month. Please select a date after ${formatDate(oneMonthFromToday)}.`);
    }
    // Check if the date is in the past
    else if (date < todayDate) { // Use todayDate directly
      setMessage(`You cannot select a past date (${dateString}).`);
      setMessageType('error');
      setFormData(prevData => ({ ...prevData, appointmentDate: '' }));
      setDateSelectionError(`You cannot select a past date (${dateString}).`);
    }
    else {
      setFormData(prevData => ({ ...prevData, appointmentDate: dateString }));
      setMessage('');
      setMessageType('');
      setDateSelectionError(null);
      setShowCalendar(false); // Hide calendar after selection
    }
  };

  // Handle input changes for form fields other than date
  const handleChange = (e) => {
    const { name, value } = e.target;
    setMessage('');
    setMessageType('');
    setDateSelectionError(null);

    if (name === 'phoneNumber') {
      let newValue = value;
      if (!newValue.startsWith('+353')) {
        newValue = '+353' + newValue.replace(/^\+353/, '');
      }
      const digitsOnly = newValue.replace(/^\+353/, '').replace(/[^0-9]/g, '');
      newValue = '+353' + digitsOnly;

      setFormData(prevData => ({
        ...prevData,
        [name]: newValue
      }));
    } else {
      setFormData(prevData => ({
        ...prevData,
        [name]: value
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('');
    setDateSelectionError(null);

    // Basic client-side validation
    if (!formData.name || !formData.email || !formData.phoneNumber || !formData.carReg || !formData.appointmentDate || !formData.carNeeds) {
      setMessage('Please fill in all required fields.');
      setMessageType('error');
      setLoading(false);
      return;
    }

    // Final check for date validity before submission
    const selectedDateObj = new Date(formData.appointmentDate);
    // Normalize selectedDateObj to start of day for consistent comparison
    selectedDateObj.setHours(0, 0, 0, 0);

    // Check if the selected date is a weekend
    if (selectedDateObj.getDay() === 0 || selectedDateObj.getDay() === 6) {
      setMessage(`Weekends are not available for appointments. Please choose a weekday.`);
      setMessageType('error');
      setLoading(false);
      return;
    } else if (unavailableDates.includes(formData.appointmentDate)) {
      setMessage(`The selected date (${formData.appointmentDate}) is unavailable. Please choose another day.`);
      setMessageType('error');
      setLoading(false);
      return;
    } else if (selectedDateObj < todayDate) { // Use todayDate directly
      setMessage(`You cannot select a past date (${formData.appointmentDate}).`);
      setMessageType('error');
      setLoading(false);
      return;
    } else if (selectedDateObj >= todayDate && selectedDateObj <= oneMonthFromToday) { // Use todayDate and oneMonthFromToday directly
      setMessage(`Appointments cannot be booked within the next month. Please select a date after ${formatDate(oneMonthFromToday)}.`);
      setMessageType('error');
      setLoading(false);
      return;
    }

    try {
      const dataToSend = {
        ...formData,
        status: 'pending'
      };

      const url = `${n8nBookingWebhookUrl}${apiKey ? `?key=${apiKey}` : ''}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        setMessage('Booking submitted successfully! The garage will confirm your appointment.');
        setMessageType('success');
        setFormData({
          name: '',
          email: '',
          phoneNumber: '+353',
          carReg: '',
          carMake: '',
          carModel: '',
          appointmentDate: '',
          carNeeds: ''
        });
        const refreshResponse = await fetch(n8nAvailabilityWebhookUrl);
        if (refreshResponse.ok) {
          const refreshedData = await refreshResponse.json();
          setUnavailableDates(refreshedData.dates || []);
        } else {
          console.error('Failed to refresh availability after booking:', refreshResponse.statusText);
        }
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (jsonError) {
          errorData = { message: 'Unknown error occurred.' };
        }
        setMessage(`Submission failed: ${errorData.message || response.statusText}. Please try again.`);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setMessage('Failed to submit your booking. This is most likely due to **Cross-Origin Resource Sharing (CORS)** configuration on your n8n webhook. Please ensure your n8n workflow for `https://redboxrob.app.n8n.cloud/webhook/797f3300-663d-42bb-9337-92790b5d26a8` is active and configured to send `Access-Control-Allow-Origin: *` or your specific application domain in its HTTP Response headers. Also, check your internet connection.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 font-inter">
      <div className="bg-white p-6 sm:p-8 lg:p-10 rounded-xl shadow-2xl w-full max-w-lg border border-gray-200">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">Book Your Service</h2>
        <p className="text-gray-600 mb-8 text-center">Fill out the form below to book an appointment with our garage.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
              required
            />
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address <span className="text-red-500">*</span></label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
              required
            />
          </div>

          {/* Phone Number Field */}
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="e.g., +353 1234567"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
              required
            />
          </div>

          {/* Car Registration Field */}
          <div>
            <label htmlFor="carReg" className="block text-sm font-medium text-gray-700 mb-1">Car Registration <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="carReg"
              name="carReg"
              value={formData.carReg}
              onChange={handleChange}
              placeholder="ABC 123X"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
              required
            />
          </div>

          {/* Car Make Field */}
          <div>
            <label htmlFor="carMake" className="block text-sm font-medium text-gray-700 mb-1">Car Make</label>
            <input
              type="text"
              id="carMake"
              name="carMake"
              value={formData.carMake}
              onChange={handleChange}
              placeholder="Toyota"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
            />
          </div>

          {/* Car Model Field */}
          <div>
            <label htmlFor="carModel" className="block text-sm font-medium text-gray-700 mb-1">Car Model</label>
            <input
              type="text"
              id="carModel"
              name="carModel"
              value={formData.carModel}
              onChange={handleChange}
              placeholder="Camry"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
            />
          </div>

          {/* Appointment Date Field (Custom Date Picker) */}
          <div className="relative">
            <label htmlFor="appointmentDate" className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Appointment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="appointmentDate"
              name="appointmentDate"
              value={formData.appointmentDate}
              readOnly // Make it read-only as selection is via calendar
              onClick={() => setShowCalendar(!showCalendar)}
              placeholder="Select a date"
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out cursor-pointer"
              required
            />
            {dateSelectionError && (
              <p className="text-red-600 text-sm mt-2">{dateSelectionError}</p>
            )}

            {showCalendar && (
              <div className="absolute z-10 bg-white border border-gray-300 rounded-lg shadow-lg mt-2 p-4 w-full">
                {fetchingAvailability ? (
                  <div className="text-center text-gray-600 mb-4">Loading unavailable dates...</div>
                ) : availabilityError ? (
                  <div className="text-center text-red-600 mb-4">{availabilityError}</div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <button type="button" onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <span className="text-lg font-semibold text-gray-800">
                        {monthNames[currentMonth]} {currentYear}
                      </span>
                      <button type="button" onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-sm">
                      {dayNames.map(day => (
                        <div key={day} className="font-medium text-gray-500">
                          {day}
                        </div>
                      ))}
                      {calendarDays.map((date, index) => {
                        const dateString = date ? formatDate(date) : null;
                        const isUnavailable = dateString && unavailableDates.includes(dateString);
                        const isPastDate = date && date < todayDate; // Use todayDate directly
                        // New condition: is within the one-month disabled window (today to one month from today inclusive)
                        const isWithinOneMonthDisabledWindow = date && date >= todayDate && date <= oneMonthFromToday; // Use todayDate and oneMonthFromToday directly
                        const isWeekend = date && (date.getDay() === 0 || date.getDay() === 6); // Saturday = 6, Sunday = 0
                        const isSelected = dateString && formData.appointmentDate === dateString;
                        // A date is disabled if it's explicitly unavailable, in the past, within the one-month disabled window, or is a weekend
                        const isDisabled = isUnavailable || isPastDate || isWithinOneMonthDisabledWindow || isWeekend;

                        let dayClasses = "p-2 rounded-md transition duration-150 ease-in-out";
                        if (date) {
                          if (isDisabled) {
                            dayClasses += " bg-gray-100 text-gray-400 cursor-not-allowed";
                          } else if (isSelected) {
                            dayClasses += " bg-indigo-600 text-white font-bold";
                          } else {
                            dayClasses += " hover:bg-indigo-100 cursor-pointer";
                          }
                        } else {
                          dayClasses += " invisible"; // For empty cells
                        }

                        return (
                          <div
                            key={index}
                            className={dayClasses}
                            onClick={() => !isDisabled && handleDayClick(date)}
                          >
                            {date ? date.getDate() : ''}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Appointments can only be booked at least <span className="font-semibold text-indigo-600">one month in advance</span>. Dates within the next month are disabled. If you need an urgent booking, please contact the garage directly.
            </p>
          </div>

          {/* Car Needs Description Field */}
          <div>
            <label htmlFor="carNeeds" className="block text-sm font-medium text-gray-700 mb-1">Describe Car Needs <span className="text-red-500">*</span></label>
            <textarea
              id="carNeeds"
              name="carNeeds"
              rows="4"
              value={formData.carNeeds}
              onChange={handleChange}
              placeholder="e.g., Oil change, brake inspection, strange noise from engine..."
              className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out resize-y"
              required
            ></textarea>
          </div>

          {/* Submission Feedback Message */}
          {message && (
            <div
              className={`p-3 rounded-md text-sm ${
                messageType === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {message}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-300 ease-in-out transform hover:scale-105"
            disabled={loading || fetchingAvailability}
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white mr-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Book Appointment'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
