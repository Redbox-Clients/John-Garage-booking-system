import React, { useState, useEffect } from 'react';
import { TextField, Button, Box, Typography, Container, Paper, Stepper, Step, StepLabel, Grid, CircularProgress, Alert } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import './BookingForm.css';

dayjs.extend(utc);
dayjs.extend(timezone);

const MAX_BOOKINGS_PER_HOUR_SLOT = 2;
const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'
];

const IRISH_BANK_HOLIDAYS = [
  // 2024
  '2024-01-01', // New Year's Day
  '2024-03-18', // St. Patrick's Day (observed)
  '2024-04-01', // Easter Monday
  '2024-05-06', // May Bank Holiday
  '2024-06-03', // June Bank Holiday
  '2024-08-05', // August Bank Holiday
  '2024-10-28', // October Bank Holiday
  '2024-12-25', // Christmas Day
  '2024-12-26', // St. Stephen's Day
  // 2025
  '2025-01-01', // New Year's Day
  '2025-03-17', // St. Patrick's Day
  '2025-04-21', // Easter Monday
  '2025-05-05', // May Bank Holiday
  '2025-06-02', // June Bank Holiday
  '2025-08-04', // August Bank Holiday
  '2025-10-27', // October Bank Holiday
  '2025-12-25', // Christmas Day
  '2025-12-26', // St. Stephen's Day
];

const steps = ['Personal Info', 'Date & Time', 'Service Details', 'Confirmation'];

const BookingForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    reg1: '', // First part of registration (2 digits)
    reg2: '', // Second part of registration (3 chars)
    reg3: '', // Third part of registration (8 digits)
    make: '',
    model: '',
    date: null,
    time: '',
    service: '',
    notes: ''
  });

  const [activeStep, setActiveStep] = useState(0);
  const [bookings, setBookings] = useState([]); // This state is for internal bookings made within the form session
  const [availableSlots, setAvailableSlots] = useState({}); // Stores data from webhook
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [errorSlots, setErrorSlots] = useState(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);

  useEffect(() => {
    if (activeStep === 1) { // When Date & Time page is active
      const fetchAvailableSlots = async () => {
        setLoadingSlots(true);
        setErrorSlots(null);
        try {
          const response = await fetch('https://redboxrob.app.n8n.cloud/webhook/a807a240-f285-4d9e-969b-a3107955c178');
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          // Assuming data is an array like [{ "2025-06-08": {...} }]
          // Transform it into a more easily accessible object for lookup
          const transformedData = {};
          data.forEach(item => {
            const date = Object.keys(item)[0];
            transformedData[date] = item[date];
          });
          setAvailableSlots(transformedData);
        } catch (error) {
          console.error("Failed to fetch available slots:", error);
          setErrorSlots("Failed to load available slots. Please try again.");
        } finally {
          setLoadingSlots(false);
        }
      };
      fetchAvailableSlots();
    }
  }, [activeStep]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleReg1Change = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 3);
    setFormData(prev => ({ ...prev, reg1: value }));
  };

  const handleReg2Change = (e) => {
    const value = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 3);
    setFormData(prev => ({ ...prev, reg2: value }));
  };

  const handleReg3Change = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 8);
    setFormData(prev => ({ ...prev, reg3: value }));
  };

  const handleDateChange = (newDate) => {
    setFormData(prev => ({
      ...prev,
      date: newDate,
      time: '' // Reset time when date changes
    }));
  };

  const handleTimeSelect = (time) => {
    setFormData(prev => ({
      ...prev,
      time
    }));
  };

  // Check if a date is a weekend or bank holiday
  const isWeekendOrHoliday = (date) => {
    const dayOfWeek = date.day(); // 0 is Sunday, 6 is Saturday
    const dateStr = date.format('YYYY-MM-DD');
    return dayOfWeek === 0 || dayOfWeek === 6 || IRISH_BANK_HOLIDAYS.includes(dateStr);
  };

  // Determines if a date should be disabled in the calendar
  const isDateDisabled = (date) => {
    const today = dayjs().startOf('day');
    const maxDate = today.add(30, 'day');
    
    // Disable if outside allowed range, if it's today, or if it's a weekend/holiday
    if (date.isBefore(today, 'day') || 
        date.isSame(today, 'day') || 
        date.isAfter(maxDate, 'day') ||
        isWeekendOrHoliday(date)) {
      return true;
    }

    const dateStr = date.format('YYYY-MM-DD');
    // If there's no data for this date, assume it's fully available
    if (!availableSlots[dateStr]) {
        return false; 
    }

    // Check if all slots for this date are fully booked (>= MAX_BOOKINGS_PER_HOUR_SLOT)
    const allSlotsFullyBooked = TIME_SLOTS.every(time => {
        const hourKey = time.slice(0, 2); // Normalize time to match webhook data key format
        const currentBookingsForSlot = availableSlots[dateStr]?.[hourKey] || 0;
        return currentBookingsForSlot >= MAX_BOOKINGS_PER_HOUR_SLOT;
    });

    return allSlotsFullyBooked;
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmittingBooking(true);
    setSubmissionError(null);

    // Before submitting, double-check if the selected slot is still bookable
    if (!isTimeSlotBookable(formData.date, formData.time)) {
      setSubmissionError("The selected time slot is no longer available. Please choose another.");
      setSubmittingBooking(false);
      return; 
    }

    const selectedDate = formData.date; 
    const selectedTime = formData.time; 
    const targetTimezone = 'Europe/Dublin';

    // Construct start date/time in the desired display timezone (Europe/Dublin)
    const startTimeStringInDublin = `${selectedDate.format('YYYY-MM-DD')}T${selectedTime}:00`;
    const startDateTimeInDublin = dayjs.tz(startTimeStringInDublin, 'YYYY-MM-DDTHH:mm', targetTimezone);
    const formattedStartDateTimeForWebhook = startDateTimeInDublin.utc().toISOString();

    // Calculate end date/time (1 hour after start) in the desired display timezone
    const endDateTimeInDublin = startDateTimeInDublin.add(1, 'hour');
    const formattedEndDateTimeForWebhook = endDateTimeInDublin.utc().toISOString();

    const bookingData = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      reg: `${formData.reg1}${formData.reg2}${formData.reg3}`, // Concatenated registration
      make: formData.make,
      model: formData.model,
      start_date: formattedStartDateTimeForWebhook, // New field for start
      end_date: formattedEndDateTimeForWebhook,     // New field for end
      booking_date: selectedDate.format('YYYY-MM-DD'), // Add the booking date
      created_at: dayjs().format('YYYY-MM-DD HH:mm:ss'), // Add creation timestamp
      service: formData.service,
      notes: formData.notes
    };

    try {
      const response = await fetch('https://redboxrob.app.n8n.cloud/webhook/797f3300-663d-42bb-9337-92790b5d26a8', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        throw new Error(`Booking failed with status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Booking successful:", result);

      // Add to internal session bookings (optional, if you want to track locally)
      setBookings(prev => [...prev, { ...bookingData, id: Date.now() }]);

      // IMPORTANT: Update availableSlots locally to reflect the new booking
      setAvailableSlots(prevSlots => {
        const dateStr = selectedDate.format('YYYY-MM-DD');
        const updatedSlotsForDate = { ...prevSlots[dateStr] };
        const hourKey = selectedTime.slice(0, 2); // Normalize time for updating
        updatedSlotsForDate[hourKey] = (updatedSlotsForDate[hourKey] || 0) + 1;
        return {
          ...prevSlots,
          [dateStr]: updatedSlotsForDate,
        };
      });

      setActiveStep(steps.length - 1); // Move to the last step (Confirmation)

    } catch (error) {
      console.error("Error submitting booking:", error);
      setSubmissionError("Failed to submit booking. Please try again.");
    } finally {
      setSubmittingBooking(false);
    }
  };

  const handleStartNewBooking = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      date: null,
      time: '',
      service: '',
      notes: ''
    });
    setActiveStep(0);
    setSubmissionError(null); // Clear any previous submission errors
  };

  // Determines if a time slot is generally bookable (less than MAX_BOOKINGS_PER_HOUR_SLOT)
  const isTimeSlotBookable = (date, time) => {
    if (!date) return false; 
    const dateStr = date.format('YYYY-MM-DD');
    const hourKey = time.slice(0, 2); // Normalize time to match webhook data key format
    const currentBookingsForSlot = availableSlots[dateStr]?.[hourKey] || 0;
    // A slot is bookable if its current bookings are strictly less than the max allowed
    return currentBookingsForSlot < MAX_BOOKINGS_PER_HOUR_SLOT;
  };

  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ p: { xs: 2, md: 2.5 } }} className="form-step">
            <Typography variant="h6" gutterBottom sx={{ mb: { xs: 2, md: 2.5 }, fontWeight: 500 }}>Personal Information</Typography>
            <TextField
              fullWidth
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              margin="normal"
              variant="outlined"
              size="small"
              sx={{ 
                mb: { xs: '16px', md: '20px' },
                '& .MuiOutlinedInput-root': { 
                  borderRadius: '10px',
                  '& input:-webkit-autofill': {
                    WebkitBoxShadow: '0 0 0 100px white inset',
                    WebkitTextFillColor: '#000000',
                    transition: 'background-color 5000s ease-in-out 0s'
                  }
                },
                display: 'inline-flex',
                flexDirection: 'column',
                position: 'relative',
                minWidth: 0,
                padding: 0,
                margin: 0,
                border: 0,
                verticalAlign: 'top',
                width: '100%'
              }}
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              margin="normal"
              variant="outlined"
              size="small"
              sx={{ 
                mb: { xs: '16px', md: '20px' },
                '& .MuiOutlinedInput-root': { 
                  borderRadius: '10px',
                  '& input:-webkit-autofill': {
                    WebkitBoxShadow: '0 0 0 100px white inset',
                    WebkitTextFillColor: '#000000',
                    transition: 'background-color 5000s ease-in-out 0s'
                  }
                },
                display: 'inline-flex',
                flexDirection: 'column',
                position: 'relative',
                minWidth: 0,
                padding: 0,
                margin: 0,
                border: 0,
                verticalAlign: 'top',
                width: '100%'
              }}
            />
            <TextField
              fullWidth
              label="Phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required
              margin="normal"
              variant="outlined"
              size="small"
              sx={{ 
                mb: { xs: '16px', md: '20px' },
                '& .MuiOutlinedInput-root': { 
                  borderRadius: '10px',
                  '& input:-webkit-autofill': {
                    WebkitBoxShadow: '0 0 0 100px white inset',
                    WebkitTextFillColor: '#000000',
                    transition: 'background-color 5000s ease-in-out 0s'
                  }
                },
                display: 'inline-flex',
                flexDirection: 'column',
                position: 'relative',
                minWidth: 0,
                padding: 0,
                margin: 0,
                border: 0,
                verticalAlign: 'top',
                width: '100%'
              }}
            />

            <Grid container spacing={2} sx={{ mb: { xs: '16px', md: '20px' } }}>
              <Grid item xs={3}>
                <TextField
                  fullWidth
                  label="Reg"
                  name="reg1"
                  value={formData.reg1}
                  onChange={handleReg1Change}
                  inputProps={{ maxLength: 3 }}
                  required
                  variant="outlined"
                  size="small"
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      borderRadius: '10px',
                      '& input:-webkit-autofill': {
                        WebkitBoxShadow: '0 0 0 100px white inset',
                        WebkitTextFillColor: '#000000',
                        transition: 'background-color 5000s ease-in-out 0s'
                      }
                    },
                    display: 'inline-flex',
                    flexDirection: 'column',
                    position: 'relative',
                    minWidth: 0,
                    padding: 0,
                    margin: 0,
                    border: 0,
                    verticalAlign: 'top',
                    width: '100%'
                  }}
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Reg"
                  name="reg2"
                  value={formData.reg2}
                  onChange={handleReg2Change}
                  inputProps={{ maxLength: 3 }}
                  required
                  variant="outlined"
                  size="small"
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      borderRadius: '10px',
                      '& input:-webkit-autofill': {
                        WebkitBoxShadow: '0 0 0 100px white inset',
                        WebkitTextFillColor: '#000000',
                        transition: 'background-color 5000s ease-in-out 0s'
                      }
                    },
                    display: 'inline-flex',
                    flexDirection: 'column',
                    position: 'relative',
                    minWidth: 0,
                    padding: 0,
                    margin: 0,
                    border: 0,
                    verticalAlign: 'top',
                    width: '100%'
                  }}
                />
              </Grid>
              <Grid item xs={5}>
                <TextField
                  fullWidth
                  label="Reg"
                  name="reg3"
                  value={formData.reg3}
                  onChange={handleReg3Change}
                  inputProps={{ maxLength: 8 }}
                  required
                  variant="outlined"
                  size="small"
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                      borderRadius: '10px',
                      '& input:-webkit-autofill': {
                        WebkitBoxShadow: '0 0 0 100px white inset',
                        WebkitTextFillColor: '#000000',
                        transition: 'background-color 5000s ease-in-out 0s'
                      }
                    },
                    display: 'inline-flex',
                    flexDirection: 'column',
                    position: 'relative',
                    minWidth: 0,
                    padding: 0,
                    margin: 0,
                    border: 0,
                    verticalAlign: 'top',
                    width: '100%'
                  }}
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Car Make"
              name="make"
              value={formData.make}
              onChange={handleInputChange}
              required
              margin="normal"
              variant="outlined"
              size="small"
              sx={{ 
                mb: { xs: '16px', md: '20px' },
                '& .MuiOutlinedInput-root': { 
                  borderRadius: '10px',
                  '& input:-webkit-autofill': {
                    WebkitBoxShadow: '0 0 0 100px white inset',
                    WebkitTextFillColor: '#000000',
                    transition: 'background-color 5000s ease-in-out 0s'
                  }
                },
                display: 'inline-flex',
                flexDirection: 'column',
                position: 'relative',
                minWidth: 0,
                padding: 0,
                margin: 0,
                border: 0,
                verticalAlign: 'top',
                width: '100%'
              }}
            />
            <TextField
              fullWidth
              label="Car Model"
              name="model"
              value={formData.model}
              onChange={handleInputChange}
              required
              margin="normal"
              variant="outlined"
              size="small"
              sx={{ 
                mb: { xs: '16px', md: '20px' },
                '& .MuiOutlinedInput-root': { 
                  borderRadius: '10px',
                  '& input:-webkit-autofill': {
                    WebkitBoxShadow: '0 0 0 100px white inset',
                    WebkitTextFillColor: '#000000',
                    transition: 'background-color 5000s ease-in-out 0s'
                  }
                },
                display: 'inline-flex',
                flexDirection: 'column',
                position: 'relative',
                minWidth: 0,
                padding: 0,
                margin: 0,
                border: 0,
                verticalAlign: 'top',
                width: '100%'
              }}
            />

            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!formData.name || !formData.email || !formData.phone ||
                        !formData.reg1 || !formData.reg2 || !formData.reg3 ||
                        !formData.make || !formData.model}
              fullWidth
              sx={{
                mt: { xs: 2, md: 2.5 },
                borderRadius: '10px',
                py: 1.2,
                fontSize: { xs: '1rem', md: '0.95rem' },
                boxShadow: '0 3px 8px rgba(0, 0, 0, 0.1)',
                '&:hover': { boxShadow: '0 5px 12px rgba(0, 0, 0, 0.15)' }
              }}
            >
              Next
            </Button>
          </Box>
        );
      case 1:
        return (
          <Box sx={{ p: { xs: 2, md: 2.5 } }} className="form-step">
            <Typography variant="h6" gutterBottom sx={{ mb: { xs: 2, md: 2.5 }, fontWeight: 500 }}>Select Date and Time</Typography>
            
            {loadingSlots && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {errorSlots && (
              <Typography color="error" align="center" sx={{ my: 4 }}>{errorSlots}</Typography>
            )}

            {!loadingSlots && !errorSlots && (
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Select Date"
                  value={formData.date}
                  onChange={handleDateChange}
                  shouldDisableDate={isDateDisabled}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      margin: "normal",
                      variant: "outlined",
                      size: "small",
                      sx: { 
                        mb: { xs: '16px', md: '20px' }, 
                        '& .MuiOutlinedInput-root': { 
                          borderRadius: '10px',
                          cursor: 'pointer',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(0, 0, 0, 0.23)'
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(0, 0, 0, 0.23)'
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(0, 0, 0, 0.23)'
                          }
                        },
                        '& .MuiInputAdornment-root': {
                          '& .MuiButtonBase-root': {
                            padding: '4px',
                            '&:hover': {
                              backgroundColor: 'transparent'
                            },
                            '&:focus': {
                              backgroundColor: 'transparent'
                            }
                          }
                        }
                      },
                      inputProps: {
                        readOnly: true,
                        style: { cursor: 'pointer' }
                      }
                    },
                  }}
                  sx={{ width: '100%' }}
                />
              </LocalizationProvider>
            )}
            
            {formData.date && !loadingSlots && !errorSlots && (
              <Box className="time-slots" sx={{ mt: { xs: 2, md: 2.5 }, mb: { xs: 2, md: 2.5 } }}>
                <Typography variant="subtitle2" sx={{ mb: { xs: 1.5, md: 2 }, fontWeight: 500 }}>Available Time:</Typography>
                <Grid container spacing={{ xs: 0.5, md: 1.5 }} justifyContent="flex-start">
                  {TIME_SLOTS.map((time) => {
                    const dateStr = formData.date ? formData.date.format('YYYY-MM-DD') : null;
                    const hourKey = time.slice(0, 2); // Normalize time to match webhook data key format
                    const currentBookingsForSlot = dateStr && availableSlots[dateStr] ? availableSlots[dateStr][hourKey] || 0 : 0;
                    
                    // Determine if the slot is fully booked (should be disabled)
                    const isFullyBooked = currentBookingsForSlot >= MAX_BOOKINGS_PER_HOUR_SLOT;
                    
                    // Determine if the slot has limited availability (should be greyed out, but still clickable if not fully booked)
                    // Only grey out if current bookings are greater than 1
                    const isGreyedOut = currentBookingsForSlot > 1;

                    return (
                      <Grid item key={time} xs={4} sm={3} md={2.4}> {/* Responsive column sizing */}
                        <Button
                          variant={formData.time === time ? "contained" : "outlined"}
                          onClick={() => handleTimeSelect(time)}
                          disabled={isFullyBooked} // Directly use isFullyBooked for disabling
                          fullWidth
                          sx={{
                            borderRadius: '6px',
                            py: { xs: 0.8, md: 1 },
                            fontSize: { xs: '0.75rem', md: '0.85rem' },
                            backgroundColor: isGreyedOut ? '#f0f0f0' : (formData.time === time ? '#007bff' : 'white'),
                            color: isGreyedOut ? '#888' : (formData.time === time ? 'white' : '#007bff'),
                            borderColor: isGreyedOut ? '#e0e0e0' : '#007bff',
                            boxShadow: isGreyedOut ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                            '&:hover': {
                              backgroundColor: isGreyedOut ? '#f0f0f0' : (formData.time === time ? '#0056b3' : '#e6f2ff'),
                              borderColor: isGreyedOut ? '#e0e0e0' : '#0056b3',
                              boxShadow: isGreyedOut ? 'none' : '0 2px 5px rgba(0, 0, 0, 0.1)',
                            },
                            '&.Mui-disabled': {
                              backgroundColor: '#f0f0f0',
                              color: '#cccccc',
                              borderColor: '#e0e0e0',
                              boxShadow: 'none',
                              pointerEvents: 'none', // Crucial to prevent clicks
                            },
                          }}
                        >
                          {time}
                        </Button>
                      </Grid>
                    );
                  })}
                </Grid>
              </Box>
            )}
            
            <Box className="step-buttons" sx={{ mt: { xs: 2, md: 2.5 } }}>
              <Button
                variant="outlined"
                onClick={handleBack}
                sx={{
                  borderRadius: '10px',
                  py: 1.2,
                  fontSize: { xs: '1rem', md: '0.95rem' },
                  mr: { xs: 0, md: 2 },
                  mb: { xs: 2, md: 0 },
                  width: { xs: '100%', md: 'auto' }
                }}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!formData.date || !formData.time || loadingSlots || errorSlots}
                sx={{
                  borderRadius: '10px',
                  py: 1.2,
                  fontSize: { xs: '1rem', md: '0.95rem' },
                  boxShadow: '0 3px 8px rgba(0, 0, 0, 0.1)',
                  '&:hover': { boxShadow: '0 5px 12px rgba(0, 0, 0, 0.15)' },
                  width: { xs: '100%', md: 'auto' }
                }}
              >
                Next
              </Button>
            </Box>
          </Box>
        );
      case 2:
        return (
          <Box sx={{ p: { xs: 2, md: 2.5 } }} className="form-step">
            <Typography variant="h6" gutterBottom sx={{ mb: { xs: 2, md: 2.5 }, fontWeight: 500 }}>Service Details</Typography>
            <TextField
              fullWidth
              label="Service Type"
              name="service"
              value={formData.service}
              onChange={handleInputChange}
              required
              margin="normal"
              variant="outlined"
              size="small"
              sx={{ mb: { xs: 2, md: 2.5 }, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
            <TextField
              fullWidth
              label="Additional Notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              multiline
              rows={3} /* Slightly fewer rows for compactness */
              margin="normal"
              variant="outlined"
              size="small"
              sx={{ mb: { xs: 2, md: 2.5 }, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
            <Box className="step-buttons" sx={{ mt: { xs: 2, md: 2.5 } }}>
              <Button
                variant="outlined"
                onClick={handleBack}
                sx={{
                  borderRadius: '10px',
                  py: 1.2,
                  fontSize: { xs: '1rem', md: '0.95rem' },
                  mr: { xs: 0, md: 2 },
                  mb: { xs: 2, md: 0 },
                  width: { xs: '100%', md: 'auto' }
                }}
              >
                Back
              </Button>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={!formData.service || submittingBooking}
                sx={{
                  borderRadius: '10px',
                  py: 1.2,
                  fontSize: { xs: '1rem', md: '0.95rem' },
                  boxShadow: '0 3px 8px rgba(0, 0, 0, 0.1)',
                  '&:hover': { boxShadow: '0 5px 12px rgba(0, 0, 0, 0.15)' },
                  width: { xs: '100%', md: 'auto' }
                }}
              >
                {submittingBooking ? <CircularProgress size={24} color="inherit" /> : 'Submit Booking'}
              </Button>
            </Box>
            {submissionError && (
              <Alert severity="error" sx={{ mt: 3 }}>{submissionError}</Alert>
            )}
          </Box>
        );
      case 3:
        return (
          <Box sx={{ p: { xs: 2, md: 2.5 } }} className="form-step" textAlign="center">
            <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 600, color: '#28a745' }}>
              Booking Confirmed!
            </Typography>
            <Typography variant="body1" sx={{ mb: 4 }}>
              Thank you for your booking. A confirmation email has been sent to {formData.email}.
            </Typography>
            <Button
              variant="contained"
              onClick={handleStartNewBooking}
              sx={{
                borderRadius: '10px',
                py: 1.2,
                fontSize: { xs: '1rem', md: '0.95rem' },
                boxShadow: '0 3px 8px rgba(0, 0, 0, 0.1)',
                '&:hover': { boxShadow: '0 5px 12px rgba(0, 0, 0, 0.15)' },
              }}
            >
              Start New Booking
            </Button>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={4} className="booking-form" sx={{ borderRadius: '12px', p: { xs: 2, md: 3 }, margin: 'auto' }}>
        <Typography variant="h5" component="h1" gutterBottom align="center" sx={{ mb: { xs: 3, md: 3.5 }, fontWeight: 600, color: '#333' }}>
          Garage Booking
        </Typography>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: { xs: 3, md: 3.5 } }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel StepIconProps={{ sx: { color: '#007bff', '&.Mui-active': { color: '#0056b3' }, '&.Mui-completed': { color: '#007bff' } } }}>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        {renderStepContent(activeStep)}
      </Paper>
    </Container>
  );
};

export default BookingForm; 