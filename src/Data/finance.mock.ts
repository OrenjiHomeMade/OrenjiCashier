import type { TPaymentMethod, TTransaction, TTransactionItem } from "../Types/transaction";
import type { TProductProfile } from "../Types/product";
import type { TFinanceAllocation } from "../Types/finance";

/* =========================================================
   PRODUCTS
   ========================================================= */

export const mockProducts: TProductProfile[] = [
	{
		productId: 1,
		productCode: "KSG-001",
		productName: "Kopi Susu Gula Aren",
		productCategory: "Kopi",
		description: "Espresso, fresh milk, house-made palm sugar syrup.",
		isActive: true,
		productPrice: 22000,
		costIngredient: 6500,
		costLabor: 2200,
		costPackaging: 900,
		costUtilities: 700
	},
	{
		productId: 2,
		productCode: "AMR-001",
		productName: "Americano",
		productCategory: "Kopi",
		description: "Double shot espresso over water.",
		isActive: true,
		productPrice: 18000,
		costIngredient: 4200,
		costLabor: 1800,
		costPackaging: 700,
		costUtilities: 600
	},
	{
		productId: 3,
		productCode: "CAP-001",
		productName: "Cappuccino",
		productCategory: "Kopi",
		description: "Espresso with steamed milk foam.",
		isActive: true,
		productPrice: 25000,
		costIngredient: 7200,
		costLabor: 2500,
		costPackaging: 900,
		costUtilities: 800
	},
	{
		productId: 4,
		productCode: "MCL-001",
		productName: "Matcha Latte",
		productCategory: "Non-Kopi",
		description: "Ceremonial grade matcha with steamed milk.",
		isActive: true,
		productPrice: 27000,
		costIngredient: 9500,
		costLabor: 2700,
		costPackaging: 900,
		costUtilities: 700
	},
	{
		productId: 5,
		productCode: "CML-001",
		productName: "Choco Malt",
		productCategory: "Non-Kopi",
		description: "Rich chocolate malt blended with milk.",
		isActive: true,
		productPrice: 24000,
		costIngredient: 8200,
		costLabor: 2400,
		costPackaging: 900,
		costUtilities: 700
	},
	{
		productId: 6,
		productCode: "ETM-001",
		productName: "Es Teh Manis",
		productCategory: "Non-Kopi",
		description: "Sweet iced tea, house blend.",
		isActive: true,
		productPrice: 10000,
		costIngredient: 2200,
		costLabor: 1000,
		costPackaging: 500,
		costUtilities: 300
	},
	{
		productId: 7,
		productCode: "CRB-001",
		productName: "Croissant Butter",
		productCategory: "Pastry",
		description: "Butter croissant, baked fresh daily.",
		isActive: true,
		productPrice: 20000,
		costIngredient: 8500,
		costLabor: 2000,
		costPackaging: 600,
		costUtilities: 900
	},
	{
		productId: 8,
		productCode: "RBK-001",
		productName: "Roti Bakar Coklat Keju",
		productCategory: "Pastry",
		description: "Grilled bread with chocolate and cheese.",
		isActive: true,
		productPrice: 18000,
		costIngredient: 6800,
		costLabor: 1800,
		costPackaging: 600,
		costUtilities: 700
	},
	{
		productId: 9,
		productCode: "KTG-001",
		productName: "Kentang Goreng",
		productCategory: "Snack",
		description: "Crispy fries with house seasoning.",
		isActive: true,
		productPrice: 17000,
		costIngredient: 5200,
		costLabor: 1700,
		costPackaging: 700,
		costUtilities: 900
	},
	{
		productId: 10,
		productCode: "PNB-001",
		productName: "Paket Ngopi Berdua",
		productCategory: "Paket Bundling",
		description: "Two coffees and one pastry to share.",
		isActive: true,
		productPrice: 45000,
		costIngredient: 15000,
		costLabor: 4500,
		costPackaging: 1800,
		costUtilities: 1500
	}
];

