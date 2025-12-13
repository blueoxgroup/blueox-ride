# Blue Ox - Carpooling for Uganda

A mobile-first Progressive Web App (PWA) for carpooling in Uganda and East Africa.

## Features

- **Find Rides**: Search for available rides by origin, destination, and date
- **Offer Rides**: Drivers can list their journeys and set prices
- **Book Seats**: Passengers pay 10% booking fee via mobile money
- **Contact Drivers**: Get driver contact after payment confirmation
- **Rate & Review**: Leave feedback after completed rides

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Auth, PostgreSQL, Edge Functions, Storage)
- **Payments**: Pandora Mobile Money API
- **Maps**: Google Maps (Places Autocomplete)

## Payment Flow

1. Driver sets the full ride price
2. Passenger pays **10% booking fee** via mobile money to reserve seat
3. Blue Ox keeps the 10% as platform fee
4. Passenger pays remaining **90% in cash** to driver after ride

### Cancellation Policy

- **Driver cancels**: Full refund of 10% to passenger
- **Passenger cancels > 1 hour before**: Full refund of 10% to passenger
- **Passenger cancels ≤ 1 hour before**: 10% goes to driver

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/blueoxgroup/blueox-ride.git
cd blueox-ride

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development server
npm run dev
```

### Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Database Setup

Run the SQL schema in `supabase/schema.sql` in your Supabase dashboard.

## Edge Functions

Deploy the Edge Functions in `supabase/functions/`:

- `initiate-payment`: Initiates mobile money payment
- `pandora-webhook`: Handles payment notifications
- `process-refund`: Processes refunds on cancellation

### Pandora Webhook URL

Configure this URL in your Pandora dashboard:
```
https://zwuoewhxqndmutbfyzka.supabase.co/functions/v1/pandora-webhook
```

## Deployment

### Vercel

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

## Project Structure

```
src/
├── components/       # Reusable UI components
│   └── ui/          # shadcn/ui components
├── contexts/        # React contexts (Auth)
├── hooks/           # Custom hooks
├── lib/             # Utilities (Supabase client, helpers)
├── pages/           # Page components
├── services/        # API service functions
└── types/           # TypeScript type definitions

supabase/
├── functions/       # Edge Functions
└── schema.sql       # Database schema
```

## TODOs for Future Scaling

- [ ] Add admin dashboard
- [ ] Implement email notifications
- [ ] Add SMS notifications via Pandora
- [ ] Implement recurring rides
- [ ] Add ride sharing preferences (music, smoking, etc.)
- [ ] Implement price suggestions based on distance
- [ ] Add multi-language support (Swahili, Luganda)
- [ ] Implement live chat between driver and passenger
- [ ] Add vehicle verification for drivers
- [ ] Implement driver earnings dashboard

## License

Private - All rights reserved
