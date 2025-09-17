import { FirebaseAuthService } from "#root/modules/auth/services/FirebaseAuthService.js";
import { getFromContainer } from "routing-controllers";

export async function authorizationChecker(action): Promise<boolean> {
    console.log('Authorization check started...');
    const firebaseAuthService = getFromContainer(FirebaseAuthService);
    const token = action.request.headers.authorization?.split(' ')[1];
    console.log('Token present:', !!token);

    if (!token) {
        console.log('No token provided');
        return false; // No token provided
    }
    try {
        console.log('Validating token...');
        // Properly validate the token
        const isValid = await firebaseAuthService.verifyToken(token);
        console.log('Token valid:', isValid);

        if (!isValid) {
            console.log('Token validation failed');
            return false;
        }

        console.log('Getting user from token...');
        // Get the user and set it on the request for later use
        const user = await firebaseAuthService.getCurrentUserFromToken(token);
        console.log('User retrieved:', !!user, user?.email);
        action.request.user = user;

        console.log('Authorization successful');
        return true; // Authorization successful
    }
    catch (error) {
        console.log('Authorization error:', error.message);
        return false; // Invalid token or user not found
    }
}