/* =========================================================
   TRANSACTIONS
   Built with small internal factories so the individual
   transactions below stay readable (product name + qty),
   while every derived field (subtotal, totalCOGS, amount)
   is computed once, consistently.
   ========================================================= */

type TRawItemInput = { productName: string; quantity: number };

function buildItem(id: string, input: TRawItemInput): TTransactionItem {
	const product = mockProducts.find((candidate) => candidate.productName === input.productName);
	if (!product) {
		throw new Error(`Unknown mock product: ${input.productName}`);
	}

	const unitCostLabor = product.costLabor ?? 0;
	const unitCostIngredient = product.costIngredient ?? 0;
	const unitCostUtilities = product.costUtilities ?? 0;
	const unitCostPackaging = product.costPackaging ?? 0;
	const unitPrice = product.productPrice;

	return {
		id,
		productName: product.productName,
		quantity: input.quantity,
		unitPrice,
		unitCostLabor,
		unitCostIngredient,
		unitCostUtilities,
		unitCostPackaging,
		subtotal: unitPrice * input.quantity,
		totalCOGS: (unitCostLabor + unitCostIngredient + unitCostUtilities + unitCostPackaging) * input.quantity
	};
}

let transactionCounter = 0;

function buildTransaction(params: {
	dateIso: string;
	cashier: string;
	paymentMethod: TPaymentMethod;
	items: TRawItemInput[];
}): TTransaction {
	transactionCounter += 1;
	const transactionId = transactionCounter;
	const transactionItems = params.items.map((item, index) => buildItem(`t${transactionId}-i${index + 1}`, item));
	const transactionAmount = transactionItems.reduce((sum, item) => sum + (item.subtotal ?? 0), 0);

	return {
		transactionId,
		transactionCode: `TRX-${String(transactionId).padStart(4, "0")}`,
		cashier: params.cashier,
		transactionAmount,
		transactionDate: new Date(params.dateIso),
		paymentMethod: params.paymentMethod,
		transactionItems
	};
}

// --- August 2026 — regular operations (ids 1–10) ---------------------------
const regularAugustTransactions = [
	buildTransaction({
		dateIso: "2026-08-01T09:15:00",
		cashier: "Dinda",
		paymentMethod: "CASH",
		items: [
			{ productName: "Kopi Susu Gula Aren", quantity: 2 },
			{ productName: "Croissant Butter", quantity: 1 }
		]
	}),
	buildTransaction({
		dateIso: "2026-08-03T10:40:00",
		cashier: "Rangga",
		paymentMethod: "QRIS",
		items: [
			{ productName: "Americano", quantity: 1 },
			{ productName: "Es Teh Manis", quantity: 2 }
		]
	}),
	buildTransaction({
		dateIso: "2026-08-05T13:05:00",
		cashier: "Dinda",
		paymentMethod: "QRIS",
		items: [
			{ productName: "Cappuccino", quantity: 2 },
			{ productName: "Roti Bakar Coklat Keju", quantity: 1 }
		]
	}),
	buildTransaction({
		dateIso: "2026-08-06T16:20:00",
		cashier: "Melati",
		paymentMethod: "CASH",
		items: [
			{ productName: "Matcha Latte", quantity: 1 },
			{ productName: "Kentang Goreng", quantity: 1 }
		]
	}),
	buildTransaction({
		dateIso: "2026-08-08T09:50:00",
		cashier: "Rangga",
		paymentMethod: "CASH",
		items: [{ productName: "Kopi Susu Gula Aren", quantity: 3 }]
	}),
	buildTransaction({
		dateIso: "2026-08-10T11:30:00",
		cashier: "Dinda",
		paymentMethod: "QRIS",
		items: [
			{ productName: "Choco Malt", quantity: 2 },
			{ productName: "Croissant Butter", quantity: 2 }
		]
	}),
	buildTransaction({
		dateIso: "2026-08-12T14:10:00",
		cashier: "Melati",
		paymentMethod: "QRIS",
		items: [
			{ productName: "Americano", quantity: 2 },
			{ productName: "Es Teh Manis", quantity: 1 }
		]
	}),
	buildTransaction({
		dateIso: "2026-08-14T17:45:00",
		cashier: "Rangga",
		paymentMethod: "CASH",
		items: [
			{ productName: "Paket Ngopi Berdua", quantity: 1 },
			{ productName: "Kentang Goreng", quantity: 1 }
		]
	}),
	buildTransaction({
		dateIso: "2026-08-17T10:05:00",
		cashier: "Dinda",
		paymentMethod: "QRIS",
		items: [
			{ productName: "Cappuccino", quantity: 1 },
			{ productName: "Matcha Latte", quantity: 1 }
		]
	}),
	buildTransaction({
		dateIso: "2026-08-19T12:25:00",
		cashier: "Melati",
		paymentMethod: "CASH",
		items: [
			{ productName: "Kopi Susu Gula Aren", quantity: 2 },
			{ productName: "Roti Bakar Coklat Keju", quantity: 2 }
		]
	})
];

