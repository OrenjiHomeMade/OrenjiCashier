// Utilities/guardAction.ts
export function guardAction(shouldGuard: boolean, message: string, action: () => void) {
	if (shouldGuard) {
		const confirmed = window.confirm(message);
		if (!confirmed) return;
	}
	action();
}
