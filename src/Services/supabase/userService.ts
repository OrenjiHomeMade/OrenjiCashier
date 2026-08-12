import { supabase } from "./client";

export type TAppUser = {
	user_id: string;
	email: string;
	username: string;
	created_at: string;
	updated_at: string;
};

export type TSignUpInput = {
	email: string;
	username: string;
	password: string;
};

export type TLoginInput = {
	username: string;
	password: string;
};

/**
 * Sign up a new user.
 *
 * Supabase Auth owns:
 * - email
 * - password
 *
 * public.app_users owns:
 * - username
 * - application profile
 *
 * The database trigger creates app_users automatically.
 */
export async function signUp({ email, username, password }: TSignUpInput) {
	const normalizedEmail = email.trim().toLowerCase();
	const normalizedUsername = username.trim().toLowerCase();

	if (!normalizedEmail) {
		throw new Error("Email is required.");
	}

	if (!normalizedUsername) {
		throw new Error("Username is required.");
	}

	if (!password) {
		throw new Error("Password is required.");
	}

	const { data: usernameAvailable, error: usernameError } = await supabase.rpc("is_username_available", {
		p_username: normalizedUsername
	});

	if (usernameError) {
		console.error("Username availability check failed:", usernameError);

		throw new Error("Unable to check username availability.");
	}

	if (!usernameAvailable) {
		throw new Error("Username is already taken.");
	}

	const { data, error } = await supabase.auth.signUp({
		email: normalizedEmail,
		password,
		options: {
			data: {
				username: normalizedUsername
			}
		}
	});

	if (error) {
		throw error;
	}

	return data;
}

/**
 * Sign in using username + password.
 *
 * Internally:
 *
 * username
 *     ↓
 * get_email_by_username()
 *     ↓
 * email
 *     ↓
 * Supabase Auth
 */
export async function signIn({ username, password }: TLoginInput) {
	const normalizedUsername = username.trim().toLowerCase();

	if (!normalizedUsername) {
		throw new Error("Username is required.");
	}

	if (!password) {
		throw new Error("Password is required.");
	}

	const { data: email, error: lookupError } = await supabase.rpc("get_email_by_username", {
		p_username: normalizedUsername
	});

	if (lookupError) {
		console.error("Username lookup failed:", lookupError);

		throw new Error("Unable to sign in.");
	}

	if (!email) {
		throw new Error("Invalid username or password.");
	}

	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password
	});

	if (error) {
		throw new Error("Invalid username or password.");
	}

	return data;
}

/**
 * Sign out the current user.
 */
export async function signOut() {
	const { error } = await supabase.auth.signOut();

	if (error) {
		throw error;
	}
}

/**
 * Get the current session.
 */
export async function getSession() {
	const { data, error } = await supabase.auth.getSession();

	if (error) {
		throw error;
	}

	return data.session;
}

/**
 * Get the currently authenticated Supabase user.
 */
export async function getAuthUser() {
	const { data, error } = await supabase.auth.getUser();

	if (error) {
		return null;
	}

	return data.user;
}

/**
 * Get the application user associated with
 * the currently authenticated user.
 */
export async function getCurrentAppUser(): Promise<TAppUser | null> {
	const authUser = await getAuthUser();

	if (!authUser) {
		return null;
	}

	const { data, error } = await supabase.from("app_users").select("*").eq("user_id", authUser.id).maybeSingle();

	if (error) {
		throw error;
	}

	return data;
}

/**
 * Subscribe to Supabase authentication changes.
 *
 * Used by AuthProvider.
 */
export function onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
	return supabase.auth.onAuthStateChange(callback);
}

/**
 * Change the current user's password.
 */
export async function changePassword(newPassword: string) {
	if (!newPassword) {
		throw new Error("Password is required.");
	}

	const { data, error } = await supabase.auth.updateUser({
		password: newPassword
	});

	if (error) {
		throw error;
	}

	return data;
}

/**
 * Account deletion will be implemented later.
 *
 * We intentionally don't expose a direct client-side
 * deletion of auth.users.
 */
export async function deleteAccount() {
	throw new Error("Account deletion has not been implemented yet.");
}