// --- August 2026 — weekend bazar event (ids 11–18) --------------------------
const bazarAugustTransactions = [
	buildTransaction({
		dateIso: "2026-08-22T11:00:00",
		cashier: "Dinda",
		paymentMethod: "QRIS",
		items: [
			{ productName: "Kopi Susu Gula Aren", quantity: 4 },
			{ productName: "Es Teh Manis", quantity: 3 }
		]
	}),
	buildTransaction({
		dateIso: "2026-08-22T13:30:00",
		cashier: "Rangga",
		paymentMethod: "CASH",
		items: [
			{ productName: "Americano", quantity: 3 },
			{ productName: "Kentang Goreng", quantity: 2 }
		]
	}),
	buildTransaction({
		dateIso: "2026-08-23T10:15:00",
		cashier: "Melati",
		paymentMethod: "QRIS",
		items: [
			{ productName: "Matcha Latte", quantity: 2 },
			{ productName: "Croissant Butter", quantity: 2 }
		]
	}),
	buildTransaction({
		dateIso: "2026-08-23T12:50:00",
		cashier: "Dinda",
		paymentMethod: "CASH",
		items: [
			{ productName: "Choco Malt", quantity: 3 },
			{ productName: "Roti Bakar Coklat Keju", quantity: 1 }
		]
	}),
	buildTransaction({
		dateIso: "2026-08-23T15:20:00",
		cashier: "Rangga",
		paymentMethod: "QRIS",
		items: [{ productName: "Paket Ngopi Berdua", quantity: 2 }]
	}),
	buildTransaction({
		dateIso: "2026-08-24T11:40:00",
		cashier: "Melati",
		paymentMethod: "CASH",
		items: [
			{ productName: "Cappuccino", quantity: 3 },
			{ productName: "Es Teh Manis", quantity: 2 }
		]
	}),
	buildTransaction({
		dateIso: "2026-08-24T14:05:00",
		cashier: "Dinda",
		paymentMethod: "QRIS",
		items: [{ productName: "Kopi Susu Gula Aren", quantity: 5 }]
	}),
	buildTransaction({
		dateIso: "2026-08-24T16:35:00",
		cashier: "Rangga",
		paymentMethod: "CASH",
		items: [
			{ productName: "Kentang Goreng", quantity: 3 },
			{ productName: "Americano", quantity: 2 }
		]
	})
];

