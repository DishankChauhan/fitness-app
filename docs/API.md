# API Documentation

## Table of Contents
- [Authentication Service](#authentication-service)
- [Health Service](#health-service)
- [Challenge Service](#challenge-service)
- [Group Service](#group-service)
- [Achievement Service](#achievement-service)

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
const user = await authService.signUp(
  'user@example.com',
  'password123',
  'John Doe'
);
```

#### `signIn(email: string, password: string): Promise<User>`
Signs in an existing user with email and password.

**Parameters:**
- `email`: User's email address
- `password`: User's password

**Returns:** Promise resolving to the User object

**Example:**
```typescript
const user = await authService.signIn(
  'user@example.com',
  'password123'
);
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