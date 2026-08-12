import { type FormEvent, useContext, useState } from "react";

import { Link, useLocation, useNavigate } from "react-router-dom";

import styles from "./Login.module.css";

import AuthContext from "../../Component/Context/AuthProvider";

import { signIn } from "../../Services/supabase/userService";

import OrenjiLogo from "../../assets/Stiker Orenji.svg";

function Login() {
	const navigate = useNavigate();
	const location = useLocation();
	const { refreshUser } = useContext(AuthContext);
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const signupSuccess = location.state?.signupSuccess === true;

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setLoading(true);

		try {
			await signIn({
				username: username.trim(),
				password
			});

			await refreshUser();

			navigate("/cashier", {
				replace: true
			});
		} catch (error) {
			if (error instanceof Error) {
				setError(error.message);
			} else {
				setError("Unable to sign in.");
			}
		} finally {
			setLoading(false);
		}
	}

	return (
		<main className={styles["auth-page"]}>
			<section className={styles["auth-card"]}>
				{/* Logo */}

				<img src={OrenjiLogo} alt="Orenji" className={styles["logo"]} />

				<div className={styles["heading"]}>
					<h1>Welcome back</h1>

					<p>Sign in to your OrenjiCashier account.</p>
				</div>

				{/* Signup success */}

				{signupSuccess && (
					<div className={styles["success-message"]}>Account created successfully. You can now sign in.</div>
				)}

				{/* Error */}

				{error && (
					<div className={styles["error-message"]} role="alert">
						{error}
					</div>
				)}

				<form className={styles["form"]} onSubmit={handleSubmit}>
					{/* Username */}

					<div className={styles["field"]}>
						<label htmlFor="username">Username</label>

						<input
							id="username"
							type="text"
							value={username}
							onChange={(event) => setUsername(event.target.value)}
							autoComplete="username"
							placeholder="Enter your username"
							required
							autoFocus
						/>
					</div>

					{/* Password */}

					<div className={styles["field"]}>
						<label htmlFor="password">Password</label>

						<input
							id="password"
							type="password"
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							autoComplete="current-password"
							placeholder="Enter your password"
							required
						/>
					</div>

					<button type="submit" className={styles["submit-button"]} disabled={loading}>
						{loading ? "Signing in..." : "Sign In"}
					</button>
				</form>

				<div className={styles["footer"]}>
					<span>Don't have an account?</span>

					<Link to="/signup">Create one</Link>
				</div>
			</section>
		</main>
	);
}

export default Login;
