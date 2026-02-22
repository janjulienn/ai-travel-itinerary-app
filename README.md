# AI Travel Itinerary App

A modern React Native mobile app built with Expo SDK 54 for generating AI-powered travel itineraries in the Philippines.

## 🚀 Features

- **Browse Destinations**: Explore provinces across the Philippines with beautiful cards and detailed information
- **AI-Powered Itinerary Generation**: Create personalized day-by-day travel plans using OpenAI GPT-4
- **Elderly-Friendly UX**: Large fonts, clear labels, high contrast, and simple navigation designed for all ages
- **Step-by-Step Wizard**: Easy 2-step itinerary creation process
- **Rich Itinerary Display**: Day-by-day accordion timeline with activities, times, locations, and costs
- **Place Details**: Detailed information about destinations including ratings, photos, and highlights
- **Guest & Auth Modes**: Use as guest or create an account (auth endpoints pending backend implementation)

## 🏗️ Tech Stack

- **Framework**: Expo SDK 54 + React Native 0.81
- **UI Library**: React Native Paper 5.15 (Material Design 3)
- **Navigation**: React Navigation 7 (Bottom Tabs + Native Stack)
- **State Management**: Context API + useReducer
- **HTTP Client**: Axios
- **Date Picker**: react-native-paper-dates
- **Icons**: @expo/vector-icons (MaterialCommunityIcons)
- **Language**: TypeScript 5.9

## 📁 Project Structure

```
ai-travel-itinerary-app/
├── App.tsx                          # App entry point with navigation
├── src/
│   ├── components/                  # Reusable UI components
│   │   ├── common/                  # Generic components (LoadingOverlay, ErrorCard)
│   │   ├── ActivityCard/            # Timeline activity display
│   │   ├── AuthForm/                # Login/register form
│   │   ├── GenerateWizard/          # Multi-step itinerary creation wizard
│   │   ├── ItineraryCard/           # Itinerary list item
│   │   ├── ItineraryTimeline/       # Day-by-day accordion timeline
│   │   ├── PlaceDetailModal/        # Place information modal
│   │   ├── ProvinceCard/            # Province list item
│   │   └── SocialLoginButtons/      # Google/Facebook login (placeholder)
│   │
│   ├── constants/                   # App constants and configurations
│   │   └── index.ts                 # API config, category mappings, options
│   │
│   ├── hooks/                       # Custom React hooks
│   │   ├── useItineraries.ts        # Fetch itineraries and details
│   │   └── useProvinces.ts          # Fetch provinces and details
│   │
│   ├── screens/                     # Screen components
│   │   ├── HomeScreen/              # Province browsing
│   │   ├── ProvinceDetailScreen/    # Province info + top places
│   │   ├── GenerateScreen/          # Itinerary generation wizard
│   │   ├── TripsScreen/             # User's itineraries list
│   │   ├── ItineraryDetailScreen/   # Full itinerary display
│   │   └── ProfileScreen/           # Auth and user settings
│   │
│   ├── services/api/                # API layer
│   │   ├── apiClient.ts             # Axios instance with interceptors
│   │   ├── itineraries.ts           # Itinerary endpoints
│   │   └── provinces.ts             # Province endpoints
│   │
│   ├── store/                       # Global state
│   │   └── store.tsx                # Context provider with useReducer
│   │
│   ├── theme/                       # App theming
│   │   └── index.ts                 # Material Design 3 theme customization
│   │
│   └── types/                       # TypeScript definitions
│       ├── application.ts           # App state types
│       ├── navigation.ts            # Navigation param types
│       └── dtos/                    # Data transfer objects
│           ├── itinerary.ts         # Itinerary DTOs (matches backend)
│           └── province.ts          # Province DTOs (matches backend)
```

## 🔌 Backend Integration

The app connects to the Django backend at `http://192.168.68.62:5137/api/v1`.

