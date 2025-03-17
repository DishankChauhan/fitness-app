# Accountability App

A mobile application built with React Native and Expo that helps users build better habits through accountability mechanisms and crypto incentives.

## Features

- **Challenge System**: Create and join challenges to improve habits
- **Social Accountability**: Connect with friends and compete on leaderboards
- **Token Economy**: Stake tokens on challenges and earn rewards for completion
- **Wallet Integration**: Manage your tokens with Solana blockchain integration
- **User Authentication**: Secure login and registration with Firebase
- **Profile Management**: Track your progress and achievements

## Tech Stack

- **Frontend**: React Native, Expo, TypeScript
- **State Management**: React Context API
- **Authentication**: Firebase Auth
- **Database**: Firestore
- **Blockchain**: Solana (for token management)
- **Analytics**: Firebase Analytics
- **Performance Monitoring**: Firebase Performance
- **Error Tracking**: Firebase Crashlytics

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI
- Firebase account
- Solana wallet (for development)

### Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/accountability-app.git
cd accountability-app
```

2. Install dependencies:
```
npm install
```

3. Set up environment variables:
   - Copy `.env.local` to `.env`
   - Update the Firebase configuration with your project details

4. Start the development server:
```
npm run start
```

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Register your app and get the configuration
5. Update the `.env` file with your Firebase configuration

### Solana Setup

1. Create a Solana wallet for development
2. Set up Solana devnet for testing
3. Update the Solana configuration in the app

## Project Structure

- `/app` - Main application screens and navigation
  - `/(auth)` - Authentication screens
  - `/(tabs)` - Main tab navigation screens
- `/components` - Reusable UI components
- `/constants` - Application constants and theme
- `/services` - API services and business logic
- `/types` - TypeScript type definitions
- `/utils` - Utility functions
- `/config` - Configuration files

## Testing

Run tests with:
```
npm test
```

## Deployment

### Expo Deployment

Build for production:
```
eas build --platform ios
eas build --platform android
```

Submit to stores:
```
eas submit --platform ios
eas submit --platform android
```

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.
