import { Stack } from 'expo-router';
import React from 'react';

export default function ChallengeLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
} 