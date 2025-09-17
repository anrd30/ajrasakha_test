import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { ExtendedUserCredential } from "@/types";
import { AuthService } from "../services/authService";

const authService = new AuthService();

// Option 1: Using AuthService (Recommended)
export const useLoginWithGoogle = () => {
  return useMutation({
    mutationFn: async (firebaseLoginRes: ExtendedUserCredential) => {
      return await authService.loginWithGoogle(firebaseLoginRes);
    },
    onSuccess: () => {
      toast.success("Logged in successfully");
    },
    onError: (error: unknown) => {
      console.error("Google login failed:", error);
      toast.error("Login failed, please try again");
    },
  });
};

// Option 2: Standalone function (Alternative approach)
export const loginWithGoogleStandalone = async (firebaseLoginRes: ExtendedUserCredential) => {
  try {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const idToken = await firebaseLoginRes.user.getIdToken();

    const backendUrl = `${API_BASE_URL}/auth/signup/google/`;
    const res = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: firebaseLoginRes.user.email,
        firstName: firebaseLoginRes._tokenResponse?.firstName,
        lastName: firebaseLoginRes._tokenResponse?.lastName,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(
        `Login failed: ${res.status} ${res.statusText} - ${errorText}`
      );
    }

    return await res.json();
  } catch (error) {
    console.error("Login with google failed!", error);
    throw error;
  }
};
