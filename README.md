# John's Garage Booking System

A modern, user-friendly booking system for John's Garage, built with React and Material-UI.

## Features

- Multi-step booking form
- Real-time availability checking
- Date and time slot selection
- Vehicle registration input
- Service type selection
- Automatic bank holiday and weekend blocking
- Responsive design for all devices

## Tech Stack

- React
- Vite
- Material-UI
- Day.js
- Tailwind CSS

## Setup

1. Clone the repository:
```bash
git clone https://github.com/Redbox-Clients/John-Garage-booking-system.git
cd John-Garage-booking-system
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: John's Garage Booking System"

# Add the remote repository
git remote add origin https://github.com/Redbox-Clients/John-Garage-booking-system.git

# Push to main branch
git push -u origin master

## Environment Variables

The application uses the following webhook URLs:
- Available slots: `https://redboxrob.app.n8n.cloud/webhook/a807a240-f285-4d9e-969b-a3107955c178`
- Booking submission: `https://redboxrob.app.n8n.cloud/webhook/797f3300-663d-42bb-9337-92790b5d26a8`

## Deployment

The application can be deployed to any static hosting service. For production deployment:

1. Build the application:
```bash
npm run build
```

2. Deploy the contents of the `dist` directory to your hosting service.

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.
