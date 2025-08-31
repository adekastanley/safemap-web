"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	signOut,
	onAuthStateChanged,
	updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
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
	isSuperAdmin: boolean;
	isAuthenticated: boolean;
	canManageUsers: boolean;
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
		console.log('AuthContext: Setting up onAuthStateChanged listener');
		const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
			console.log('AuthContext: onAuthStateChanged triggered with:', firebaseUser ? { uid: firebaseUser.uid, email: firebaseUser.email } : 'null');

			try {
				if (firebaseUser) {
					// Determine superadmin at runtime via env email BEFORE any Firestore access
					const superEmail = process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL?.toLowerCase();
					const emailLower = firebaseUser.email?.toLowerCase() || null;
					const baseRole: UserRole = superEmail && emailLower && emailLower === superEmail ? 'superadmin' : 'user';
					
					// Set a base user immediately to avoid redirect bounce
					const baseUser: AuthUser = {
						uid: firebaseUser.uid,
						email: firebaseUser.email,
						displayName: firebaseUser.displayName,
						role: baseRole,
						customClaims: {
							admin: false,
							permissions: [],
						},
					};
					console.log('AuthContext: Setting base user state:', baseUser);
					setUser(baseUser);

					console.log('AuthContext: Getting user tokens and Firestore data...');
					// Get custom claims (not used for roles in MVP but logged for visibility)
					const tokenResult = await firebaseUser.getIdTokenResult();
					const customClaims = tokenResult.claims;

					// Canonical role doc: users/{uid}
					const uid = firebaseUser.uid;
					let userData: any | undefined;
					const userRef = doc(db, 'users', uid);
					const userSnap = await getDoc(userRef);
					if (userSnap.exists()) {
						userData = userSnap.data();
					} else {
						// Create default user doc
						const newUser = {
							uid,
							email: firebaseUser.email || null,
							displayName: firebaseUser.displayName || null,
							role: 'user' as UserRole,
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString(),
						};
						await setDoc(userRef, newUser);
						userData = newUser;
					}

					let role: UserRole = (userData?.role as UserRole) || 'user';

					// Enforce single superadmin by env email
					if (process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL && emailLower && emailLower === process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL.toLowerCase()) {
						if (userData?.role !== 'superadmin') {
							try {
								await updateDoc(userRef, { role: 'superadmin', updatedAt: new Date().toISOString() });
								role = 'superadmin';
							} catch (e) {
								role = 'superadmin'; // assume for UI even if write fails
							}
						} else {
							role = 'superadmin';
						}
					} else if (role === 'superadmin') {
						// If some other doc claims superadmin, normalize to admin at runtime
						role = 'admin';
					}

					const authUser: AuthUser = {
						uid: firebaseUser.uid,
						email: firebaseUser.email,
						displayName: firebaseUser.displayName,
						role,
						customClaims: {
							admin: Boolean(customClaims?.admin),
							permissions: (customClaims?.permissions as string[]) || [],
						},
					};

					console.log('AuthContext: Setting user from Firestore doc:', authUser);
					setUser(authUser);
				} else {
					console.log('AuthContext: No user, setting user to null');
					setUser(null);
				}
			} catch (error) {
				// Do not clear the user on errors during claims/Firestore fetch - keep base user
				console.error("AuthContext: Error setting up user (keeping base user if present):", error);
			} finally {
				console.log('AuthContext: Setting loading to false');
				setLoading(false);
			}
		});

		return unsubscribe;
	}, []);

	const signIn = async (email: string, password: string) => {
		try {
			console.log('AuthContext: signIn called with email:', email);
			console.log('AuthContext: Firebase auth object:', auth);
			const result = await signInWithEmailAndPassword(auth, email, password);
			console.log('AuthContext: signInWithEmailAndPassword successful:', result.user.uid);
			return result;
		} catch (error) {
			console.error('AuthContext: signInWithEmailAndPassword failed:', error);
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

	const isAdmin = user?.role === "admin" || user?.role === "superadmin";
	const isSuperAdmin = user?.role === "superadmin";
	const canManageUsers = user?.role === "admin" || user?.role === "superadmin";
	const isAuthenticated = !!user;

	const value: AuthContextType = {
		user,
		loading,
		signIn,
		signUp,
		logout,
		isAdmin,
		isSuperAdmin,
		isAuthenticated,
		canManageUsers,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