// --- March 2026 — Ramadan bazar (ids 19–26) ---------------------------------
const ramadanMarchTransactions = [
	buildTransaction({
		dateIso: "2026-03-10T16:00:00",
		cashier: "Melati",
		paymentMethod: "QRIS",
		items: [
			{ productName: "Kopi Susu Gula Aren", quantity: 3 },
			{ productName: "Kentang Goreng", quantity: 2 }
		]
	}),
	buildTransaction({
		dateIso: "2026-03-12T17:15:00",
		cashier: "Dinda",
		paymentMethod: "CASH",
		items: [
			{ productName: "Es Teh Manis", quantity: 4 },
			{ productName: "Roti Bakar Coklat Keju", quantity: 2 }
		]
	}),
	buildTransaction({
		dateIso: "2026-03-13T18:00:00",
		cashier: "Rangga",
		paymentMethod: "QRIS",
		items: [
			{ productName: "Paket Ngopi Berdua", quantity: 1 },
			{ productName: "Cappuccino", quantity: 1 }
		]
	}),
	buildTransaction({
		dateIso: "2026-03-15T16:45:00",
		cashier: "Melati",
		paymentMethod: "CASH",
		items: [
			{ productName: "Matcha Latte", quantity: 2 },
			{ productName: "Croissant Butter", quantity: 2 }
		]
	}),
	buildTransaction({
		dateIso: "2026-03-16T17:30:00",
		cashier: "Dinda",
		paymentMethod: "QRIS",
		items: [{ productName: "Kopi Susu Gula Aren", quantity: 4 }]
	}),
	buildTransaction({
		dateIso: "2026-03-18T18:10:00",
		cashier: "Rangga",
		paymentMethod: "CASH",
		items: [
			{ productName: "Choco Malt", quantity: 2 },
			{ productName: "Kentang Goreng", quantity: 2 }
		]
	}),
	buildTransaction({
		dateIso: "2026-03-19T16:50:00",
		cashier: "Melati",
		paymentMethod: "QRIS",
		items: [
			{ productName: "Americano", quantity: 3 },
			{ productName: "Es Teh Manis", quantity: 3 }
		]
	}),
	buildTransaction({
		dateIso: "2026-03-20T17:05:00",
		cashier: "Dinda",
		paymentMethod: "CASH",
		items: [
			{ productName: "Cappuccino", quantity: 2 },
			{ productName: "Roti Bakar Coklat Keju", quantity: 1 }
		]
	})
];

// --- July 2026 — regular operations (ids 27–32) -----------------------------
const regularJulyTransactions = [
	buildTransaction({
		dateIso: "2026-07-02T09:30:00",
		cashier: "Rangga",
		paymentMethod: "QRIS",
		items: [
			{ productName: "Kopi Susu Gula Aren", quantity: 2 },
			{ productName: "Croissant Butter", quantity: 1 }
		]
	}),
	buildTransaction({
		dateIso: "2026-07-05T10:10:00",
		cashier: "Melati",
		paymentMethod: "CASH",
		items: [
			{ productName: "Americano", quantity: 1 },
			{ productName: "Es Teh Manis", quantity: 1 }
		]
	}),
	buildTransaction({
		dateIso: "2026-07-09T13:20:00",
		cashier: "Dinda",
		paymentMethod: "QRIS",
		items: [{ productName: "Cappuccino", quantity: 2 }]
	}),
	buildTransaction({
		dateIso: "2026-07-14T15:00:00",
		cashier: "Rangga",
		paymentMethod: "CASH",
		items: [
			{ productName: "Matcha Latte", quantity: 1 },
			{ productName: "Kentang Goreng", quantity: 1 }
		]
	}),
	buildTransaction({
		dateIso: "2026-07-20T11:15:00",
		cashier: "Melati",
		paymentMethod: "QRIS",
		items: [
			{ productName: "Choco Malt", quantity: 2 },
			{ productName: "Roti Bakar Coklat Keju", quantity: 1 }
		]
	}),
	buildTransaction({
		dateIso: "2026-07-26T17:40:00",
		cashier: "Dinda",
		paymentMethod: "CASH",
		items: [
			{ productName: "Kopi Susu Gula Aren", quantity: 3 },
			{ productName: "Paket Ngopi Berdua", quantity: 1 }
		]
	})
];

export const mockTransactions: TTransaction[] = [
	...regularAugustTransactions,
	...bazarAugustTransactions,
	...ramadanMarchTransactions,
	...regularJulyTransactions
];

