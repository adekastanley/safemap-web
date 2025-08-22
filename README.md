# SafeMap Web Application

A comprehensive web-based platform for community safety management with real-time alerts, SMS notifications, and interactive mapping.

## Features

- **Real-time Safety Alerts**: Create and manage safety alerts with geographic mapping
- **Interactive Map Interface**: Google Maps integration with color-coded alert categories
- **SMS Notifications**: Automatic SMS alerts to registered users within alert radius
- **Admin Dashboard**: Comprehensive admin panel for alert and user management
- **User Registration**: Interface for registering residents for SMS notifications
- **Public Map View**: Guest access to view active alerts without authentication
- **Role-based Access**: Admin and user roles with appropriate permissions

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Components**: shadcn/ui, TailwindCSS
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Maps**: Google Maps API
- **SMS**: Twilio (configurable)
- **Forms**: React Hook Form with Zod validation

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Firebase project
- Google Maps API key
- Twilio account (for SMS functionality)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Copy `.env.local.example` to `.env.local` and configure:

   ```bash
   cp .env.local.example .env.local
   ```

   Update the following variables:

   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Google Maps API
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

   # Twilio Configuration
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number
   ```

3. **Set up Firebase:**
   - Create a new Firebase project
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Configure security rules

4. **Set up Google Maps:**
   - Create a Google Cloud project
   - Enable Maps JavaScript API and Places API
   - Create an API key and restrict it appropriately

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

## Project Structure

```
safemap-web/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── auth/           # Authentication pages
│   │   ├── dashboard/      # Protected dashboard pages
│   │   └── page.tsx        # Public homepage
│   ├── components/         # Reusable components
│   │   ├── ui/             # shadcn/ui components
│   │   └── SafeMapComponent.tsx
│   ├── contexts/           # React contexts
│   │   └── AuthContext.tsx
│   ├── lib/                # Utility libraries
│   │   ├── firebase.ts     # Firebase configuration
│   │   └── alertService.ts # Alert management service
│   └── types/              # TypeScript type definitions
│       └── index.ts
├── public/                 # Static assets
└── components.json         # shadcn/ui configuration
```

## Key Features

### Alert Management
- Create alerts with title, description, category, and location
- Automatic expiry (configurable: 15 minutes production, 1 minute debug)
- Color-coded categories (theft, fire, medical, etc.)
- Geographic radius for affected area

### Map Interface
- Real-time display of active alerts
- Interactive markers with detailed info windows
- Color-coded circles showing alert radius
- Click-to-create for admin users

### SMS Notifications
- Automatic SMS to users within alert radius
- User preferences for notification categories
- Quiet hours configuration
- Delivery status tracking

## Setup Instructions

1. **Configure Firebase**: Set up authentication and Firestore
2. **Get Google Maps API**: Enable Maps JavaScript API
3. **Configure Twilio**: Set up SMS service (optional but recommended)
4. **Update environment variables**: Add your API keys and configuration
5. **Create admin user**: Set up your first admin account

## Deployment

The easiest way to deploy is using Vercel:

```bash
npm run build
```

Then deploy to Vercel or your preferred hosting platform.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License.
