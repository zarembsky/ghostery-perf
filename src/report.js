/**
 * Comparing performance of webRequest handlers
 * of Ghostery, adblocker and antitracking
*/
console.log("AVAILABLE?", typeof localStorage, typeof indexedDB, typeof chrome.storage, typeof chrome.download);
let TOTAL_GH = 0;
let TOTAL_AD = 0;
let TOTAL_AT = 0;

let PAGE_TOTAL_AD = 0;
let	PAGE_TOTAL_AT = 0;
let	PAGE_TOTAL_GH = 0;

let AT_TOP = {duration: 0, handler: "", url: ""};
let AD_TOP = {duration: 0, handler: "", url: ""};
let GH_TOP = {duration: 0, handler: "", url: ""};

// ANTITRACKING. Blocking steps only
const AT_HANDLERS = [
	// OnBeforeRequest
	'cancelRecentlyModified',
	'subdomainChecker.checkBadSubdomain',
	'checkExternalBlocking',
	'blockRules.applyBlockRules',
	'applyBlock',

	//OnBeforeSendHeaders
	'subdomainChecker.checkBadSubdomain',
	'catchMissedOpenListener',
	'overrideUserAgent',
	'blockCookie',

	//OnHeadersReceived
	'blockSetCookie',
];

//ADBLOCKING. Blocking steps only
const AD_HANDLERS = [
	//onBeforeRequest
	'checkContext',
	'checkBlocklist',
];

//GHOSTERY. Blocking steps only
const GH_HANDLERS = [
	//onBeforeRequest
	'ghostery.onBeforeRequest',
];

// Ghostery handlers
// const GH_HANDLERS = [
// 	//onBeforeRequest
// 	'ghostery.onBeforeRequest',
// 	//onBeforeHeadersReceived
// 	'ghostery.onHeadersReceived'
// ];

// //Adblocker handlers
// const AD_HANDLERS = [
// 	'adblocker'
//	'checkContext',
//	'checkBlocklist',
// ];
// 
// //Antitracking handlers 
// const AT_HANDLERS = [
// 'antitracking.onBeforeRequest',
// 'antitracking.onBeforeSendHeaders',
// 'antitracking.onHeadersReceived',
// 'redirectTagger.checkRedirect',
// 'pageLogger.logMainDocument',
// 'skipInvalidSource',
// 'skipInternalProtocols',
// 'checkSameGeneralDomain',
// 'cancelRecentlyModified',
// 'subdomainChecker.checkBadSubdomain',
// 'pageLogger.attachStatCounter',
// 'pageLogger.logRequestMetadata',
// 'checkExternalBlocking',
// 'tokenExaminer.examineTokens',
// 'tokenTelemetry.extractKeyTokens',
// 'domChecker.checkDomLinks',
// 'domChecker.parseCookies',
// 'tokenChecker.findBadTokens',
// 'checkSourceWhitelisted',
// 'checkShouldBlock',
// 'isQSEnabled',
// 'blockRules.applyBlockRules',
// 'applyBlock',

// 'cookieContext.assignCookieTrust',
// 'redirectTagger.confirmRedirect',
// 'checkIsMainDocument',
// 'skipInvalidSource',
// 'skipInternalProtocols',
// 'checkSameGeneralDomain',
// 'subdomainChecker.checkBadSubdomain',
// 'pageLogger.attachStatCounter',
// 'catchMissedOpenListener',
// 'overrideUserAgent',
// 'checkHasCookie',
// 'checkIsCookieWhitelisted',
// 'cookieContext.checkCookieTrust',
// 'cookieContext.checkVisitCache',
// 'cookieContext.checkContextFromEvent',
// 'shouldBlockCookie',
// 'blockCookie',

// 'antitracking.onHeadersReceived',
// 'checkMainDocumentRedirects',
// 'skipInvalidSource',
// 'skipInternalProtocols',
// 'skipBadSource',
// 'checkSameGeneralDomain',
// 'redirectTagger.checkRedirectStatus',
// 'pageLogger.attachStatCounter',
// 'logResponseStats',
// 'checkSetCookie',
// 'shouldBlockCookie',
// 'checkIsCookieWhitelisted',
// 'cookieContext.checkCookieTrust',
// 'cookieContext.checkVisitCache',
// 'cookieContext.checkContextFromEvent',
// 'blockSetCookie'
// ];

export function getPageData() {
	const INCREASE = (PAGE_TOTAL_GH + PAGE_TOTAL_AD + PAGE_TOTAL_AT)/PAGE_TOTAL_GH;
	const retVal = {INCREASE, 
					PAGE_TOTAL_GH, 
					GH_TOP: Object.assign({}, GH_TOP), 
					PAGE_TOTAL_AD, 
					AD_TOP: Object.assign({}, AD_TOP), 
					PAGE_TOTAL_AT,
					AT_TOP: Object.assign({}, AT_TOP)
					}; 
	GH_TOP = {duration: 0, handler: "", url: ""};
	AD_TOP = {duration: 0, handler: "", url: ""};
	AT_TOP = {duration: 0, handler: "", url: ""};

	TOTAL_AD = 0;
	TOTAL_AT = 0;
	TOTAL_GH = 0;
	PAGE_TOTAL_AD = 0;
	PAGE_TOTAL_AT = 0;
	PAGE_TOTAL_GH = 0;

	return retVal;
}

export function collectPageData(data) {
	const { duration, handler, url } = data;
	if(GH_HANDLERS.includes(handler)) {
		PAGE_TOTAL_GH += duration; 
		if(GH_TOP.duration < duration) {
			GH_TOP = { duration, handler, url };
		}
	} else if (AD_HANDLERS.includes(handler)) {
		PAGE_TOTAL_AD += duration; 
		TOTAL_AD += duration;
		if(AD_TOP.duration < duration) {
			AD_TOP = { duration, handler, url };
		}

	} else if(AT_HANDLERS.includes(handler)) {
		PAGE_TOTAL_AT += duration; 
		TOTAL_AT += duration;
		if(AT_TOP.duration < duration) {
			AT_TOP = { duration, handler, url };
		}
	} 
}
