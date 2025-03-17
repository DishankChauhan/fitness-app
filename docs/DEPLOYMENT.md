# Deployment Guide

This guide covers the deployment process for the Accountability App to both development and production environments.

## Prerequisites

- Node.js 16 or higher
- Firebase CLI (`npm install -g firebase-tools`)
- Expo CLI (`npm install -g expo-cli`)
- Apple Developer Account (for iOS deployment)
- Google Play Developer Account (for Android deployment)
- Access to Firebase Console
- (Optional) Solana CLI for blockchain features

## Environment Setup

1. Configure environment variables:
   ```bash
   # Development
   cp .env.example .env.development
   
   # Production
   cp .env.example .env.production
   ```

   Update the following variables in each file:
   ```
   FIREBASE_API_KEY=your_api_key
   FIREBASE_AUTH_DOMAIN=your_auth_domain
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_STORAGE_BUCKET=your_storage_bucket
   FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   FIREBASE_APP_ID=your_app_id
   FIREBASE_MEASUREMENT_ID=your_measurement_id
   
   FITBIT_CLIENT_ID=your_fitbit_client_id
   FITBIT_CLIENT_SECRET=your_fitbit_client_secret
   
   ENABLE_CRASHLYTICS=true
   ENABLE_SOCIAL_FEATURES=true
   ```

## Firebase Setup

1. Create Firebase projects for development and production:
   ```bash
   # Login to Firebase
   firebase login
   
   # Initialize Firebase
   firebase init
   ```

2. Enable required Firebase services:
   - Authentication
   - Firestore
   - Cloud Functions
   - Crashlytics
   - Performance Monitoring

3. Deploy Firebase configuration:
   ```bash
   # Deploy to development
   firebase use development
   firebase deploy
   
   # Deploy to production
   firebase use production
   firebase deploy
   ```

## Mobile App Deployment

### iOS Deployment

1. Configure iOS credentials:
   ```bash
   expo credentials:manager
   ```

2. Build iOS app:
   ```bash
   # Development
   expo build:ios --config app.config.dev.js
   
   # Production
   expo build:ios --config app.config.prod.js
   ```

3. Submit to App Store:
   ```bash
   expo upload:ios
   ```

### Android Deployment

1. Configure Android credentials:
   ```bash
   expo credentials:manager
   ```

2. Build Android app:
   ```bash
   # Development
   expo build:android --config app.config.dev.js
   
   # Production
   expo build:android --config app.config.prod.js
   ```

3. Submit to Play Store:
   ```bash
   expo upload:android
   ```

## Health Integration Setup

### Apple Health

1. Configure capabilities in Xcode:
   - Enable HealthKit
   - Add required privacy descriptions

2. Update Info.plist:
   ```xml
   <key>NSHealthShareUsageDescription</key>
   <string>Read health data for challenges</string>
   <key>NSHealthUpdateUsageDescription</key>
   <string>Update health data for challenges</string>
   ```

### Google Fit

1. Configure Google Cloud Console:
   - Enable Fitness API
   - Create OAuth credentials
   - Add SHA-1 fingerprint

2. Update Android Manifest:
   ```xml
   <uses-permission android:name="android.permission.ACTIVITY_RECOGNITION"/>
   ```

### Fitbit

1. Register app in Fitbit Developer Console:
   - Configure OAuth 2.0
   - Add callback URLs
   - Generate client credentials

2. Update configuration:
   ```typescript
   // config/fitbit.ts
   export const fitbitConfig = {
     clientId: process.env.FITBIT_CLIENT_ID,
     clientSecret: process.env.FITBIT_CLIENT_SECRET,
     redirectUri: 'your-app-scheme://fitbit-auth'
   };
   ```

## Performance Optimization

1. Enable caching:
   ```typescript
   // config/firebase.ts
   enablePersistence({
     synchronizeTabs: true,
     cacheSizeBytes: CACHE_SIZE_UNLIMITED
   });
   ```

2. Configure offline persistence:
   ```typescript
   // config/firebase.ts
   enableIndexedDbPersistence(firestore, {
     forceOwnership: true
   });
   ```

3. Enable performance monitoring:
   ```typescript
   // config/firebase.ts
   if (!isTestEnvironment) {
     const perf = getPerformance(app);
     perf.instrumentationEnabled = true;
     perf.dataCollectionEnabled = true;
   }
   ```

## Security Considerations

1. Configure Firebase Security Rules:
   ```javascript
   // firestore.rules
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // User data
       match /users/{userId} {
         allow read: if request.auth != null;
         allow write: if request.auth.uid == userId;
       }
       
       // Challenges
       match /challenges/{challengeId} {
         allow read: if true;
         allow write: if request.auth != null;
       }
       
       // Groups
       match /groups/{groupId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && 
           (resource == null || resource.data.ownerId == request.auth.uid);
       }
     }
   }
   ```

2. Enable App Check:
   ```typescript
   // config/firebase.ts
   const appCheck = initializeAppCheck(app, {
     provider: new ReCaptchaV3Provider('your-site-key'),
     isTokenAutoRefreshEnabled: true
   });
   ```

## Monitoring and Analytics

1. Configure Crashlytics:
   ```typescript
   // config/firebase.ts
   if (!isTestEnvironment) {
     crashlytics().setCrashlyticsCollectionEnabled(true);
     crashlytics().setAttribute('environment', process.env.NODE_ENV);
   }
   ```

2. Set up custom analytics events:
   ```typescript
   // services/analytics.ts
   export const logChallengeCreated = (challengeType: string) => {
     analytics().logEvent('challenge_created', {
       challenge_type: challengeType,
       timestamp: Date.now()
     });
   };
   ```

## Troubleshooting

Common deployment issues and solutions:

1. Firebase Authentication Issues:
   - Verify SHA-1 fingerprint in Firebase Console
   - Check OAuth configuration
   - Validate domain verification

2. Health Integration Issues:
   - Verify proper permissions setup
   - Check API key configuration
   - Validate OAuth redirect URIs

3. Performance Issues:
   - Enable network request caching
   - Implement lazy loading
   - Optimize image assets

4. Build Issues:
   - Clear build cache: `expo clean`
   - Update dependencies
   - Verify environment variables

## Maintenance

Regular maintenance tasks:

1. Update dependencies:
   ```bash
   npm outdated
   npm update
   ```

2. Monitor Firebase quotas:
   - Check Firestore usage
   - Review Authentication limits
   - Monitor storage usage

3. Update security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

4. Backup data:
   ```bash
   firebase firestore:export backup
   ``` 