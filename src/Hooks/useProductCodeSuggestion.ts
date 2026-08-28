import { useRef, useState } from "react";

import { getProductCodeSuggestion } from "../Services/supabase/productService";

type UseProductCodeSuggestionParams = {
	mode: "add" | "edit";
	productId?: number;
	onSuggestion?: (suggestion: string) => void;
};

type RequestSuggestionParams = {
	category: string;
	name: string;
};

export default function useProductCodeSuggestion({ mode, productId, onSuggestion }: UseProductCodeSuggestionParams) {
	const [suggestion, setSuggestion] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const requestIdRef = useRef(0);

	const requestSuggestion = ({ category, name }: RequestSuggestionParams) => {
		if (debounceRef.current !== null) {
			clearTimeout(debounceRef.current);
		}

		const trimmedName = name.trim();

		if (!trimmedName) {
			setSuggestion(null);
			setIsLoading(false);
			return;
		}

		setIsLoading(true);

		debounceRef.current = setTimeout(() => {
			const requestId = ++requestIdRef.current;

			void getProductCodeSuggestion({
				productCategory: category,
				productName: trimmedName,
				excludeProductId: mode === "edit" ? productId : undefined
			})
				.then((newSuggestion) => {
					if (requestId !== requestIdRef.current) {
						return;
					}

					setSuggestion(newSuggestion);

					onSuggestion?.(newSuggestion);
				})
				.catch((error) => {
					if (requestId !== requestIdRef.current) {
						return;
					}

					console.error("Failed generating product code suggestion:", error);

					setSuggestion(null);
				})
				.finally(() => {
					if (requestId === requestIdRef.current) {
						setIsLoading(false);
					}
				});
		}, 350);
	};

	const clearSuggestion = () => {
		if (debounceRef.current !== null) {
			clearTimeout(debounceRef.current);
		}

		++requestIdRef.current;

		setSuggestion(null);
		setIsLoading(false);
	};

	return {
		suggestion,
		isLoading,
		requestSuggestion,
		clearSuggestion
	};
}
