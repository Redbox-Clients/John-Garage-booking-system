import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Typography, 
  Button, 
  Box,
  CircularProgress,
  Alert
} from '@mui/material';

const CancelBooking = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);
  const [cancelled, setCancelled] = useState(false);
  
  const bookingId = searchParams.get('bookingId');

  const handleCancel = async () => {
    if (!bookingId) {
      setError('No booking ID provided');
      return;
    }

    setCancelling(true);
    setError(null);

    try {
      const response = await fetch('https://redboxrob.app.n8n.cloud/webhook/9497b73f-9535-4bb9-a365-521d1c94b2a0', {
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
      <Container maxWidth="md">
        <Paper elevation={4} sx={{ borderRadius: '12px', p: { xs: 2, md: 3 }, margin: 'auto', mt: 4 }}>
          <Typography variant="h5" component="h1" gutterBottom align="center" sx={{ mb: 3, fontWeight: 600, color: '#333' }}>
            Invalid Booking
          </Typography>
          <Typography variant="body1" sx={{ mb: 4, textAlign: 'center' }}>
            No booking ID provided. Please use the link from your booking confirmation email.
          </Typography>
          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              onClick={handleNewBooking}
              sx={{
                borderRadius: '10px',
                py: 1.2,
                fontSize: { xs: '1rem', md: '0.95rem' },
                boxShadow: '0 3px 8px rgba(0, 0, 0, 0.1)',
                '&:hover': { boxShadow: '0 5px 12px rgba(0, 0, 0, 0.15)' },
              }}
            >
              Make a New Booking
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Paper elevation={4} sx={{ borderRadius: '12px', p: { xs: 2, md: 3 }, margin: 'auto', mt: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom align="center" sx={{ mb: 3, fontWeight: 600, color: '#333' }}>
          {cancelled ? 'Booking Cancelled' : 'Cancel Booking'}
        </Typography>
        
        {!cancelled && (
          <Typography variant="body1" sx={{ mb: 4, textAlign: 'center' }}>
            Are you sure you want to cancel this booking? This action cannot be undone.
          </Typography>
        )}

        {cancelled && (
          <Typography variant="body1" sx={{ mb: 4, textAlign: 'center', color: '#28a745' }}>
            Your booking has been successfully cancelled.
          </Typography>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
        )}

        <Box sx={{ textAlign: 'center' }}>
          {!cancelled && (
            <Button
              variant="contained"
              onClick={handleCancel}
              disabled={cancelling}
              sx={{
                borderRadius: '10px',
                py: 1.2,
                fontSize: { xs: '1rem', md: '0.95rem' },
                boxShadow: '0 3px 8px rgba(0, 0, 0, 0.1)',
                '&:hover': { boxShadow: '0 5px 12px rgba(0, 0, 0, 0.15)' },
                mb: 2,
                backgroundColor: '#dc3545',
                '&:hover': {
                  backgroundColor: '#c82333'
                }
              }}
            >
              {cancelling ? <CircularProgress size={24} color="inherit" /> : 'Cancel Booking'}
            </Button>
          )}
          
          <Button
            variant="contained"
            onClick={handleNewBooking}
            sx={{
              borderRadius: '10px',
              py: 1.2,
              fontSize: { xs: '1rem', md: '0.95rem' },
              boxShadow: '0 3px 8px rgba(0, 0, 0, 0.1)',
              '&:hover': { boxShadow: '0 5px 12px rgba(0, 0, 0, 0.15)' },
              ml: cancelled ? 0 : 2
            }}
          >
            Make a New Booking
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default CancelBooking; 