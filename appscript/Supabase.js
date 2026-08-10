const properties = PropertiesService.getScriptProperties();

const SUPABASE_URL = properties.getProperty("SUPABASE_URL");

const SUPABASE_SERVICE_ROLE_KEY = properties.getProperty("SUPABASE_SERVICE_ROLE_KEY");

const PRODUCT_SHEET_NAME = "ProductCatalog";

function syncProductToSupabase() {
	const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PRODUCT_SHEET_NAME);

	const result = getSheetProductData(sheet);

	if (!result) {
		Logger.log("No product data.");
		return;
	}

	const [products, values, column] = result;

	if (!products || products.length === 0) {
		Logger.log("No products to synchronize.");
		return;
	}

	// 1. Upload current Sheet snapshot to staging
	insertProductToSupabase(products, "staging");

	// 2. Ask PostgreSQL to synchronize
	const changes = syncProducts();

	Logger.log(`Product changes: ${changes.length}`);

	// 3. Apply changes back to Sheet
	applyProductChangesToSheet(sheet, values, column, changes);
}

function applyProductChangesToSheet(sheet, values, column, changes) {
	const productIdColumn = column["ProductID"];
	const productCodeColumn = column["Product Code"];

	const deleteChanges = changes.filter((row) => row.action === "DELETE");

	const updateChanges = changes.filter((row) => row.action === "UPDATE");

	const insertChanges = changes.filter((row) => row.action === "INSERT");

	// ============================================================
	// UPDATE
	// ============================================================

	updateChanges.forEach((product) => {
		const row = findProductRowById(sheet, product.product_id, productIdColumn);

		if (row === -1) {
			Logger.log(`UPDATE: ProductID ${product.product_id} not found in Sheet.`);
			return;
		}

		sheet.getRange(row, 1, 1, Object.keys(column).length).setValues([productToSheetRow(product)]);
	});

	// ============================================================
	// INSERT
	// ============================================================

	insertChanges.forEach((product) => {
		// First try Product Code.
		let row = findProductRow(sheet, productCodeColumn, product.product_code);

		if (row !== -1) {
			// Existing Sheet row:
			// simply write the complete database record.
			sheet.getRange(row, 1, 1, Object.keys(column).length).setValues([productToSheetRow(product)]);

			return;
		}

		// Product doesn't exist in Sheet.
		// Append a completely new row.
		sheet.appendRow(productToSheetRow(product));

		// ============================================================
		// DELETE
		// ============================================================

		deleteChanges.forEach((product) => {
			const row = findProductRowById(sheet, product.product_id, productIdColumn);

			if (row !== -1) {
				sheet.deleteRow(row);
			}
		});
	});
}

function syncProducts() {
	const response = UrlFetchApp.fetch(`${SUPABASE_URL}/rest/v1/rpc/sync_products`, {
		method: "post",
		headers: {
			apikey: SUPABASE_SERVICE_ROLE_KEY,
			Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
		},
		muteHttpExceptions: true
	});

	const statusCode = response.getResponseCode();
	const responseBody = response.getContentText();

	Logger.log(`Sync response: ${statusCode}`);
	Logger.log(responseBody);

	if (statusCode < 200 || statusCode >= 300) {
		throw new Error(`Supabase sync error ${statusCode}: ${responseBody}`);
	}

	return JSON.parse(responseBody);
}

function initialSyncProductsToSupabase() {
	const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PRODUCT_SHEET_NAME);
	const [products, values, column] = getSheetProductData(sheet);

	if (!products) {
		Logger.log("No Syncing Required");
		return;
	}

	const insertedProducts = insertProductToSupabase(products, "products");

	// Write generated ProductID back to Google Sheets.
	insertedProducts.forEach((product) => {
		const productCode = product.product_code;

		const productRow = values.findIndex(
			(row, index) => index > 0 && String(row[column["Product Code"]]).trim() === productCode
		);

		if (productRow === -1) {
			return;
		}

		const sheetRow = productRow + 1;

		sheet.getRange(sheetRow, column["ProductID"] + 1).setValue(product.product_id);
	});
}

