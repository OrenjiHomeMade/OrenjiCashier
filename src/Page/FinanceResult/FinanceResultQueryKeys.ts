export const financeQueryKeys = {
	settlements: {
		all: ["settlements"],
		list: () => [...financeQueryKeys.settlements.all, "list"] as const,
		details: () => [...financeQueryKeys.settlements.all, "details"],
		detail: (id: number | null) => [...financeQueryKeys.settlements.details(), id]
	}
};
