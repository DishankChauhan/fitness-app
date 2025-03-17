# Accountability App

A mobile application that helps users stay accountable for their health and fitness goals through social challenges and financial incentives.

## Features

- Health tracking integration (Apple Health, Google Fit, Fitbit)
- Challenge creation and participation
- Financial staking and rewards
- Social interactions and group challenges
- Achievement system
- Real-time progress tracking

## Prerequisites

- Node.js 16 or higher
- React Native development environment
- Firebase account
- (Optional) Solana development environment for financial features

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/accountability-app.git
   cd accountability-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration values:
   - Firebase configuration
   - Health API keys
   - Solana configuration (if using)

4. Configure Firebase:
   - Create a new Firebase project
   - Enable Authentication, Firestore, and Crashlytics
   - Download the configuration file and update `config/firebase.ts`

5. Configure health integrations:
   - Set up Apple Health capabilities in Xcode
   - Configure Google Fit API in Google Cloud Console
   - Set up Fitbit Developer account and API access

6. Run the development server:
   ```bash
   npm start
   ```

7. Run on your device:
   ```bash
   # iOS
   npm run ios
   
   # Android
   npm run android
   ```

## API Documentation

### Authentication Service
```typescript
// Sign up a new user
signUp(email: string, password: string, displayName: string): Promise<User>

// Sign in an existing user
signIn(email: string, password: string): Promise<User>

// Sign out the current user
signOut(): Promise<void>

// Get the current authenticated user
getCurrentUser(): Promise<User | null>
```

### Health Service
```typescript
// Initialize health tracking
initialize(): Promise<boolean>

// Request health permissions
requestPermissions(): Promise<boolean>

// Get health data for a specific date range
getHealthData(startDate: Date, endDate: Date): Promise<HealthData>

// Change health data provider
changeProvider(provider: HealthProvider): Promise<void>
```

### Challenge Service
```typescript
// Create a new challenge
createChallenge(challenge: ChallengeInput): Promise<Challenge>

// Join an existing challenge
joinChallenge(challengeId: string): Promise<void>

// Get user's progress in a challenge
getChallengeProgress(challengeId: string): Promise<number>

// Get all available challenges
getAllChallenges(): Promise<Challenge[]>
```

### Group Service
```typescript
// Create a new group
createGroup(group: GroupInput): Promise<Group>

// Invite user to group
inviteToGroup(groupId: string, userId: string): Promise<void>

// Get group details
getGroup(groupId: string): Promise<Group>

// Create group challenge
createGroupChallenge(groupId: string, challenge: ChallengeInput): Promise<Challenge>
```

### Achievement Service
```typescript
// Get user's achievements
getUserAchievements(userId: string): Promise<Achievement[]>

// Award an achievement
awardAchievement(userId: string, achievementId: BadgeType): Promise<Achievement>

// Update achievement progress
updateAchievementProgress(userId: string, achievementId: BadgeType, progress: number): Promise<void>
```

## Usage Examples

### Creating and Joining a Challenge
```typescript
// Create a new challenge
const challenge = await challengeService.createChallenge({
  title: '10K Steps Challenge',
  description: '10,000 steps daily for 30 days',
  type: 'steps',
  target: 10000,
  duration: 30,
  stake: 100,
  startDate: new Date(),
  visibility: 'public'
});

// Join a challenge
await challengeService.joinChallenge(challenge.id);

// Track progress
const progress = await challengeService.getChallengeProgress(challenge.id);
console.log(`Current progress: ${progress}%`);
```

### Managing Groups
```typescript
// Create a group
const group = await groupService.createGroup({
  name: 'Fitness Enthusiasts',
  description: 'A group for fitness lovers',
  visibility: 'public'
});

// Invite members
await groupService.inviteToGroup(group.id, 'user123');

// Create group challenge
const groupChallenge = await groupService.createGroupChallenge(group.id, {
  title: 'Group Fitness Challenge',
  type: 'activeMinutes',
  target: 30,
  duration: 7
});
```

### Health Data Integration
```typescript
// Initialize health tracking
await healthService.initialize();

// Request permissions
const granted = await healthService.requestPermissions();

if (granted) {
  // Get today's health data
  const today = new Date();
  const healthData = await healthService.getHealthData(today, today);
  console.log('Steps today:', healthData.steps);
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
