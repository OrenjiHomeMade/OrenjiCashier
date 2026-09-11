import { useState } from "react";

function keysEqual(a: readonly unknown[], b: readonly unknown[]): boolean {
	return a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
}

type UseSettlementScopedValueParams<T> = {
	resetKey: readonly unknown[];
	computeValue: () => T;
	persistedValue: T;
};

export function useSettlementScopedValue<T>({
	resetKey,
	computeValue,
	persistedValue
}: UseSettlementScopedValueParams<T>) {
	const [prevResetKey, setPrevResetKey] = useState(resetKey);
	const [editedValue, setEditedValue] = useState<T | null>(null);
	const [isEdited, setIsEdited] = useState(false);

	// Adjusting state during render, not in an effect: if the scope changed,
	// discard the edit right now, in this render, before anything paints.
	if (!keysEqual(prevResetKey, resetKey)) {
		setPrevResetKey(resetKey);
		setIsEdited(false);
		setEditedValue(null);
	}

	// Not edited -> derive fresh from computeValue() every render.
	// No state, no effect, nothing to keep "in sync" because it was never stored.
	const value = isEdited ? (editedValue as T) : computeValue();

	function setValue(next: T) {
		setIsEdited(true);
		setEditedValue(next);
	}

	function resetToPersisted() {
		setEditedValue(persistedValue);
		setIsEdited(true); // freeze at persisted value until next scope change or edit
	}

	function clearEdit() {
		setIsEdited(false);
		setEditedValue(null);
	}

	return { value, setValue, isEdited, resetToPersisted, clearEdit };
}
