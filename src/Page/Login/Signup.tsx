// IMPORT STYLES
import styles from "./Login.module.css";
// IMPORT TYPES
import { type SubmitEvent } from "react";
// IMPORT HOOKS
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// IMPORT COMPONENTS
import { signUp } from "../../Services/supabase/userService";
import OrenjiLogo from "../../assets/Stiker Orenji.svg";

function Signup() {
	const navigate = useNavigate();

	const [email, setEmail] = useState("");

	const [username, setUsername] = useState("");

	const [password, setPassword] = useState("");

	const [confirmPassword, setConfirmPassword] = useState("");

	const [loading, setLoading] = useState(false);

	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		setError(null);

		if (password !== confirmPassword) {
			setError("Passwords do not match.");

			return;
		}

		setLoading(true);

		try {
			await signUp({
				email: email.trim(),
				username: username.trim(),
				password
			});

			navigate("/login", {
				replace: true,

				state: {
					signupSuccess: true
				}
			});
		} catch (error) {
			if (error instanceof Error) {
				setError(error.message);
			} else {
				setError("Unable to create account.");
			}
		} finally {
			setLoading(false);
		}
	}

	return (
		<main className={styles["auth-page"]}>
			<section className={styles["auth-card"]}>
				<img src={OrenjiLogo} alt="Orenji" className={styles["logo"]} />

				<div className={styles["heading"]}>
					<h1>Create account</h1>

					<p>Set up your OrenjiCashier account.</p>
				</div>

				{error && (
					<div className={styles["error-message"]} role="alert">
						{error}
					</div>
				)}

				<form className={styles["form"]} onSubmit={handleSubmit}>
					{/* Email */}

					<div className={styles["field"]}>
						<label htmlFor="email">Email</label>

						<input
							id="email"
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							autoComplete="email"
							placeholder="you@example.com"
							required
							autoFocus
						/>
					</div>

					{/* Username */}

					<div className={styles["field"]}>
						<label htmlFor="username">Username</label>

						<input
							id="username"
							type="text"
							value={username}
							onChange={(event) => setUsername(event.target.value)}
							autoComplete="username"
							placeholder="Choose a username"
							required
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
							autoComplete="new-password"
							placeholder="Create a password"
							required
						/>
					</div>

					{/* Confirm password */}

					<div className={styles["field"]}>
						<label htmlFor="confirm-password">Confirm password</label>

						<input
							id="confirm-password"
							type="password"
							value={confirmPassword}
							onChange={(event) => setConfirmPassword(event.target.value)}
							autoComplete="new-password"
							placeholder="Enter your password again"
							required
						/>
					</div>

					<button type="submit" className={styles["submit-button"]} disabled={loading}>
						{loading ? "Creating account..." : "Create Account"}
					</button>
				</form>

				<div className={styles["footer"]}>
					<span>Already have an account?</span>

					<Link to="/login">Sign in</Link>
				</div>
			</section>
		</main>
	);
}

export default Signup;
