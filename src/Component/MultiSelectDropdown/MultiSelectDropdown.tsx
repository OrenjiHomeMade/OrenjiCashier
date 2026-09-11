import { useEffect, useRef, useState } from "react";
import styles from "./MultiSelectDropdown.module.css";
import ChevronIcon from "../MediaComponent/ChevronIcon";

function MultiSelectDropdown({
	options,
	selectedValues,
	onChange,
	placeholder
}: {
	options: string[];
	selectedValues: string[] | undefined;
	onChange: (values: string[]) => void;
	placeholder: string;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const selected = selectedValues ?? options;
	const allSelected = options.length > 0 && selected.length === options.length;

	useEffect(() => {
		const handleOutsideClick = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleOutsideClick);
		return () => document.removeEventListener("mousedown", handleOutsideClick);
	}, []);

	const selectionLabel = allSelected
		? `All ${placeholder.toLowerCase()}`
		: selected.length === 0
			? `No ${placeholder.toLowerCase()} selected`
			: `${selected.length} ${placeholder.toLowerCase()} selected`;

	return (
		<div className={styles.multiSelect} ref={dropdownRef}>
			<button
				type="button"
				className={styles.multiSelectTrigger}
				aria-expanded={isOpen}
				aria-haspopup="listbox"
				onClick={() => setIsOpen((current) => !current)}
			>
				<span>{selectionLabel}</span>
				<ChevronIcon direction={isOpen ? "up" : "down"} />
			</button>
			{isOpen && (
				<div
					className={styles.multiSelectMenu}
					role="listbox"
					aria-label={placeholder}
					aria-multiselectable="true"
				>
					{options.length > 0 && (
						<button
							type="button"
							className={styles.multiSelectAction}
							onClick={() => onChange(allSelected ? [] : options)}
						>
							{allSelected ? "Unselect all" : "Select all"}
						</button>
					)}
					{options.map((option) => {
						const isSelected = selected.includes(option);
						return (
							<label key={option} className={styles.multiSelectOption}>
								<input
									type="checkbox"
									checked={isSelected}
									onChange={() => {
										onChange(
											isSelected
												? selected.filter((value) => value !== option)
												: [...selected, option]
										);
									}}
								/>
								<span>{option}</span>
							</label>
						);
					})}
				</div>
			)}
		</div>
	);
}

export default MultiSelectDropdown;
