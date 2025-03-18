/// <reference types="jest" />
import firestore from '@react-native-firebase/firestore';
import * as authService from '../../services/authService';
import { challengeService, ChallengeType, ChallengeVisibility } from '../../services/challengeService';

jest.mock('@react-native-firebase/firestore', () => ({
  default: () => ({
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      }),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn()
    })
  })
}));

jest.mock('../../services/authService');

describe('ChallengeService', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    tokens: 100
  };

  const mockChallenge = {
    id: 'test-challenge-id',
    title: 'Test Challenge',
    description: 'Test Description',
    type: 'steps',
    goal: 10000,
    stake: 50,
    startDate: '2024-03-17T00:00:00.000Z',
    endDate: '2024-03-24T00:00:00.000Z',
    createdBy: mockUser.id,
    participants: [mockUser.id],
    status: 'active',
    visibility: 'public',
    groupId: null,
    createdAt: '2024-03-17T00:00:00.000Z',
    updatedAt: '2024-03-17T00:00:00.000Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (authService.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
  });

  describe('createChallenge', () => {
    it('should create a challenge successfully', async () => {
      const addMock = jest.fn().mockResolvedValue({ id: mockChallenge.id });
      (firestore().collection as jest.Mock).mockReturnValue({
        add: addMock
      });

      const result = await challengeService.createChallenge({
        title: mockChallenge.title,
        description: mockChallenge.description,
        type: mockChallenge.type as ChallengeType,
        goal: mockChallenge.goal,
        stake: mockChallenge.stake,
        startDate: mockChallenge.startDate,
        endDate: mockChallenge.endDate,
        visibility: mockChallenge.visibility as ChallengeVisibility
      });

      expect(result).toEqual(expect.objectContaining({
        id: mockChallenge.id,
        title: mockChallenge.title,
        createdBy: mockUser.id,
        participants: [mockUser.id]
      }));
      expect(addMock).toHaveBeenCalledTimes(1);
    });

    it('should handle creation errors', async () => {
      const error = new Error('Creation failed');
      (firestore().collection as jest.Mock).mockReturnValue({
        add: jest.fn().mockRejectedValue(error)
      });

      await expect(challengeService.createChallenge({
        title: mockChallenge.title,
        description: mockChallenge.description,
        type: mockChallenge.type as ChallengeType,
        goal: mockChallenge.goal,
        stake: mockChallenge.stake,
        startDate: mockChallenge.startDate,
        endDate: mockChallenge.endDate,
        visibility: mockChallenge.visibility as ChallengeVisibility
      })).rejects.toThrow(error);
    });
  });

  describe('getChallenge', () => {
    it('should return challenge when found', async () => {
      const getMock = jest.fn().mockResolvedValue({
        exists: true,
        id: mockChallenge.id,
        data: () => ({
          title: mockChallenge.title,
          description: mockChallenge.description,
          type: mockChallenge.type,
          goal: mockChallenge.goal,
          stake: mockChallenge.stake,
          startDate: mockChallenge.startDate,
          endDate: mockChallenge.endDate,
          createdBy: mockChallenge.createdBy,
          participants: mockChallenge.participants,
          status: mockChallenge.status,
          visibility: mockChallenge.visibility,
          groupId: mockChallenge.groupId,
          createdAt: mockChallenge.createdAt,
          updatedAt: mockChallenge.updatedAt
        })
      });

      (firestore().collection('challenges').doc(mockChallenge.id).get as jest.Mock).mockImplementation(getMock);

      const result = await challengeService.getChallenge(mockChallenge.id);

      expect(result).toEqual(mockChallenge);
      expect(getMock).toHaveBeenCalledTimes(1);
    });

    it('should return null when challenge not found', async () => {
      const getMock = jest.fn().mockResolvedValue({
        exists: false
      });

      (firestore().collection('challenges').doc('non-existent-id').get as jest.Mock).mockImplementation(getMock);

      const result = await challengeService.getChallenge('non-existent-id');

      expect(result).toBeNull();
      expect(getMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateChallenge', () => {
    it('should update challenge successfully', async () => {
      const updateMock = jest.fn().mockResolvedValue(undefined);
      (firestore().collection('challenges').doc(mockChallenge.id).update as jest.Mock).mockImplementation(updateMock);

      const updates = { title: 'Updated Title' };
      await challengeService.updateChallenge(mockChallenge.id, updates);

      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Updated Title',
        updatedAt: expect.any(String)
      }));
    });

    it('should handle update errors', async () => {
      const error = new Error('Update failed');
      (firestore().collection('challenges').doc(mockChallenge.id).update as jest.Mock).mockRejectedValue(error);

      await expect(challengeService.updateChallenge(
        mockChallenge.id,
        { title: 'Updated Title' }
      )).rejects.toThrow(error);
    });
  });
    it('should join challenge successfully', async () => {
      const getChallengeMock = jest.fn().mockResolvedValue(mockChallenge);
      const updateMock = jest.fn().mockResolvedValue(undefined);
      jest.spyOn(challengeService, 'getChallenge').mockImplementation(getChallengeMock);
      (firestore().collection('challenges').doc(mockChallenge.id).update as jest.Mock).mockImplementation(updateMock);

      await challengeService.joinChallenge(mockChallenge.id);

      expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
        participants: expect.arrayContaining([mockUser.id])
      }));
    });

    it('should handle join errors', async () => {
      const error = new Error('Join failed');
      jest.spyOn(challengeService, 'getChallenge').mockRejectedValue(error);

      await expect(challengeService.joinChallenge(mockChallenge.id))
        .rejects.toThrow(error);
    });
  });

  describe('getUserChallenges', () => {
    it('should return user challenges', async () => {
      const querySnapshot = {
        docs: [{
          id: 'mockChallengeId',
          data: () => ({
            title: 'mockChallengeTitle',
            description: 'mockChallengeDescription',
            type: 'mockChallengeType',
            goal: 'mockChallengeGoal',
            stake: 'mockChallengeStake',
            startDate: 'mockChallengeStartDate',
            endDate: 'mockChallengeEndDate',
            createdBy: 'mockChallengeCreatedBy',
            participants: 'mockChallengeParticipants',
            status: 'mockChallengeStatus',
            visibility: 'mockChallengeVisibility',
            groupId: 'mockChallengeGroupId',
            createdAt: 'mockChallengeCreatedAt',
            updatedAt: 'mockChallengeUpdatedAt'
          })
        }]
      };

      const mockUser = { id: 'mockUserId' }; // Define mockUser

      (firestore().collection('challenges').where('participants', 'array-contains', mockUser.id).get as jest.Mock)
        .mockResolvedValue(querySnapshot);

      const mockChallenge = {
        id: 'mockChallengeId',
        title: 'mockChallengeTitle',
        description: 'mockChallengeDescription',
        type: 'mockChallengeType',
        goal: 'mockChallengeGoal',
        stake: 'mockChallengeStake',
        startDate: 'mockChallengeStartDate',
        endDate: 'mockChallengeEndDate',
        createdBy: 'mockChallengeCreatedBy',
        participants: 'mockChallengeParticipants',
        status: 'mockChallengeStatus',
        visibility: 'mockChallengeVisibility',
        groupId: 'mockChallengeGroupId',
        createdAt: 'mockChallengeCreatedAt',
        updatedAt: 'mockChallengeUpdatedAt'
      };

      const result = await challengeService.getUserChallenges(mockUser.id);

      expect(result).toEqual([mockChallenge]);
    });

    it('should handle query errors', async () => {
      const error = new Error('Query failed');
      (firestore().collection('challenges').where('participants', 'array-contains', 'mockUserId').get as jest.Mock)
        .mockRejectedValue(error);

      await expect(challengeService.getUserChallenges('mockUserId'))
        .rejects.toThrow(error);
    });
  });

  describe('getPublicChallenges', () => {
    it('should return public challenges', async () => {
      const mockChallenge = {
        id: 'mockChallengeId',
        title: 'mockChallengeTitle',
        description: 'mockChallengeDescription',
        type: 'mockChallengeType',
        goal: 'mockChallengeGoal',
        stake: 'mockChallengeStake',
        startDate: 'mockChallengeStartDate',
        endDate: 'mockChallengeEndDate',
        createdBy: 'mockChallengeCreatedBy',
        participants: 'mockChallengeParticipants',
        status: 'mockChallengeStatus',
        visibility: 'mockChallengeVisibility',
        groupId: 'mockChallengeGroupId',
        createdAt: 'mockChallengeCreatedAt',
        updatedAt: 'mockChallengeUpdatedAt'
      };

      const querySnapshot = {
        docs: [{
          id: mockChallenge.id,
          data: () => ({
            title: mockChallenge.title,
            description: mockChallenge.description,
            type: mockChallenge.type,
            goal: mockChallenge.goal,
            stake: mockChallenge.stake,
            startDate: mockChallenge.startDate,
            endDate: mockChallenge.endDate,
            createdBy: mockChallenge.createdBy,
            participants: mockChallenge.participants,
            status: mockChallenge.status,
            visibility: mockChallenge.visibility,
            groupId: mockChallenge.groupId,
            createdAt: mockChallenge.createdAt,
            updatedAt: mockChallenge.updatedAt
          })
        }]
      };

      (firestore().collection('challenges').where('visibility', '==', 'public').orderBy('createdAt', 'desc').limit(10).get as jest.Mock)
        .mockResolvedValue(querySnapshot);

      const result = await challengeService.getPublicChallenges(10);

      expect(result).toEqual([mockChallenge]);
    });

    it('should handle query errors', async () => {
      const error = new Error('Query failed');
      (firestore().collection('challenges').where('visibility', '==', 'public').orderBy('createdAt', 'desc').limit(10).get as jest.Mock)
        .mockRejectedValue(error);

      await expect(challengeService.getPublicChallenges(10))
        .rejects.toThrow(error);
    });
  });
