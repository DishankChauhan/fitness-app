import firestore from '@react-native-firebase/firestore';
import { FirebaseError } from '@firebase/util';

class VerificationService {
  private static instance: VerificationService;
  private readonly verificationCollection = firestore().collection('verifications');
  private readonly OWNER_ID = 'YOUR_UNIQUE_OWNER_ID'; // Replace with your ID

  private constructor() {}

  static getInstance(): VerificationService {
    if (!VerificationService.instance) {
      VerificationService.instance = new VerificationService();
    }
    return VerificationService.instance;
  }

  async verifyOwnership(): Promise<boolean> {
    try {
      // Get the verification document
      const verificationDoc = await this.verificationCollection.doc(this.OWNER_ID).get();
      
      if (!verificationDoc.exists) {
        console.error('Verification failed: Invalid ownership');
        return false;
      }

      const data = verificationDoc.data();
      if (!data) return false;

      // Check if the verification token matches
      const isValid = data.verificationToken === process.env.EXPO_PUBLIC_VERIFICATION_TOKEN;
      
      if (!isValid) {
        console.error('Verification failed: Invalid token');
        return false;
      }

      return true;
    } catch (error) {
      if (error instanceof FirebaseError) {
        console.error('Firebase verification error:', error);
      } else {
        console.error('Unknown verification error:', error);
      }
      return false;
    }
  }

  async registerApp(verificationToken: string): Promise<void> {
    try {
      await this.verificationCollection.doc(this.OWNER_ID).set({
        verificationToken,
        registeredAt: firestore.FieldValue.serverTimestamp(),
        lastVerified: firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error registering app:', error);
      throw error;
    }
  }
}

export const verificationService = VerificationService.getInstance(); 