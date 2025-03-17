# API Documentation

## Table of Contents
- [Authentication Service](#authentication-service)
- [Health Service](#health-service)
- [Challenge Service](#challenge-service)
- [Group Service](#group-service)
- [Achievement Service](#achievement-service)
- [Solana Service](#solana-service)
- [Common Data Types](#common-data-types)
- [Error Handling](#error-handling)
- [Performance Considerations](#performance-considerations)

## Authentication Service

The Authentication Service handles user authentication and management using Firebase Authentication.

### Methods

#### `signUp(email: string, password: string, displayName: string): Promise<User>`
Creates a new user account with the provided credentials.

**Parameters:**
- `email`: User's email address
- `password`: User's password
- `displayName`: User's display name

**Returns:** Promise resolving to the created User object

**Example:**
```typescript
try {
  const user = await authService.signUp(
    'user@example.com',
    'password123',
    'John Doe'
  );
  console.log(`User created: ${user.id}`);
} catch (error) {
  console.error('Sign up failed:', error.message);
  // Handle specific error codes
  if (error.code === 'auth/email-already-in-use') {
    // Handle duplicate email
  }
}
```

**Error Codes:**
- `auth/email-already-in-use`: The email is already registered
- `auth/invalid-email`: The email format is invalid
- `auth/weak-password`: The password doesn't meet strength requirements

#### `signIn(email: string, password: string): Promise<User>`
Signs in an existing user with email and password.

**Parameters:**
- `email`: User's email address
- `password`: User's password

**Returns:** Promise resolving to the User object

**Example:**
```typescript
try {
  const user = await authService.signIn(
    'user@example.com',
    'password123'
  );
  console.log(`Signed in as: ${user.displayName}`);
  
  // Access user profile data
  const profile = await authService.getUserProfile(user.id);
  console.log(`User has ${profile.tokens} tokens and ${profile.challenges.length} challenges`);
} catch (error) {
  console.error('Sign in failed:', error.message);
}
```

#### `signOut(): Promise<void>`
Signs out the currently authenticated user.

**Example:**
```typescript
await authService.signOut();
```

#### `getCurrentUser(): Promise<User | null>`
Gets the currently authenticated user.

**Returns:** Promise resolving to the User object or null if not authenticated

**Example:**
```typescript
const user = await authService.getCurrentUser();
if (user) {
  console.log('User is authenticated:', user.displayName);
}
```

## Health Service

The Health Service manages health data integration with various providers (Apple Health, Google Fit, Fitbit).

### Methods

#### `initialize(): Promise<boolean>`
Initializes the health service and sets up necessary configurations.

**Returns:** Promise resolving to boolean indicating success

**Example:**
```typescript
const initialized = await healthService.initialize();
if (initialized) {
  console.log('Health service ready');
}
```

#### `requestPermissions(): Promise<boolean>`
Requests necessary health data permissions from the user.

**Returns:** Promise resolving to boolean indicating if permissions were granted

**Example:**
```typescript
const granted = await healthService.requestPermissions();
if (granted) {
  console.log('Health permissions granted');
}
```

#### `getHealthData(startDate: Date, endDate: Date): Promise<HealthData>`
Retrieves health data for a specific date range.

**Parameters:**
- `startDate`: Start date for data retrieval
- `endDate`: End date for data retrieval

**Returns:** Promise resolving to HealthData object

**Example:**
```typescript
const data = await healthService.getHealthData(
  new Date('2024-01-01'),
  new Date('2024-01-31')
);
```

#### `changeProvider(provider: HealthProvider): Promise<void>`
Changes the active health data provider.

**Parameters:**
- `provider`: The health provider to switch to ('apple' | 'google' | 'fitbit')

**Example:**
```typescript
await healthService.changeProvider('fitbit');
```

## Challenge Service

The Challenge Service manages fitness challenges and their lifecycle.

### Methods

#### `createChallenge(challenge: ChallengeInput): Promise<Challenge>`
Creates a new fitness challenge.

**Parameters:**
- `challenge`: Challenge configuration object

**Returns:** Promise resolving to the created Challenge object

**Example:**
```typescript
const challenge = await challengeService.createChallenge({
  title: '30 Day Fitness',
  description: 'Stay active for 30 days',
  type: 'activeMinutes',
  target: 30,
  duration: 30,
  stake: 100,
  startDate: new Date(),
  visibility: 'public'
});
```

#### `joinChallenge(challengeId: string): Promise<void>`
Joins an existing challenge.

**Parameters:**
- `challengeId`: ID of the challenge to join

**Example:**
```typescript
await challengeService.joinChallenge('challenge-123');
```

#### `getChallengeProgress(challengeId: string): Promise<number>`
Gets the current user's progress in a challenge.

**Parameters:**
- `challengeId`: ID of the challenge

**Returns:** Promise resolving to progress percentage (0-100)

**Example:**
```typescript
const progress = await challengeService.getChallengeProgress('challenge-123');
console.log(`Progress: ${progress}%`);
```

## Group Service

The Group Service manages group creation and social interactions.

### Methods

#### `createGroup(group: GroupInput): Promise<Group>`
Creates a new group.

**Parameters:**
- `group`: Group configuration object

**Returns:** Promise resolving to the created Group object

**Example:**
```typescript
const group = await groupService.createGroup({
  name: 'Fitness Squad',
  description: 'Group for fitness enthusiasts',
  visibility: 'public'
});
```

#### `inviteToGroup(groupId: string, userId: string): Promise<void>`
Invites a user to join a group.

**Parameters:**
- `groupId`: ID of the group
- `userId`: ID of the user to invite

**Example:**
```typescript
await groupService.inviteToGroup('group-123', 'user-456');
```

#### `getGroup(groupId: string): Promise<Group>`
Gets details of a specific group.

**Parameters:**
- `groupId`: ID of the group

**Returns:** Promise resolving to the Group object

**Example:**
```typescript
const group = await groupService.getGroup('group-123');
```

## Achievement Service

The Achievement Service manages user achievements and badges.

### Methods

#### `getUserAchievements(userId: string): Promise<Achievement[]>`
Gets all achievements for a user.

**Parameters:**
- `userId`: ID of the user

**Returns:** Promise resolving to array of Achievement objects

**Example:**
```typescript
const achievements = await achievementService.getUserAchievements('user-123');
```

#### `awardAchievement(userId: string, achievementId: BadgeType): Promise<Achievement>`
Awards an achievement to a user.

**Parameters:**
- `userId`: ID of the user
- `achievementId`: Type of achievement to award

**Returns:** Promise resolving to the awarded Achievement object

**Example:**
```typescript
const achievement = await achievementService.awardAchievement(
  'user-123',
  'early_bird'
);
```

#### `updateAchievementProgress(userId: string, achievementId: BadgeType, progress: number): Promise<void>`
Updates progress towards an achievement.

**Parameters:**
- `userId`: ID of the user
- `achievementId`: Type of achievement
- `progress`: Progress value (0-100)

**Example:**
```typescript
await achievementService.updateAchievementProgress(
  'user-123',
  'challenger',
  75
);
```

## Solana Service

The Solana Service provides blockchain functionality for financial transactions within challenges.

### Methods

#### `initializeWallet(): Promise<void>`
Initializes the Solana wallet for the current user. Creates a new wallet if one doesn't exist or loads the existing wallet.

**Returns:** Promise that resolves when the wallet is initialized

**Example:**
```typescript
try {
  await solanaService.initializeWallet();
  console.log('Wallet initialized successfully');
  
  // Check wallet balance after initialization
  const balance = await solanaService.getBalance();
  console.log(`Current wallet balance: ${balance} SOL`);
} catch (error) {
  console.error('Failed to initialize wallet:', error.message);
}
```

#### `getBalance(): Promise<number>`
Gets the current balance of the user's Solana wallet in SOL.

**Returns:** Promise resolving to the wallet balance in SOL

**Example:**
```typescript
try {
  const balance = await solanaService.getBalance();
  console.log(`Current wallet balance: ${balance} SOL`);
  
  // Check if user has enough funds for a challenge
  if (balance < 1.0) {
    console.log('Insufficient funds for staking');
  }
} catch (error) {
  console.error('Failed to get balance:', error.message);
}
```

#### `createChallenge(challengeId: string, stakeAmount: number): Promise<string>`
Creates a new challenge on the Solana blockchain with the specified stake amount.

**Parameters:**
- `challengeId`: The unique identifier for the challenge (from Firestore)
- `stakeAmount`: The amount of SOL to stake in the challenge

**Returns:** Promise resolving to the Solana address of the created challenge

**Example:**
```typescript
try {
  // Create a challenge with 1 SOL stake
  const challengeAddress = await solanaService.createChallenge(
    'abc123', // Firestore challenge ID
    1.0       // 1 SOL stake
  );
  
  console.log(`Challenge created on Solana at address: ${challengeAddress}`);
  
  // Store the Solana address in Firestore
  await challengeService.updateChallenge(challengeId, {
    solanaAddress: challengeAddress
  });
} catch (error) {
  console.error('Failed to create challenge on Solana:', error.message);
}
```

#### `stakeInChallenge(challengeAddress: string, amount: number): Promise<void>`
Stakes tokens in an existing challenge on the Solana blockchain.

**Parameters:**
- `challengeAddress`: The Solana address of the challenge
- `amount`: The amount of SOL to stake

**Returns:** Promise that resolves when the staking is complete

**Example:**
```typescript
try {
  // Join a challenge with 0.5 SOL stake
  await solanaService.stakeInChallenge(
    'solana_address_here',  // Solana challenge address
    0.5                     // 0.5 SOL stake
  );
  
  console.log('Successfully staked in challenge');
} catch (error) {
  console.error('Failed to stake in challenge:', error.message);
}
```

#### `distributeReward(challengeAddress: string, winnerAddress: string, amount: number): Promise<void>`
Distributes rewards from a challenge to a winner.

**Parameters:**
- `challengeAddress`: The Solana address of the challenge
- `winnerAddress`: The recipient's address
- `amount`: The reward amount in SOL

**Returns:** Promise that resolves when the distribution is complete

**Example:**
```typescript
try {
  // Distribute 1.5 SOL reward to winner
  await solanaService.distributeReward(
    'solana_challenge_address', // Challenge address
    'winner_address',           // Winner's address
    1.5                         // 1.5 SOL reward
  );
  
  console.log('Successfully distributed reward');
} catch (error) {
  console.error('Failed to distribute reward:', error.message);
}
```

## Common Data Types

### UserProfile

```typescript
interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
  lastLogin?: string;
  tokens: number;
  challenges: string[];
  achievements: string[];
  stats: {
    completedChallenges: number;
    totalSteps: number;
    activeDays: number;
    streak: number;
  };
}
```

### Challenge

```typescript
interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'steps' | 'activeMinutes' | 'heartRate' | 'sleepHours';
  goal: number;
  stake: number;
  startDate: string;
  endDate: string;
  createdBy: string;
  participants: string[];
  status: 'active' | 'completed' | 'failed';
  visibility: 'public' | 'private' | 'invite_only';
  groupId: string | null;
  createdAt: string;
  updatedAt: string;
  prizePool: number;
  progress?: number;
  solanaAddress?: string;
}
```

## Error Handling

All services in the application use a consistent error handling approach:

1. Specific errors are thrown with descriptive messages
2. Firebase error codes are preserved when applicable
3. Errors are logged to analytics and crashlytics
4. For UI components, errors should be caught and displayed to users

Example error handling pattern:

```typescript
try {
  // Call service method
  await challengeService.joinChallenge(challengeId);
} catch (error) {
  if (error.message.includes('Insufficient tokens')) {
    // Handle specific error case
    showInsufficientTokensAlert();
  } else if (error.message.includes('Already joined')) {
    // Handle already joined error
    showAlreadyJoinedAlert();
  } else {
    // Generic error handling
    showErrorAlert(error.message);
  }
  
  // Log error to analytics
  analytics.logEvent('error', {
    method: 'joinChallenge',
    message: error.message,
    challengeId
  });
}
```

## Performance Considerations

For optimal performance, follow these guidelines when using the API:

1. **Caching**: Health and challenge data is cached. Check cache TTL values in respective services.
2. **Batch Operations**: Use batch operations when updating multiple documents.
3. **Pagination**: Leaderboards and challenge lists are paginated. Use the limit parameter.
4. **Offline Support**: The app works offline and syncs when online. Changes are queued for sync.
5. **Solana Transactions**: Solana transactions can take time to confirm. Use the status tracking methods. 