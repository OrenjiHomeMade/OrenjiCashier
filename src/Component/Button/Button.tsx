import styles from "./Button.module.css";
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "md" | "sm";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant;
	size?: ButtonSize;
};

export default function Button({ variant = "primary", size = "md", className, children, ...props }: ButtonProps) {
	const classNames = [styles.button, styles[variant], styles[size], className].filter(Boolean).join(" ");

	return (
		<button className={classNames} {...props}>
			{children}
		</button>
	);
}
