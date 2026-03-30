const fs = require("node:fs/promises");

const BASE_URL = "https://www.turkiyeshell.com/pompatest/";
const OPET_URL = "https://api.opet.com.tr/api/fuelprices/allprices";
const PETROL_OFISI_URL = "https://www.petrolofisi.com.tr/akaryakit-fiyatlari";
const OPET_PRICES_URL = "https://api.opet.com.tr/api/fuelprices/prices";
const TOTAL_ENERGIES_CITIES_URL = "https://apimobile.guzelenerji.com.tr/exapi/fuel_price_cities";
const TOTAL_ENERGIES_PRICES_URL = "https://apimobile.guzelenerji.com.tr/exapi/fuel_prices";

const PROVINCES = [
	{ code: "001", name: "ADANA" },
	{ code: "002", name: "ADIYAMAN" },
	{ code: "003", name: "AFYON" },
	{ code: "004", name: "AGRI" },
	{ code: "068", name: "AKSARAY" },
	{ code: "005", name: "AMASYA" },
	{ code: "006", name: "ANKARA" },
	{ code: "007", name: "ANTALYA" },
	{ code: "075", name: "ARDAHAN" },
	{ code: "008", name: "ARTVIN" },
	{ code: "009", name: "AYDIN" },
	{ code: "010", name: "BALIKESIR" },
	{ code: "074", name: "BARTIN" },
	{ code: "072", name: "BATMAN" },
	{ code: "069", name: "BAYBURT" },
	{ code: "011", name: "BILECIK" },
	{ code: "012", name: "BINGOL" },
	{ code: "013", name: "BITLIS" },
	{ code: "014", name: "BOLU" },
	{ code: "015", name: "BURDUR" },
	{ code: "016", name: "BURSA" },
	{ code: "017", name: "CANAKKALE" },
	{ code: "018", name: "CANKIRI" },
	{ code: "019", name: "CORUM" },
	{ code: "020", name: "DENIZLI" },
	{ code: "021", name: "DIYARBAKIR" },
	{ code: "081", name: "DUZCE" },
	{ code: "022", name: "EDIRNE" },
	{ code: "023", name: "ELAZIG" },
	{ code: "024", name: "ERZINCAN" },
	{ code: "025", name: "ERZURUM" },
	{ code: "026", name: "ESKISEHIR" },
	{ code: "027", name: "GAZIANTEP" },
	{ code: "028", name: "GIRESUN" },
	{ code: "029", name: "GUMUSHANE" },
	{ code: "030", name: "HAKKARI" },
	{ code: "031", name: "HATAY" },
	{ code: "076", name: "IGDIR" },
	{ code: "032", name: "ISPARTA" },
	{ code: "034", name: "ISTANBUL" },
	{ code: "035", name: "IZMIR" },
	{ code: "046", name: "K.MARAS" },
	{ code: "078", name: "KARABUK" },
	{ code: "070", name: "KARAMAN" },
	{ code: "036", name: "KARS" },
	{ code: "037", name: "KASTAMONU" },
	{ code: "038", name: "KAYSERI" },
	{ code: "079", name: "KILIS" },
	{ code: "071", name: "KIRIKKALE" },
	{ code: "039", name: "KIRKLARELI" },
	{ code: "040", name: "KIRSEHIR" },
	{ code: "041", name: "KOCAELI" },
	{ code: "042", name: "KONYA" },
	{ code: "043", name: "KUTAHYA" },
	{ code: "044", name: "MALATYA" },
	{ code: "045", name: "MANISA" },
	{ code: "047", name: "MARDIN" },
	{ code: "033", name: "MERSIN" },
	{ code: "048", name: "MUGLA" },
	{ code: "049", name: "MUS" },
	{ code: "050", name: "NEVSEHIR" },
	{ code: "051", name: "NIGDE" },
	{ code: "052", name: "ORDU" },
	{ code: "080", name: "OSMANIYE" },
	{ code: "053", name: "RIZE" },
	{ code: "054", name: "SAKARYA" },
	{ code: "055", name: "SAMSUN" },
	{ code: "063", name: "SANLIURFA" },
	{ code: "056", name: "SIIRT" },
	{ code: "057", name: "SINOP" },
	{ code: "073", name: "SIRNAK" },
	{ code: "058", name: "SIVAS" },
	{ code: "059", name: "TEKIRDAG" },
	{ code: "060", name: "TOKAT" },
	{ code: "061", name: "TRABZON" },
	{ code: "062", name: "TUNCELI" },
	{ code: "064", name: "USAK" },
	{ code: "065", name: "VAN" },
	{ code: "077", name: "YALOVA" },
	{ code: "066", name: "YOZGAT" },
	{ code: "067", name: "ZONGULDAK" }
];

