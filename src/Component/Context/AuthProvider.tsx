import { createContext, useEffect, useState } from "react";

import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { getCurrentAppUser, getSession, onAuthStateChange, signOut } from "../../Services/supabase/userService";

import type { TAppUser } from "../../Services/supabase/userService";

export type TAuthContext = {
	authUser: User | null;
	user: TAppUser | null;
	session: Session | null;

	loading: boolean;

	logout: () => Promise<void>;
	refreshUser: () => Promise<void>;
};

const AuthContext = createContext<TAuthContext>({
	authUser: null,
	user: null,
	session: null,

	loading: true,

	logout: async () => {},
	refreshUser: async () => {}
});

export function AuthProvider(props: { children: ReactNode }) {
	const { children } = props;

	const [session, setSession] = useState<Session | null>(null);

	const [authUser, setAuthUser] = useState<User | null>(null);

	const [user, setUser] = useState<TAppUser | null>(null);

	const [loading, setLoading] = useState(true);

	/*
	 * Load the existing session when the
	 * application starts.
	 */
	useEffect(() => {
		let mounted = true;

		async function initializeAuth() {
			try {
				const currentSession = await getSession();

				if (!mounted) {
					return;
				}

				setSession(currentSession);

				setAuthUser(currentSession?.user ?? null);

				if (currentSession) {
					const appUser = await getCurrentAppUser();

					if (!mounted) {
						return;
					}

					setUser(appUser);
				} else {
					setUser(null);
				}
			} catch (error) {
				console.error("Failed to initialize authentication:", error);

				if (mounted) {
					setSession(null);
					setAuthUser(null);
					setUser(null);
				}
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		}

		initializeAuth();

		/*
		 * Listen for Supabase authentication changes.
		 *
		 * Important:
		 * Don't perform another Supabase query directly
		 * inside this callback.
		 */
		const { data: authListener } = onAuthStateChange(async (_event, newSession) => {
			if (!mounted) {
				return;
			}

			setSession(newSession);

			setAuthUser(newSession?.user ?? null);

			if (!newSession) {
				setUser(null);
			}
		});

		return () => {
			mounted = false;

			authListener.subscription.unsubscribe();
		};
	}, []);

	/*
	 * Reload public.app_users.
	 */
	async function refreshUser() {
		const appUser = await getCurrentAppUser();

		setUser(appUser);
	}

	/*
	 * Sign out.
	 */
	async function logout() {
		await signOut();

		setSession(null);
		setAuthUser(null);
		setUser(null);
	}

	return (
		<AuthContext.Provider
			value={{
				authUser,
				user,
				session,
				loading,
				logout,
				refreshUser
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

export default AuthContext;
