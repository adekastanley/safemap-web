"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	signOut,
	onAuthStateChanged,
	updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { AuthUser, UserRole } from "@/types";

interface AuthContextType {
	user: AuthUser | null;
	loading: boolean;
	signIn: (email: string, password: string) => Promise<void>;
	signUp: (
		email: string,
		password: string,
		displayName: string,
		role?: UserRole
	) => Promise<void>;
	logout: () => Promise<void>;
	isAdmin: boolean;
	isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
};

interface AuthProviderProps {
	children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			if (firebaseUser) {
				try {
					// Get custom claims
					const tokenResult = await firebaseUser.getIdTokenResult();
					const customClaims = tokenResult.claims;

					// Get user document from Firestore
					const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
					const userData = userDoc.data();

					// Determine role
					let role: UserRole = "user";
					if (customClaims.admin || userData?.role === "admin") {
						role = "admin";
					} else if (userData?.role) {
						role = userData.role;
					}

					const authUser: AuthUser = {
						uid: firebaseUser.uid,
						email: firebaseUser.email,
						displayName: firebaseUser.displayName,
						role,
						customClaims: {
							admin: Boolean(customClaims.admin),
							permissions: (customClaims.permissions as string[]) || [],
						},
					};

					setUser(authUser);
				} catch (error) {
					console.error("Error setting up user:", error);
					setUser(null);
				}
			} else {
				setUser(null);
			}
			setLoading(false);
		});

		return unsubscribe;
	}, []);

	const signIn = async (email: string, password: string) => {
		try {
			await signInWithEmailAndPassword(auth, email, password);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to sign in";
			throw new Error(errorMessage);
		}
	};

	const signUp = async (
		email: string,
		password: string,
		displayName: string,
		role: UserRole = "user"
	) => {
		try {
			const { user: firebaseUser } = await createUserWithEmailAndPassword(
				auth,
				email,
				password
			);

			// Update profile
			await updateProfile(firebaseUser, {
				displayName,
			});

			// Create user document in Firestore
			await setDoc(doc(db, "users", firebaseUser.uid), {
				uid: firebaseUser.uid,
				email: firebaseUser.email,
				displayName,
				role,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to create account";
			throw new Error(errorMessage);
		}
	};

	const logout = async () => {
		try {
			await signOut(auth);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Failed to sign out";
			throw new Error(errorMessage);
		}
	};

	const isAdmin = user?.role === "admin";
	const isAuthenticated = !!user;

	const value: AuthContextType = {
		user,
		loading,
		signIn,
		signUp,
		logout,
		isAdmin,
		isAuthenticated,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