### API Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/provinces/` | GET | List all provinces |
| `/provinces/{slug}/` | GET | Province details with top places |
| `/itineraries/` | POST | Generate new itinerary (AI) |
| `/itineraries/` | GET | List user's itineraries |
| `/itineraries/{id}/` | GET | Get itinerary by UUID |
| `/itineraries/{id}/regenerate/` | POST | Retry failed generation |

### Backend Configuration

Update the API URL in [src/constants/index.ts](src/constants/index.ts):

```typescript
export const API_BASE_URL = 'http://192.168.68.62:5137/api/v1';
```

## 🎨 UX Design Principles

### Elderly-Friendly Features

1. **Large Fonts**: 
   - Body text: 16-18sp
   - Headings: 24-32sp
   - Labels: 16sp

2. **High Contrast**: 
   - 4.5:1 minimum contrast ratio (WCAG AA)
   - Primary color: #00897B (warm teal)

3. **Touch Targets**: 
   - Minimum 48×48dp for all interactive elements
   - Large buttons with clear labels

4. **Simple Navigation**: 
   - Bottom tab bar (always visible)
   - No hidden gestures
   - Clear back buttons

5. **Step-by-Step Process**: 
   - 2-step wizard instead of single form
   - Progress indicators
   - One question category per step

6. **Clear Feedback**: 
   - Loading states with descriptive text
   - Friendly error messages (no technical jargon)
   - Success confirmations

## 🚦 Running the App

### Development

```bash
cd ai-travel-itinerary-app

# Start Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

### Production Build

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

## 🔐 Authentication Status

The app includes **placeholder auth screens** (login/register/social login) ready for backend integration. Currently:

- ✅ UI components complete
- ✅ Form validation working
- ✅ Guest mode functional
- ⏳ Backend auth endpoints not implemented
- ⏳ Social login (Google/Facebook) pending

When backend auth is added:
1. Update [src/components/AuthForm/index.tsx](src/components/AuthForm/index.tsx) to call real API
2. Implement token handling in store
3. Add social login SDK integration

## 📊 Itinerary Generation Flow

1. **User Input** (GenerateWizard):
   - Province selection
   - Date range (max 14 days)
   - Group type & size
   - Budget, pace, interests (optional)
   - Special notes (optional)

2. **API Call** (90s timeout):
   - POST to `/api/v1/itineraries/`
   - Backend fetches province places
   - OpenAI GPT-4 generates itinerary
   - Returns full day-by-day schedule

3. **Result Display** (ItineraryDetailScreen):
   - Title & summary
   - Trip stats (days, budget, pace, group)
   - Accordion timeline (one day at a time)
   - Activities with time, location, cost, description
   - Place detail modals with photos & ratings

## 🎯 Key Components

### GenerateWizard

Multi-step form with:
- Step 1: Destination + Dates
- Step 2: Trip preferences
- Full-screen loading overlay during generation

### ItineraryTimeline

Day-by-day accordion display:
- Expandable/collapsible days
- ActivityCard for each activity
- Category icons & colors
- Time ranges & durations
- Cost estimates
- Place detail links

### ActivityCard

Rich activity display:
- Category indicator with icon
- Time range & duration badge
- Location with address
- Cost estimate
- Expandable description
- Notes (tips/recommendations)
- Link to place details

## 🐛 Known Limitations

1. **Anonymous Mode**: Itineraries not synced across devices for guest users
2. **Auth Placeholder**: Login/register don't call backend (endpoints don't exist yet)
3. **No Offline**: Requires network connection for all features
4. **Single Language**: English only (no i18n)

## 🔮 Future Enhancements

- [ ] Add authentication backend integration
- [ ] Implement social login (Google, Facebook)
- [ ] Add offline mode with local storage
- [ ] Share itineraries via link or QR code
- [ ] Export to PDF
- [ ] Add maps integration (view route, get directions)
- [ ] Push notifications for trip reminders
- [ ] Multi-language support
- [ ] Dark mode

## 📝 License

This project was created for AI Travel Itinerary application.

## 🙋 Support

For backend API issues, check the Django project documentation.
For frontend issues, create an issue in the repository.
