import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AddTaskProps {
  onAddTask: (title: string) => void;
}

export const AddTask: React.FC<AddTaskProps> = ({ onAddTask }) => {
  const [taskTitle, setTaskTitle] = useState('');

  const handleAddTask = () => {
    if (taskTitle.trim()) {
      onAddTask(taskTitle.trim());
      setTaskTitle('');
      Keyboard.dismiss();
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={taskTitle}
        onChangeText={setTaskTitle}
        placeholder="Add a new task..."
        placeholderTextColor="#9E9E9E"
        returnKeyType="done"
        onSubmitEditing={handleAddTask}
      />
      <TouchableOpacity
        style={[
          styles.addButton,
          !taskTitle.trim() && styles.disabledButton
        ]}
        onPress={handleAddTask}
        disabled={!taskTitle.trim()}
      >
        <Ionicons
          name="add-circle"
          size={24}
          color={taskTitle.trim() ? '#2196F3' : '#BDBDBD'}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    height: 40,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    marginRight: 12,
    fontSize: 16,
  },
  addButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  disabledButton: {
    opacity: 0.5,
  },
}); 