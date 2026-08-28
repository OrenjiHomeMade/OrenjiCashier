import type { ReactNode } from "react";
import styles from "./ButtonGroup.module.css";

export type ButtonGroupOption<T extends string> = {
	value: T;
	display: ReactNode;
};

export type ButtonGroupProps<T extends string> = {
	options: ButtonGroupOption<T>[];
	value: T;
	onChange: (value: T) => void;
	disabled?: boolean;
	className?: string;
};

export default function ButtonGroup<T extends string>({
	options,
	value,
	onChange,
	disabled = false,
	className
}: ButtonGroupProps<T>) {
	return (
		<div className={`${styles.buttonGroup} ${className ?? ""}`}>
			{options.map((option) => {
				const isActive = option.value === value;

				return (
					<button
						key={option.value}
						type="button"
						className={`${styles.button} ${isActive ? styles.buttonActive : ""}`}
						onClick={() => onChange(option.value)}
						disabled={disabled}
						aria-pressed={isActive}
					>
						{option.display}
					</button>
				);
			})}
		</div>
	);
}