/* =========================================================
   FINANCE ALLOCATIONS
   ========================================================= */

export const mockAllocations: TFinanceAllocation[] = [
	{
		id: "alloc-aug-2026-regular",
		name: "August 2026 — Regular Operations",
		status: "DRAFT",
		createdAt: "2026-08-20T09:00:00.000Z",
		updatedAt: "2026-08-20T09:00:00.000Z",
		transactionIds: regularAugustTransactions.map((t) => t.transactionId),
		adjustments: [],
		distributionMode: "PERCENTAGE",
		distribution: [
			{ id: "dist-aug-reg-1", label: "Salary", value: 0 },
			{ id: "dist-aug-reg-2", label: "Reserve", value: 0 },
			{ id: "dist-aug-reg-3", label: "Family", value: 0 },
			{ id: "dist-aug-reg-4", label: "Business", value: 0 }
		]
	},
	{
		id: "alloc-aug-2026-bazar",
		name: "August 2026 — Bazar",
		status: "CONFIRMED",
		createdAt: "2026-08-25T10:00:00.000Z",
		updatedAt: "2026-08-26T14:30:00.000Z",
		transactionIds: bazarAugustTransactions.map((t) => t.transactionId),
		adjustments: [
			{ id: "adj-aug-bazar-1", description: "Sewa tenda & booth", category: "Event Expense", amount: 180000 },
			{
				id: "adj-aug-bazar-2",
				description: "Angkut peralatan ke lokasi",
				category: "Transportation",
				amount: 60000
			},
			{ id: "adj-aug-bazar-3", description: "Makan tim selama bazar", category: "Team Meal", amount: 90000 }
		],
		distributionMode: "PERCENTAGE",
		distribution: [
			{ id: "dist-aug-bazar-1", label: "Salary", value: 40 },
			{ id: "dist-aug-bazar-2", label: "Reserve", value: 25 },
			{ id: "dist-aug-bazar-3", label: "Family", value: 20 },
			{ id: "dist-aug-bazar-4", label: "Business", value: 15 }
		]
	},
	{
		id: "alloc-ramadan-2026",
		name: "Ramadan Bazar 2026",
		status: "DISTRIBUTED",
		createdAt: "2026-03-21T08:00:00.000Z",
		updatedAt: "2026-03-25T16:00:00.000Z",
		transactionIds: ramadanMarchTransactions.map((t) => t.transactionId),
		adjustments: [
			{ id: "adj-ramadan-1", description: "Dekorasi Ramadan", category: "Event Expense", amount: 120000 },
			{ id: "adj-ramadan-2", description: "Bonus tim Ramadan", category: "Bonus", amount: 100000 }
		],
		distributionMode: "FIXED",
		distribution: [
			{ id: "dist-ramadan-1", label: "Salary", value: 60000 },
			{ id: "dist-ramadan-2", label: "Reserve", value: 30000 },
			{ id: "dist-ramadan-3", label: "Family", value: 20000 },
			{ id: "dist-ramadan-4", label: "Business", value: 13300 }
		]
	},
	{
		id: "alloc-jul-2026-regular",
		name: "July 2026 — Regular Operations",
		status: "CONFIRMED",
		createdAt: "2026-08-01T09:00:00.000Z",
		updatedAt: "2026-08-02T11:00:00.000Z",
		transactionIds: regularJulyTransactions.map((t) => t.transactionId),
		adjustments: [
			{ id: "adj-jul-1", description: "Listrik & air Juli", category: "Utilities", amount: 45000 },
			{ id: "adj-jul-2", description: "Transportasi supply", category: "Transportation", amount: 25000 }
		],
		distributionMode: "PERCENTAGE",
		distribution: [
			{ id: "dist-jul-1", label: "Salary", value: 50 },
			{ id: "dist-jul-2", label: "Reserve", value: 30 }
		]
	}
];