function getSheetProductData(sheet) {
	if (!sheet) {
		throw new Error(`Sheet "${PRODUCT_SHEET_NAME}" not found.`);
	}

	const values = sheet.getDataRange().getValues();

	if (values.length < 2) {
		Logger.log("No product data found.");
		return;
	}

	const headers = values[0];

	const column = {};
	headers.forEach((header, index) => {
		column[header] = index;
	});

	const products = values
		.slice(1)
		.filter((row) => row[column["Product Code"]])
		.map((row) => ({
			product_id: row[column["ProductID"]] ? Number(row[column["ProductID"]]) : null,
			product_code: String(row[column["Product Code"]]).trim(),
			product_name: String(row[column["Product Name"]]).trim(),
			product_category: row[column["Category"]] ? String(row[column["Category"]]).trim() : null,
			product_price: Number(row[column["Price"]]),
			product_image: row[column["Image"]] ? String(row[column["Image"]]).trim() : null,
			is_active: Boolean(row[column["Active"]]),
			description: row[column["Description"]] ? String(row[column["Description"]]).trim() : null
		}));

	if (products.length === 0) {
		Logger.log("No products to synchronize.");
		return;
	}
	console.log(products);
	return [products, values, column];
}

function insertProductToSupabase(products, type = "staging") {
	if (!(type in { staging: true, products: true })) {
		throw new Error(`Invalid product insert type: ${type}`);
	}

	const payload = products.map((product) => {
		const normalized = {
			product_code: product.product_code ?? null,
			product_name: product.product_name ?? null,
			product_category: product.product_category ?? null,
			product_price: product.product_price ?? null,
			product_image: product.product_image ?? null,
			is_active: product.is_active ?? null,
			description: product.description ?? null
		};

		if (type === "staging") {
			normalized.product_id = product.product_id ?? null;
		}

		return normalized;
	});

	const tableName = type === "staging" ? "product_sync" : "products";

	const response = UrlFetchApp.fetch(`${SUPABASE_URL}/rest/v1/${tableName}`, {
		method: "post",
		contentType: "application/json",
		headers: {
			apikey: SUPABASE_SERVICE_ROLE_KEY,
			Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
			Prefer: "return=representation"
		},
		payload: JSON.stringify(payload),
		muteHttpExceptions: true
	});

	const statusCode = response.getResponseCode();
	const responseBody = response.getContentText();

	Logger.log(`Supabase response: ${statusCode}`);
	Logger.log(responseBody);

	if (statusCode < 200 || statusCode >= 300) {
		throw new Error(`Supabase error ${statusCode}: ${responseBody}`);
	}

	const insertedProducts = JSON.parse(responseBody);

	Logger.log(`Successfully inserted ${insertedProducts.length} products.`);

	return insertedProducts;
}

function parsePrice(value) {
	if (typeof value === "number") {
		return value;
	}

	if (!value) {
		return 0;
	}

	// "Rp10,000" → 10000
	const normalized = String(value)
		.replace(/Rp/gi, "")
		.replace(/[.,\s]/g, "");

	const price = Number(normalized);

	if (Number.isNaN(price)) {
		throw new Error(`Invalid price: ${value}`);
	}

	return price;
}

function findProductRow(sheet, productCodeColumn, productCode) {
	const values = sheet.getRange(2, productCodeColumn + 1, sheet.getLastRow() - 1, 1).getValues();

	for (let i = 0; i < values.length; i++) {
		if (String(values[i][0]).trim() === productCode) {
			return i + 2;
		}
	}

	return -1;
}

function testSingleProductInsert() {
	const properties = PropertiesService.getScriptProperties();

	const SUPABASE_URL = properties.getProperty("SUPABASE_URL");
	const SUPABASE_SERVICE_ROLE_KEY = properties.getProperty("SUPABASE_SERVICE_ROLE_KEY");

	const product = {
		product_code: "TEST-001",
		product_name: "Test Product",
		product_category: "Test",
		product_price: 10000,
		product_image: null,
		is_active: true,
		description: "Test"
	};

	const response = UrlFetchApp.fetch(`${SUPABASE_URL}/rest/v1/products`, {
		method: "post",
		contentType: "application/json",
		headers: {
			apikey: SUPABASE_SERVICE_ROLE_KEY,
			Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
			Prefer: "return=representation"
		},
		payload: JSON.stringify(product),
		muteHttpExceptions: true
	});

	Logger.log(response.getResponseCode());
	Logger.log(response.getContentText());
}

function findProductRowById(sheet, productId, productIdColumn) {
	const lastRow = sheet.getLastRow();

	if (lastRow < 2) {
		return -1;
	}

	const values = sheet.getRange(2, productIdColumn + 1, lastRow - 1, 1).getValues();

	for (let i = 0; i < values.length; i++) {
		if (Number(values[i][0]) === Number(productId)) {
			return i + 2;
		}
	}

	return -1;
}

function productToSheetRow(product) {
	return [
		product.product_id,
		product.product_code,
		product.product_name,
		product.product_category,
		product.product_price,
		product.product_image,
		product.is_active,
		product.description
	];
}
