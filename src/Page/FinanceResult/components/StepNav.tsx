import styles from "./StepNav.module.css";
import type { TFinanceStep } from "../../../Types/finance";

const STEPS: { key: TFinanceStep; number: string; label: string }[] = [
	{ key: "SALES", number: "1", label: "Sales" },
	{ key: "ADJUSTMENTS", number: "2", label: "Adjustments" },
	{ key: "SUMMARY", number: "3", label: "Summary" }
];

export type StepNavProps = {
	currentStep: TFinanceStep;
	onStepChange: (step: TFinanceStep) => void;
	disabledSteps?: TFinanceStep[];
};

export default function StepNav({ currentStep, onStepChange, disabledSteps = [] }: StepNavProps) {
	return (
		<nav className={styles.nav} aria-label="Allocation workflow">
			{STEPS.map((step, index) => {
				const isDisabled = disabledSteps.includes(step.key);
				const isActive = step.key === currentStep;

				return (
					<div className={styles.stepWrap} key={step.key}>
						<button
							type="button"
							className={`${styles.step} ${isActive ? styles.active : ""}`}
							onClick={() => !isDisabled && onStepChange(step.key)}
							disabled={isDisabled}
						>
							<span className={styles.number}>{step.number}</span>
							<span className={styles.label}>{step.label}</span>
						</button>
						{index < STEPS.length - 1 && <span className={styles.connector} aria-hidden="true" />}
					</div>
				);
			})}
		</nav>
	);
}