function extractInputValue(html, inputName) {
	const escapedName = inputName.replace(/[$]/g, "\\$");
	const regex = new RegExp(
		`<input[^>]*name=["']${escapedName}["'][^>]*value=["']([\\s\\S]*?)["'][^>]*>`,
		"i"
	);
	const match = html.match(regex);
	if (!match) {
		throw new Error(`Hidden input not found: ${inputName}`);
	}
	return match[1];
}

function extractSessionId(response) {
	const setCookie = response.headers.get("set-cookie") || "";
	const match = setCookie.match(/ASP\.NET_SessionId=([^;]+)/i);
	if (!match) {
		throw new Error("ASP.NET_SessionId cookie not found");
	}
	return match[1];
}

function decodeHtml(text) {
	return text
		.replace(/<br\s*\/?>/gi, " ")
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/\s+/g, " ")
		.trim();
}

function extractCallbackHtml(callbackText) {
	const marker = "'result':'";
	const start = callbackText.indexOf(marker);
	if (start === -1) {
		throw new Error("Callback result block not found");
	}

	const tail = callbackText.slice(start + marker.length);
	const end = tail.lastIndexOf("'})");
	if (end === -1) {
		throw new Error("Callback result block end not found");
	}

	return tail
		.slice(0, end)
		.replace(/\\r\\n/g, "\n")
		.replace(/\\'/g, "'")
		.replace(/\\"/g, '"')
		.replace(/\\\\/g, "\\");
}

function extractSecondRowPrices(html) {
	const rowRegex = /<tr id="cb_all_grdPrices_DXDataRow\d+"[\s\S]*?<\/tr>/g;
	const rows = html.match(rowRegex) || [];

	if (rows.length < 2) {
		throw new Error("Grid row count is less than 2");
	}

	const toAmount = (value) => {
		if (value === "-") {
			return null;
		}

		const normalized = value.replace(/\./g, "").replace(",", ".");
		const parsed = Number(normalized);
		return Number.isFinite(parsed) ? parsed : null;
	};

	// Extract gasoline and diesel from 2nd row
	const secondRow = rows[1];
	const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
	const secondRowCells = [];
	let match;

	while ((match = cellRegex.exec(secondRow)) !== null) {
		secondRowCells.push(decodeHtml(match[1]));
	}

	if (secondRowCells.length < 7) {
		throw new Error("Second row does not contain expected columns");
	}

	// Extract lpg (otogaz) from 1st row
	const firstRow = rows[0];
	const firstRowCells = [];
	const cellRegex2 = /<td[^>]*>([\s\S]*?)<\/td>/g;

	while ((match = cellRegex2.exec(firstRow)) !== null) {
		firstRowCells.push(decodeHtml(match[1]));
	}

	if (firstRowCells.length < 8) {
		throw new Error("First row does not contain expected columns");
	}

	return {
		districtName: secondRowCells[0],
		gasolineAmount: toAmount(secondRowCells[1]),
		dieselAmount: toAmount(secondRowCells[2]),
		lpgAmount: toAmount(firstRowCells[7])
	};
}

async function fetchStateAndCookie() {
	const response = await fetch(BASE_URL, {
		method: "GET",
		headers: {
			"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
			"accept-language": "tr-TR,tr;q=0.9,en;q=0.8",
			"cache-control": "no-cache",
			"pragma": "no-cache",
			"user-agent": "Mozilla/5.0"
		}
	});

	if (!response.ok) {
		throw new Error(`Initial GET failed: ${response.status}`);
	}

	const html = await response.text();
	const sessionId = extractSessionId(response);

	return {
		sessionId,
		viewState: extractInputValue(html, "__VIEWSTATE"),
		viewStateGenerator: extractInputValue(html, "__VIEWSTATEGENERATOR"),
		eventValidation: extractInputValue(html, "__EVENTVALIDATION"),
		callbackState: extractInputValue(html, "cb_all$grdPrices$CallbackState")
	};
}

async function fetchProvincePrices(province) {
	const state = await fetchStateAndCookie();
	const callbackParam = `c0:{"Action":"OnProvinceSelect","Params":{"county_code":null,"province_code":"${province.code}"}}`;

	const form = new URLSearchParams({
		__EVENTTARGET: "",
		__EVENTARGUMENT: "",
		__VIEWSTATE: state.viewState,
		__VIEWSTATEGENERATOR: state.viewStateGenerator,
		__EVENTVALIDATION: state.eventValidation,
		cb_all_cb_province_VI: province.code,
		"cb_all$cb_province": province.name,
		cb_all_cb_province_DDDWS: "0:0:-1:-10000:-10000:0:-10000:-10000:1:0:0:0",
		cb_all_cb_province_DDD_LDeletedItems: "",
		cb_all_cb_province_DDD_LInsertedItems: "",
		cb_all_cb_province_DDD_LCustomCallback: "",
		"cb_all$cb_province$DDD$L": province.code,
		cb_all_cb_county_VI: "",
		"cb_all$cb_county": "",
		cb_all_cb_county_DDDWS: "0:0:-1:-10000:-10000:0:-10000:-10000:1:0:0:0",
		cb_all_cb_county_DDD_LDeletedItems: "",
		cb_all_cb_county_DDD_LInsertedItems: "",
		cb_all_cb_county_DDD_LCustomCallback: "",
		"cb_all$cb_county$DDD$L": "",
		"cb_all$grdPrices$DXSelInput": "",
		"cb_all$grdPrices$DXKVInput": "[]",
		"cb_all$grdPrices$CallbackState": state.callbackState,
		__CALLBACKID: "cb_all",
		__CALLBACKPARAM: callbackParam
	});

	const response = await fetch(BASE_URL, {
		method: "POST",
		headers: {
			"accept": "*/*",
			"accept-language": "tr-TR,tr;q=0.9,en;q=0.8",
			"cache-control": "no-cache",
			"content-type": "application/x-www-form-urlencoded; charset=UTF-8",
			"cookie": `ASP.NET_SessionId=${state.sessionId}`,
			"origin": "https://www.turkiyeshell.com",
			"pragma": "no-cache",
			"referer": BASE_URL,
			"user-agent": "Mozilla/5.0"
		},
		body: form
	});

	if (!response.ok) {
		throw new Error(`POST failed for ${province.code}: ${response.status}`);
	}

	const callbackText = await response.text();
	const html = extractCallbackHtml(callbackText);
	const price = extractSecondRowPrices(html);

	return {
		provinceCode: province.code,
		provinceName: province.name,
		districtName: price.districtName,
		gasolineAmount: price.gasolineAmount,
		dieselAmount: price.dieselAmount,
		lpgAmount: price.lpgAmount
	};
}

function normalizeProvinceCode(value) {
	return String(value).padStart(3, "0");
}

function toBrandPrice(price) {
	return {
		gasolineAmount: price.gasolineAmount,
		dieselAmount: price.dieselAmount,
		lpgAmount: price.lpgAmount
	};
}

function toEmptyBrandPrice() {
	return {
		gasolineAmount: null,
		dieselAmount: null,
		lpgAmount: null
	};
}

function buildGeneratedAt(date = new Date()) {
	const pad = (value) => String(value).padStart(2, "0");
	const day = pad(date.getDate());
	const month = pad(date.getMonth() + 1);
	const year = String(date.getFullYear());
	const hour = pad(date.getHours());
	const minute = pad(date.getMinutes());
	const second = pad(date.getSeconds());

	return {
		day,
		month,
		year,
		hour,
		minute,
		second,
		formatted: `${day}.${month}.${year} ${hour}:${minute}:${second}`
	};
}

function selectPreferredDistrict(records) {
	if (!records.length) {
		return null;
	}

	const merkez = records.find((item) => item.districtName === "MERKEZ");
	return merkez || records[0];
}

function normalizeIstanbulSide(name) {
	const text = String(name || "").toUpperCase();
	if (text.includes("ANADOLU")) {
		return "ANADOLU";
	}
	if (text.includes("AVRUPA")) {
		return "AVRUPA";
	}
	return null;
}

function findIstanbulRecordBySide(records, side) {
	if (!Array.isArray(records) || !records.length) {
		return null;
	}

	return records.find((item) => normalizeIstanbulSide(item?.districtName || item?.provinceName) === side) || null;
}

function mapOpetRecordToPrice(record) {
	const byCode = new Map((record.prices || []).map((p) => [p.productCode, p]));

	const getAmount = (productCode) => {
		const amount = byCode.get(productCode)?.amount;
		return Number.isFinite(amount) ? amount : null;
	};

	return {
		provinceCode: normalizeProvinceCode(record.provinceCode),
		provinceName: record.provinceName,
		districtName: record.districtName,
		gasolineAmount: getAmount("A100"), // Kursunsuz Benzin 95
		dieselAmount: getAmount("A121"), // Motorin UltraForce
		lpgAmount: getAmount("A212") // Fuel Oil
	};
}

async function fetchOpetPriceListByProvinceCode(opetProvinceCode) {
	const url = `${OPET_PRICES_URL}?IncludeAllProducts=true&ProvinceCode=${opetProvinceCode}`;
	const response = await fetch(url, {
		method: "GET",
		headers: {
			accept: "application/json",
			"user-agent": "Mozilla/5.0"
		}
	});

	if (!response.ok) {
		throw new Error(`Opet prices GET failed for ${opetProvinceCode}: ${response.status}`);
	}

	const list = await response.json();
	return Array.isArray(list) ? list : [];
}

async function fetchOpetIstanbulSplitRecords() {
	const [anadoluRaw, avrupaRaw] = await Promise.all([
		fetchOpetPriceListByProvinceCode(34),
		fetchOpetPriceListByProvinceCode(934)
	]);

	const anadoluSelected = selectPreferredDistrict(anadoluRaw.map(mapOpetRecordToPrice));
	const avrupaSelected = selectPreferredDistrict(avrupaRaw.map(mapOpetRecordToPrice));

	const records = [];
	if (anadoluSelected) {
		records.push({
			...anadoluSelected,
			provinceCode: "034",
			provinceName: "ISTANBUL ANADOLU",
			districtName: "ANADOLU"
		});
	}

	if (avrupaSelected) {
		records.push({
			...avrupaSelected,
			provinceCode: "034",
			provinceName: "ISTANBUL AVRUPA",
			districtName: "AVRUPA"
		});
	}

	return records;
}

function normalizePoProvinceCodeFromDistrictId(districtId) {
	const text = String(districtId || "");
	if (text.length >= 3) {
		return text.slice(0, 3);
	}
	return text.padStart(3, "0");
}

function parsePoAmount(text) {
	if (!text || text === "-") {
		return null;
	}
	const normalized = text.replace(/,/g, ".").trim();
	const parsed = Number(normalized);
	return Number.isFinite(parsed) ? parsed : null;
}

function mapPoRowToPrice(rowHtml) {
	const idMatch = rowHtml.match(/data-disctrict-id="(\d{5})"/i);
	const nameMatch = rowHtml.match(/data-disctrict-name="([^"]+)"/i);
	const amountMatches = [
		...rowHtml.matchAll(/<span class="with-tax">\s*([\d.,-]+)\s*<\/span>/gi)
	].map((m) => parsePoAmount(m[1]));

	if (!idMatch || amountMatches.length < 6) {
		return null;
	}

	const districtId = idMatch[1];
	return {
		provinceCode: normalizePoProvinceCodeFromDistrictId(districtId),
		provinceName: nameMatch ? decodeHtml(nameMatch[1]) : null,
		districtName: nameMatch ? decodeHtml(nameMatch[1]) : null,
		gasolineAmount: amountMatches[0],
		dieselAmount: amountMatches[1],
		lpgAmount: amountMatches[5]
	};
}

function mapTotalEnergiesPrice(city, firstPriceRecord) {
	const toAmount = (value) => (Number.isFinite(value) ? value : null);

	return {
		provinceCode: normalizeProvinceCode(city.city_code),
		provinceName: city.city_name,
		districtName: firstPriceRecord?.county_name || null,
		gasolineAmount: toAmount(firstPriceRecord?.kursunsuz_95_excellium_95),
		dieselAmount: toAmount(firstPriceRecord?.motorin),
		lpgAmount: toAmount(firstPriceRecord?.otogaz)
	};
}

async function fetchTotalEnergiesPricesByProvince() {
	const citiesResponse = await fetch(TOTAL_ENERGIES_CITIES_URL, {
		method: "GET",
		headers: {
			accept: "application/json",
			"user-agent": "Mozilla/5.0"
		}
	});

	if (!citiesResponse.ok) {
		throw new Error(`TotalEnergies cities GET failed: ${citiesResponse.status}`);
	}

	const cities = await citiesResponse.json();
	if (!Array.isArray(cities)) {
		throw new Error("TotalEnergies cities response is not an array");
	}

	const byProvince = new Map();

	for (const city of cities) {
		const pricesResponse = await fetch(`${TOTAL_ENERGIES_PRICES_URL}/${city.city_id}`, {
			method: "GET",
			headers: {
				accept: "application/json",
				"user-agent": "Mozilla/5.0"
			}
		});

		if (!pricesResponse.ok) {
			throw new Error(`TotalEnergies prices GET failed for city ${city.city_id}: ${pricesResponse.status}`);
		}

		const priceList = await pricesResponse.json();
		const firstPriceRecord = Array.isArray(priceList) && priceList.length ? priceList[0] : null;
		const provinceCode = normalizeProvinceCode(city.city_code);

		byProvince.set(provinceCode, mapTotalEnergiesPrice(city, firstPriceRecord));
	}

	return byProvince;
}

async function fetchPetrolOfisiPricesByProvince() {
	const response = await fetch(PETROL_OFISI_URL, {
		method: "GET",
		headers: {
			accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
			"accept-language": "tr-TR,tr;q=0.9,en;q=0.8",
			"cache-control": "no-cache",
			pragma: "no-cache",
			"user-agent": "Mozilla/5.0"
		}
	});

	if (!response.ok) {
		throw new Error(`Petrol Ofisi GET failed: ${response.status}`);
	}

	const html = await response.text();
	const rowMatches = [
		...html.matchAll(/<tr class="price-row district-[^"]+"[\s\S]*?<\/tr>/gi)
	];
	if (!rowMatches.length) {
		throw new Error("Petrol Ofisi price rows not found");
	}

	const grouped = new Map();
	for (const match of rowMatches) {
		const price = mapPoRowToPrice(match[0]);
		if (!price?.provinceCode) {
			continue;
		}
		if (!grouped.has(price.provinceCode)) {
			grouped.set(price.provinceCode, []);
		}
		grouped.get(price.provinceCode).push(price);
	}

	const byProvince = new Map();
	for (const [provinceCode, records] of grouped.entries()) {
		// For Istanbul, keep all district records
		if (provinceCode === "034") {
			byProvince.set(provinceCode, records);
		} else {
			const selected = selectPreferredDistrict(records);
			if (selected) {
				byProvince.set(provinceCode, [selected]);
			}
		}
	}

	return byProvince;
}

async function fetchOpetPricesByProvince() {
	const response = await fetch(OPET_URL, {
		method: "GET",
		headers: {
			accept: "application/json",
			"user-agent": "Mozilla/5.0"
		}
	});

	if (!response.ok) {
		throw new Error(`Opet GET failed: ${response.status}`);
	}

	const rawList = await response.json();
	if (!Array.isArray(rawList)) {
		throw new Error("Opet response is not an array");
	}

	const grouped = new Map();
	for (const record of rawList) {
		const provinceCode = normalizeProvinceCode(record.provinceCode);
		if (!grouped.has(provinceCode)) {
			grouped.set(provinceCode, []);
		}
		grouped.get(provinceCode).push(mapOpetRecordToPrice(record));
	}

	const byProvince = new Map();
	for (const [provinceCode, records] of grouped.entries()) {
		// For Istanbul, keep all district records
		if (provinceCode === "034") {
			byProvince.set(provinceCode, records);
		} else {
			const selected = selectPreferredDistrict(records);
			if (selected) {
				byProvince.set(provinceCode, [selected]);
			}
		}
	}

	// Opet uses a separate province code (934) for Istanbul Europe.
	// Force a two-sided Istanbul output by fetching dedicated province price lists.
	try {
		const istanbulSplit = await fetchOpetIstanbulSplitRecords();
		if (istanbulSplit.length) {
			byProvince.set("034", istanbulSplit);
		}
	} catch (error) {
		console.error(`[WARN] Opet Istanbul split fetch failed: ${error.message}`);
	}

	return byProvince;
}

async function main() {
	const shellByProvince = new Map();

	for (const province of PROVINCES) {
		try {
			const data = await fetchProvincePrices(province);
			shellByProvince.set(province.code, data);
			console.log(`[OK] ${province.code} ${province.name}`);
		} catch (error) {
			shellByProvince.set(province.code, {
				provinceCode: province.code,
				provinceName: province.name,
				error: error.message
			});
			console.error(`[ERR] ${province.code} ${province.name}: ${error.message}`);
		}
	}

	let opetByProvince = new Map();
	let opetGlobalError = null;
	try {
		opetByProvince = await fetchOpetPricesByProvince();
		console.log("[OK] OPET allprices fetched");
	} catch (error) {
		opetGlobalError = error.message;
		console.error(`[ERR] OPET fetch failed: ${error.message}`);
	}

	let petrolOfisiByProvince = new Map();
	let petrolOfisiGlobalError = null;
	try {
		petrolOfisiByProvince = await fetchPetrolOfisiPricesByProvince();
		console.log("[OK] Petrol Ofisi prices fetched");
	} catch (error) {
		petrolOfisiGlobalError = error.message;
		console.error(`[ERR] Petrol Ofisi fetch failed: ${error.message}`);
	}

	let totalEnergiesByProvince = new Map();
	let totalEnergiesGlobalError = null;
	try {
		totalEnergiesByProvince = await fetchTotalEnergiesPricesByProvince();
		console.log("[OK] TotalEnergies prices fetched");
	} catch (error) {
		totalEnergiesGlobalError = error.message;
		console.error(`[ERR] TotalEnergies fetch failed: ${error.message}`);
	}

	const result = [];

	for (const province of PROVINCES) {
		const shell = shellByProvince.get(province.code);
		const opetRecords = opetByProvince.get(province.code) || [];
		const poRecords = petrolOfisiByProvince.get(province.code) || [];
		const totalEnergies = totalEnergiesByProvince.get(province.code) || null;

		// Special handling for Istanbul (code 034): output exactly two entries
		if (province.code === "034" && (opetRecords.length > 0 || poRecords.length > 0)) {
			for (const side of ["ANADOLU", "AVRUPA"]) {
				const opet = findIstanbulRecordBySide(opetRecords, side);
				const po = findIstanbulRecordBySide(poRecords, side);

				result.push({
					provinceCode: province.code,
					provinceName: `${province.name} ${side}`,
					districtName: side,
					prices: {
						shell: shell?.error ? toEmptyBrandPrice() : toBrandPrice(shell),
						opet: opetGlobalError
							? toEmptyBrandPrice()
							: opet
								? toBrandPrice(opet)
								: toEmptyBrandPrice(),
						petrolOfisi: petrolOfisiGlobalError
							? toEmptyBrandPrice()
							: po
								? toBrandPrice(po)
								: toEmptyBrandPrice(),
						totalEnergies: totalEnergiesGlobalError
							? toEmptyBrandPrice()
							: totalEnergies
								? toBrandPrice(totalEnergies)
								: toEmptyBrandPrice()
					}
				});
			}
		} else {
			// Normal handling for non-Istanbul provinces
			const opet = (opetRecords && opetRecords[0]) || null;
			const po = (poRecords && poRecords[0]) || null;

			result.push({
				provinceCode: province.code,
				provinceName: province.name,
				prices: {
					shell: shell?.error ? toEmptyBrandPrice() : toBrandPrice(shell),
					opet: opetGlobalError
						? toEmptyBrandPrice()
						: opet
							? toBrandPrice(opet)
							: toEmptyBrandPrice(),
					petrolOfisi: petrolOfisiGlobalError
						? toEmptyBrandPrice()
						: po
							? toBrandPrice(po)
							: toEmptyBrandPrice(),
					totalEnergies: totalEnergiesGlobalError
						? toEmptyBrandPrice()
						: totalEnergies
							? toBrandPrice(totalEnergies)
							: toEmptyBrandPrice()
				}
			});
		}
	}

	const output = {
		generatedAt: buildGeneratedAt(),
		provinces: result
	};

	await fs.writeFile("prices.json", JSON.stringify(output, null, 2), "utf8");
	console.log("prices.json yazildi.");
}

main().catch((error) => {
	console.error("Beklenmeyen hata:", error);
	process.exit(1);
});
