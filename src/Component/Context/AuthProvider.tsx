import { createContext, useState } from "react";
import type { ReactNode } from "react";

export type TUserContext = {
	user_name: string;
	user_id: string;
};

export type TAuthContext = {
	user: TUserContext | null;
	setUser: (user: TUserContext) => void;
};

const AuthContext = createContext<TAuthContext>({
	user: null,
	setUser: () => {}
});

export function AuthProvider(props: { children: ReactNode }) {
	const { children } = props;
	const [user, setUser] = useState<TUserContext | null>(null);
	return <AuthContext.Provider value={{ user, setUser }}>{children}</AuthContext.Provider>;
}

export default AuthContext;
