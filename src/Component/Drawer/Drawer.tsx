// IMPORT STYLES
import styles from "./Drawer.module.css";
// IMPORT TYPES
import type { ReactNode, SubmitEvent } from "react";

export type DrawerProps = {
	title: string;
	eyebrow?: string;
	onClose: () => void;
	children: ReactNode;
	footer?: ReactNode;
	onSubmit?: (event: SubmitEvent<HTMLFormElement>) => void;
	disabled?: boolean;
};

export default function Drawer({ title, eyebrow, onClose, children, footer, onSubmit, disabled = false }: DrawerProps) {
	return (
		<div
			className={styles.overlay}
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) {
					onClose();
				}
			}}
		>
			<aside className={styles.drawer} role="dialog" aria-modal="false" aria-labelledby="drawer-title">
				<header className={styles.header}>
					<div>
						{eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
						<h2 id="drawer-title" className={styles.title}>
							{title}
						</h2>
					</div>

					<button
						type="button"
						className={styles.closeButton}
						onClick={onClose}
						disabled={disabled}
						aria-label="Close"
					>
						×
					</button>
				</header>

				{onSubmit ? (
					<form onSubmit={onSubmit} className={styles.form}>
						<div className={styles.content}>{children}</div>
						{footer && <footer className={styles.footer}>{footer}</footer>}
					</form>
				) : (
					<>
						<div className={styles.content}>{children}</div>
						{footer && <footer className={styles.footer}>{footer}</footer>}
					</>
				)}
			</aside>
		</div>
	);
}
