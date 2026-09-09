import { useEffect, useState } from "react";

export const useProfitAllocation = (
	settlementId: number | null,
	isNewSettlement: boolean,
	balance: number,
	persistedDistributed: number | null
) => {
	const [profitDistributed, setProfitDistributed] = useState(0);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setProfitDistributed(0);
	}, [settlementId, isNewSettlement, persistedDistributed]);

	const availableProfit = Math.max(balance, 0);
	const clampedDistributed = Math.min(Math.max(profitDistributed, 0), availableProfit);
	const profitRetained = availableProfit - clampedDistributed;

	function resetProfitAllocation() {
		setProfitDistributed(persistedDistributed ?? 0);
	}

	return {
		profitDistributed: clampedDistributed,
		profitRetained,
		setProfitDistributed,
		resetProfitAllocation
	};
};
