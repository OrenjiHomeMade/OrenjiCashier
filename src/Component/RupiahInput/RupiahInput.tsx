import styles from "./RupiahInput.module.css";
import {
	// forwardRef,
	useEffect,
	useRef,
	type ChangeEvent,
	type ComponentPropsWithRef,
	type FocusEvent
	// type InputHTMLAttributes
} from "react";
import { rupiahFormater } from "../../Utilities/NumberFormater";

export type RupiahInputProps = ComponentPropsWithRef<"input">;

const RupiahInput = ({ ref, className, disabled, onFocus, onBlur, onChange, ...props }: RupiahInputProps) => {
	const inputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		const input = inputRef.current;

		if (!input) {
			return;
		}

		const numericValue = input.value.replace(/\D/g, "");
		const numberValue = numericValue === "" ? 0 : Number(numericValue);

		input.value = numberValue === 0 ? "" : rupiahFormater(numberValue);
	}, []);

	const setRefs = (element: HTMLInputElement | null) => {
		inputRef.current = element;

		if (typeof ref === "function") {
			ref(element);
		} else if (ref) {
			ref.current = element;
		}
	};

	const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
		const numericValue = event.currentTarget.value.replace(/\D/g, "");

		event.currentTarget.value = numericValue;

		onFocus?.(event);
	};

	const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
		const numericValue = event.currentTarget.value.replace(/\D/g, "");
		const numberValue = numericValue === "" ? 0 : Number(numericValue);

		// Give React Hook Form the numeric value.
		event.currentTarget.value = numericValue;
		onBlur?.(event);

		// Format only the value displayed to the user.
		event.currentTarget.value = numberValue === 0 ? "" : rupiahFormater(numberValue);
	};

	const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
		const numericValue = event.currentTarget.value.replace(/\D/g, "");

		// Keep the DOM value numeric while editing.
		event.currentTarget.value = numericValue;

		// Let React Hook Form receive the original event.
		onChange?.(event);
	};

	return (
		<input
			{...props}
			ref={setRefs}
			type="text"
			inputMode="numeric"
			className={className || styles.textInput}
			disabled={disabled}
			onFocus={handleFocus}
			onBlur={handleBlur}
			onChange={handleChange}
		/>
	);
};
RupiahInput.displayName = "RupiahInput";

export default RupiahInput;
