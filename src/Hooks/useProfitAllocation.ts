import { useSettlementScopedValue } from "./useSettlementScopedValue";

export const useProfitAllocation = (
	settlementId: number | null,
	isNewSettlement: boolean,
	balance: number,
	persistedDistributed: number | null
) => {
	const {
		value: rawDistributed,
		setValue: setProfitDistributed,
		resetToPersisted: resetProfitAllocation
	} = useSettlementScopedValue<number>({
		resetKey: [settlementId, isNewSettlement],
		computeValue: () => 0, // a fresh allocation always starts at 0 on switch
		persistedValue: persistedDistributed ?? 0
	});

	const availableProfit = Math.max(balance, 0);
	const profitDistributed = Math.min(Math.max(rawDistributed, 0), availableProfit);
	const profitRetained = availableProfit - profitDistributed;

	return { profitDistributed, profitRetained, setProfitDistributed, resetProfitAllocation };
};
