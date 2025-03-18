# Accountability App API Documentation

## Authentication

### Sign Up
```typescript
POST /api/auth/signup
{
  "email": string,
  "password": string,
  "displayName": string
}
```
Returns: UserProfile

### Sign In
```typescript
POST /api/auth/signin
{
  "email": string,
  "password": string
}
```
Returns: UserProfile with JWT token

## Social Features

### Get Leaderboard
```typescript
GET /api/social/leaderboard?limit={number}
```
Returns: Array of LeaderboardEntry

### Get Friends
```typescript
GET /api/social/friends
```
Returns: Array of UserProfile

### Send Friend Request
```typescript
POST /api/social/friends/request
{
  "targetUserId": string
}
```
Returns: { success: boolean, requestId: string }

### Accept Friend Request
```typescript
POST /api/social/friends/accept/{requestId}
```
Returns: { success: boolean, friendshipId: string }

### Get Friend Requests
```typescript
GET /api/social/friends/requests
```
Returns: Array of FriendRequest

### Unfriend User
```typescript
DELETE /api/social/friends/{friendId}
```
Returns: { success: boolean }

### Follow User
```typescript
POST /api/social/follow/{userId}
```
Returns: void

### Unfollow User
```typescript
DELETE /api/social/follow/{userId}
```
Returns: void

### Get Following
```typescript
GET /api/social/following
```
Returns: Array of UserProfile

## Challenge Features

### Get Challenges
```typescript
GET /api/challenges?category={category}&status={status}
```
Returns: Array of Challenge

### Join Challenge
```typescript
POST /api/challenges/{challengeId}/join
```
Returns: { success: boolean, userChallengeId: string }

### Get User Challenges
```typescript
GET /api/challenges/user
```
Returns: Array of UserChallenge

### Check In
```typescript
POST /api/challenges/{challengeId}/checkin
{
  "progress": number,
  "evidence": string // optional
}
```
Returns: { success: boolean, newProgress: number }

### Create Group Challenge
```typescript
POST /api/challenges/group
{
  "title": string,
  "description": string,
  "startDate": string,
  "endDate": string,
  "maxParticipants": number,
  "stake": number
}
```
Returns: { success: boolean, challengeId: string }

## Data Types

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

### LeaderboardEntry
```typescript
interface LeaderboardEntry {
  id: string;
  displayName: string;
  photoURL?: string;
  stats: {
    completedChallenges: number;
    totalTokens: number;
    successRate: number;
  };
}
```

### FriendRequest
```typescript
interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
}
```

### Challenge
```typescript
interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'solo' | 'group';
  category: string;
  startDate: string;
  endDate: string;
  stake: number;
  prizePool: number;
  maxParticipants?: number;
  currentParticipants: number;
  status: 'active' | 'completed' | 'cancelled';
}
```

## Error Handling

All API endpoints return standard error responses in the following format:

```typescript
{
  "error": {
    "code": string,
    "message": string,
    "details?: any
  }
}
```

Common error codes:
- `auth/not-authenticated`: User is not authenticated
- `auth/not-authorized`: User is not authorized to perform the action
- `validation/invalid-input`: Invalid input data
- `resource/not-found`: Requested resource not found
- `challenge/already-joined`: User has already joined the challenge
- `challenge/full`: Challenge has reached maximum participants
- `friend/request-exists`: Friend request already exists 