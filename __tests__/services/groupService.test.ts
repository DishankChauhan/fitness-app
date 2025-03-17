/// <reference types="jest" />
import { Platform } from 'react-native';
import '@testing-library/jest-native/extend-expect';
import { groupService } from '../../services/groupService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import crashlytics from '@react-native-firebase/crashlytics';
import * as authService from '../../services/authService';
import { ChallengeVisibility } from '../../types/challenge';

jest.mock('../../services/authService');

describe('GroupService', () => {
  const mockUser = auth().currentUser;

  const mockGroup = {
    id: 'test-group-id',
    name: 'Test Group',
    description: 'Test Description',
    createdBy: mockUser?.uid,
    admins: [mockUser?.uid],
    members: [mockUser?.uid],
    visibility: 'public' as ChallengeVisibility,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createGroup', () => {
    it('should create a new group successfully', async () => {
      const addMock = jest.fn().mockResolvedValue({ id: mockGroup.id });
      (firestore().collection as jest.Mock).mockReturnValue({
        add: addMock,
      });

      const result = await groupService.createGroup(
        mockGroup.name,
        mockGroup.description,
        mockGroup.visibility
      );

      expect(result).toEqual(expect.objectContaining({
        id: mockGroup.id,
        name: mockGroup.name,
        description: mockGroup.description,
        createdBy: mockUser?.uid,
        admins: [mockUser?.uid],
        members: [mockUser?.uid],
        visibility: mockGroup.visibility,
      }));
      expect(addMock).toHaveBeenCalled();
      expect(crashlytics().recordError).not.toHaveBeenCalled();
    });

    it('should throw error when user is not authenticated', async () => {
      (auth().currentUser as any) = null;

      await expect(groupService.createGroup(
        mockGroup.name,
        mockGroup.description,
        'public'
      )).rejects.toThrow('User not authenticated');
      expect(crashlytics().recordError).toHaveBeenCalled();
    });
  });

  describe('getGroup', () => {
    it('should return group data when found', async () => {
      const getMock = jest.fn().mockResolvedValue({
        exists: true,
        data: () => mockGroup,
      });
      (firestore().collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: getMock,
        }),
      });

      const result = await groupService.getGroup(mockGroup.id);

      expect(result).toEqual(mockGroup);
      expect(getMock).toHaveBeenCalled();
    });

    it('should return null when group not found', async () => {
      const getMock = jest.fn().mockResolvedValue({
        exists: false,
      });
      (firestore().collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: getMock,
        }),
      });

      const result = await groupService.getGroup('non-existent-id');

      expect(result).toBeNull();
      expect(getMock).toHaveBeenCalled();
    });
  });

  describe('updateGroup', () => {
    it('should update group successfully when user is admin', async () => {
      const getMock = jest.fn().mockResolvedValue({
        exists: true,
        data: () => mockGroup,
      });
      const updateMock = jest.fn().mockResolvedValue(undefined);
      (firestore().collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: getMock,
          update: updateMock,
        }),
      });

      const updates = { name: 'Updated Name' };
      await groupService.updateGroup(mockGroup.id, updates);

      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Updated Name',
        updatedAt: expect.any(String),
      }));
      expect(crashlytics().recordError).not.toHaveBeenCalled();
    });

    it('should throw error when user is not admin', async () => {
      const getMock = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          ...mockGroup,
          admins: ['other-user-id'],
        }),
      });
      (firestore().collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: getMock,
        }),
      });

      const updates = { name: 'Updated Name' };
      await expect(groupService.updateGroup(mockGroup.id, updates))
        .rejects.toThrow('Not authorized');
      expect(crashlytics().recordError).toHaveBeenCalled();
    });
  });

  describe('inviteToGroup', () => {
    const invitedUserId = 'invited-user-id';

    it('should create invite successfully when user is admin', async () => {
      const getMock = jest.fn().mockResolvedValue({
        exists: true,
        data: () => mockGroup,
      });
      const addMock = jest.fn().mockResolvedValue({ id: 'invite-id' });
      (firestore().collection as jest.Mock)
        .mockImplementation((collection) => {
          if (collection === 'groups') {
            return {
              doc: jest.fn().mockReturnValue({
                get: getMock,
              }),
            };
          }
          return {
            add: addMock,
          };
        });

      await groupService.inviteToGroup(mockGroup.id, invitedUserId);

      expect(addMock).toHaveBeenCalledWith(expect.objectContaining({
        groupId: mockGroup.id,
        invitedUserId,
        invitedBy: mockUser?.uid,
        status: 'pending',
        expiresAt: expect.any(String),
      }));
      expect(crashlytics().recordError).not.toHaveBeenCalled();
    });

    it('should throw error when user is not admin', async () => {
      const getMock = jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          ...mockGroup,
          admins: ['other-user-id'],
        }),
      });
      (firestore().collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: getMock,
        }),
      });

      await expect(groupService.inviteToGroup(mockGroup.id, invitedUserId))
        .rejects.toThrow('Not authorized');
      expect(crashlytics().recordError).toHaveBeenCalled();
    });
  });

  describe('respondToInvite', () => {
    const mockInvite = {
      id: 'invite-id',
      groupId: mockGroup.id,
      invitedUserId: mockUser?.uid,
      status: 'pending',
      expiresAt: new Date(Date.now() + 86400000).toISOString(), // 24 hours from now
    };

    it('should accept invite and add user to group', async () => {
      const getInviteMock = jest.fn().mockResolvedValue({
        exists: true,
        data: () => mockInvite,
      });
      const getGroupMock = jest.fn().mockResolvedValue({
        exists: true,
        data: () => mockGroup,
      });
      const updateMock = jest.fn().mockResolvedValue(undefined);
      (firestore().collection as jest.Mock)
        .mockImplementation((collection) => {
          if (collection === 'invites') {
            return {
              doc: jest.fn().mockReturnValue({
                get: getInviteMock,
                update: updateMock,
              }),
            };
          }
          return {
            doc: jest.fn().mockReturnValue({
              get: getGroupMock,
              update: updateMock,
            }),
          };
        });

      await groupService.respondToInvite(mockInvite.id, true);

      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        status: 'accepted',
      }));
      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        members: expect.arrayContaining([mockUser?.uid]),
      }));
      expect(crashlytics().recordError).not.toHaveBeenCalled();
    });

    it('should throw error for expired invite', async () => {
      const expiredInvite = {
        ...mockInvite,
        expiresAt: new Date(Date.now() - 86400000).toISOString(), // 24 hours ago
      };
      const getInviteMock = jest.fn().mockResolvedValue({
        exists: true,
        data: () => expiredInvite,
      });
      (firestore().collection as jest.Mock).mockReturnValue({
        doc: jest.fn().mockReturnValue({
          get: getInviteMock,
        }),
      });

      await expect(groupService.respondToInvite(mockInvite.id, true))
        .rejects.toThrow('Invite expired');
      expect(crashlytics().recordError).toHaveBeenCalled();
    });
  });
}); 