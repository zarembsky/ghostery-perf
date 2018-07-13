import {getPageData, collectPageData} from './report';
import * as utils from './utils';
import URLS from './pages';
/**
 * Clear cashes. Requires starting Chrome with
 * --enable-benchmarking --enable-net-benchmarking flags
 */
function clearCaches() {
	if(chrome.benchmarking) {
		chrome.benchmarking.clearCache();
		chrome.benchmarking.clearHostResolverCache();
		chrome.benchmarking.clearPredictorCache();
		chrome.benchmarking.closeConnections();		
	} else {
		//To support benchmarking start Chrome with
		//--enable-benchmarking --enable-net-benchmarking flags
		console.log('BENCHMARKING IS NOT SUPPORTED');
	}
}

let GHOSTERY_VERSION = "VERSION";
let GHOSTERY_CONF;

const DURATION_THRESHOLD = 60000;
const CALM_DOWN_THRESHOLD = 2000;

let TAB_ID;
let INDEX;
let URL;
let OLD_URL;
let REDIRECT;
let ORIGINAL_URL;
let REQUEST_ID;
let COUNT;
let AVERAGE;
let TIMER_ID;
let END_OF_TEST_CALLED;

/**
 * Reset globals to their original values.
 */
function reset() {
	TAB_ID = 0;
	INDEX = 0;
	URL = undefined;
	REDIRECT = false;
	ORIGINAL_URL = undefined;
	REQUEST_ID = undefined;
	COUNT = 0;
	AVERAGE = 0;
	TIMER_ID = undefined;
	END_OF_TEST_CALLED = false;	
}
/**
 * Determine if request is a page-level request (or top-level) redirect.
 * @param  {object}  details request details
 * @return {Boolean}         
 */
function isValidTopLevelNavigation(details) {
	const detailsUrl = utils.processUrl(details.url);
	const currentUrl = utils.processUrl(URL);
	return (details.type === 'main_frame' && (TAB_ID === details.tabId) && (details.frameId === 0) && (detailsUrl.host_with_path === currentUrl.host_with_path));
}
/**
 * Retrieve the next url from the list. Finalises test if there were no more urls.
 * @param  {number} duration latency of the previous url.
 * @return {string}          next url to process or empty string
 */
function getNextUrl(duration) {
	if(URLS.length) {
		if(URLS.length === 1) {
			if(duration) {
				AVERAGE = duration;
				COUNT = 1;
			}
		} else {
			//We count average on sites which are not abnormally long to load.
	  		if(duration && (duration < DURATION_THRESHOLD)) {
			  	COUNT++;
		  		AVERAGE += duration;
	  		}
		  	if(++INDEX < URLS.length)	{

		  		return URLS[INDEX];
			} 
		}
		AVERAGE = AVERAGE/COUNT;
	}

	return "END_OF_LIST";
}

/**
 * Handle onBeforeRequest event
 * @param  {object} details request details
 */
function onBeforeRequest(details) {
	//frameId === 0 indicates the navigation event ocurred in the content window, not a subframe
	if (isValidTopLevelNavigation(details)) {
		if(!REDIRECT) {
			REQUEST_ID = details.requestId;
			//Url we are navigating to
			console.log("NEXT URL:", details.url);

			//Set timer to kill navigation if it takes too long.
			if(TIMER_ID) {
				clearTimeout(TIMER_ID);
				TIMER_ID = undefined;
			}
			TIMER_ID = setTimeout(processEndOfAbortedNavigation, DURATION_THRESHOLD);
	    } 
	}
}
/**
 * Process onBeforeRedirect event. Sets flag. 
 * @param  {object}  details request details
 */
function onBeforeRedirect(details) {
	if (isValidTopLevelNavigation(details))	{
		if(details.requestId === REQUEST_ID) {
			REDIRECT = true;
		}
	} 
}

/**
 * Handle onErrorOccured event.
 * @param  {object} details details of the request
 */
function onErrorOccured(details) {
	if (isValidTopLevelNavigation(details)) {
		const { requestId, url} = details; 
		processEndOfNavigation(requestId, url, 0);
	}
}

/**
 * Process end of a single navigation in case of completion of the page requeast, or navigation error.
 * @param  {object} details of the page request.
 * @param  {boolean} useDuration do we have to use duration value while calculating the next page url?
 */
function processEndOfNavigation(requestId, currentUrl, duration) {
	if(requestId === REQUEST_ID) {
		REDIRECT = false;
		if(TIMER_ID) {
			clearTimeout(TIMER_ID);
			TIMER_ID = undefined;
		}
		if(duration) {
			console.log(`DURATION: ${duration} URL: ${URL} FINAL URL: ${currentUrl}`);
		}

		clearCaches();
		const url = getNextUrl(duration);
		if(url) {
		  	setTimeout(() => {
		  		REDIRECT = false;
		  		URL = url;
		  		if(URL !== "END_OF_LIST") {
					chrome.tabs.update(TAB_ID, {url:URL}); 
		  		} else {
		  			//To be sure that it always ends
		  			processTheEndOfTest(RESULTS, AVERAGE);
		  		}
		  	}, CALM_DOWN_THRESHOLD, url);
		} 
	}
}

/**
 * Process navigation which was aborted due to exceeding of the time threshold.
 * Ends up navigating to the next url in the list.
 */
function processEndOfAbortedNavigation() {
	console.log(`NAVIGATION ${URL} FAILED TO END`);
	//console.log(`PERF END FOR ${URL}`);
	//perf.perfEnd(perf.NAVIGATION);
	clearCaches();
	REDIRECT = false;
	URL = getNextUrl(0); 
	if(URL !== "END_OF_LIST") {
	    chrome.tabs.update(TAB_ID, {url:URL});
	} else {
		//To be sure that it always ends
		processTheEndOfTest(RESULTS, AVERAGE);
	}
}

/**
 * Process end of the test. Output results to console, indexeddb, internal results.html page and regular file.
 * Just showing how it all can be done. We can cut it down to just file. 
 * @param  {object} results array of results across all pages in the test.
 * @param  {number} average average of latencies across all pages of the test.
 */
function processTheEndOfTest(results, average) {
	if(!END_OF_TEST_CALLED) {
		END_OF_TEST_CALLED = true;
		console.log("RESULTS", results);
		console.log("AVERAGE:", average);
		let db;
		createDataSource(db)
		.then(db => {
			dbPut(db, results)
			.then(() => {
				dbGet(db)
				.then(items => {
					console.log("GOT IT BACK FROM DB", items);
					db.close();
					chrome.tabs.update(TAB_ID, {url:chrome.runtime.getURL('./app/templates/results.html')});
				});
			}); 
		})
		.catch(err=> {
			if(db) {
				db.close();
			}
			console.log("DID NOT WORK OUT", err);
		});
	}
}

//////////// Listener to messages coming from Ghostery /////////////
chrome.runtime.onConnectExternal.addListener(function(port) {
  port.onMessage.addListener(messageHandler);
});
/**
 * Handle messages coming from Ghostery extension
 * @param  {object} data message content
 */
function messageHandler(data) {
	if(OLD_URL && (OLD_URL !== URL)) {
		const retVal = getPageData();

		console.log(utils.formatDataEntry(OLD_URL, retVal));

 		let result = RESULTS.find(el => { return (el.page_url === OLD_URL);});
 		if(result) {
 			result.dataArray.push(retVal);
 		} else {
 			RESULTS.push({ page_url: OLD_URL, dataArray: [retVal]});
 		}
		OLD_URL = URL;

		if(URL === "END_OF_LIST") {
			//This is the end of the test
			processTheEndOfTest(RESULTS, AVERAGE);
		}
	} else {
		collectPageData(data);
	}
}

////////////// Listeners for navigation events ////////////////////
chrome.webRequest.onBeforeRequest.addListener(onBeforeRequest, {
		urls: ['http://*/*', 'https://*/*']
	});
chrome.webRequest.onBeforeRedirect.addListener(onBeforeRedirect, {
		urls: ['http://*/*', 'https://*/*']
	});
chrome.webRequest.onErrorOccurred.addListener(onErrorOccured, {
		urls: ['http://*/*', 'https://*/*']
	});

///////////// Listener for messages from results.html page //////////////////
chrome.runtime.onMessage.addListener(onMessage);

/**
 * Handle messages coming from internal page Results.html.
 * @param  {object} request
 * @param  {object} sender
 * @param  {object} callback
 */
function onMessage(request, sender, callback) {
	const { name, message } = request;
	if(name === 'get_results') {
		const results = {
			filename: NAVIGATION_STORE, 
			version: GHOSTERY_VERSION,
			at: AT,
			ab: AB,
			sb: SB,
			gb: GB,
			gp: GP, 
			content: RESULTS, 
			average: AVERAGE
		};
		callback(results);
		return true;
	} else if (name ===	'recordPageInfo') {
		if(TAB_ID === sender.tab.id) {
			callback();
			processEndOfNavigation(REQUEST_ID, sender.url, message.duration);
			return true;
		}
	}

	return false;
}

//////////////// Listener to the Ghostery-perf button click which starts the test /////////////
let	AT = -1;
let	AB = -1;
let	SB = -1;
let	GB = -1;
let	GP = -1;

chrome.browserAction.onClicked.addListener((evt) => {
	//This is the current id of Ghostery. For dev builds
	//it is determined by the folder you load Ghostery from.
	//Does not change when you refresh or remove/reload
	const RECEIVER_ID = 'hbjkpfcoaefgbocbknhjpbfjeeoaooko';

	//One time simple message to get static info from Ghostery
	chrome.runtime.sendMessage(RECEIVER_ID, {name: "perfReady"},
	  function(data) {
	  	if(chrome.runtime.lastError) {
	  		console.log("CANNOT GET STATIC INFO. GHOSTERY INSTALLED?", chrome.runtime.lastError);
	  	} else {
			console.log("STATIC DATA RECEIVED", data);
			GHOSTERY_VERSION = data.ghostery_version;
			//State of the modules
			AT = data.at; 	// antitracking
			AB = data.ab;  	// adblocking
			SB = data.sb; 	// smart blocking
			GB = data.gb; 	// 'classic' Ghostery global blocking. 0 - nothing blocked, 1 - all blocked, 2 - in between
			GP = data.gp; 	// pause Ghostery
		}
		// Requires launching Chrome with benchmark flags to work
		clearCaches();
		// Setting initial values for globals
		reset();
		// Start navigation from the first url in the list
		utils.getActiveTab(tab => {
			if(tab && tab.id) {
				TAB_ID = tab.id;
				URL = URLS[ 0 ];
				if(URL) {
					OLD_URL = URL;
					REDIRECT = false;
					chrome.tabs.update(TAB_ID, {url:URL}); 
				}
			}
		});
	});
});

//////////// IndexedDB //////////////////////////////////////////
/// Possible way to persist test data. This is how you do it, if you want to use it. 
/// Keep it here for reference.  
const DB_NAME = "perfData";
let DB;
let REQUEST;
let RESULTS = [];
let NAVIGATION_STORE;

//March 2018
const baseTime = new Date(2018, 3).getTime();

/**
 * Build unique (to 1 sec) DB version
 * @return {number} DB version to use in 'open' call
 * New version triggers 'onversionchange' event and 'onupgradeneeded' call
 * where a new data source is created.
 */
function buildDBVersion() {
	return Math.floor((new Date().getTime() - baseTime)/1000);
}

/**
 * Build unique data source and file name. 
 */
function buildDataSourceName() {
	const version = GHOSTERY_VERSION.replace(/\./g, '_');
	const dateTime = new Date();
	let dateString = `${version}_${dateTime.toLocaleString()}`;
	return `${dateString.replace(/[\/|\,|\ |\:]/g, '_').toUpperCase()}`;
}
/**
 * Create new data source in the database
 * @param  {object} db database
 * @return {promise}    
 */
function createDataSource(db) {
	return new Promise ((resolve, reject) => {
		//We grow version to trigger upgradeneeded event
		const request = indexedDB.open(DB_NAME, buildDBVersion());
		request.onupgradeneeded = e => {
			console.log('Successfully opened db and created new store');
			db = e.target.result;
			NAVIGATION_STORE = buildDataSourceName();
			//Create new store for each run
			db.createObjectStore(NAVIGATION_STORE, { keyPath: 'page_url' });
		};
		request.onerror = e => {
			console.log('database error', e);
			reject(e);
		};
		request.onsuccess = e => {
			resolve(db);
		};
	});
}
/**
 * Put data to data source
 * @param  {object} db database
 * @param  {object} results results of the test keyed by url
 * @return {promise}  
 */
function dbPut(db, results) {
	return new Promise((resolve, reject) => {
	 	const transaction = db.transaction(NAVIGATION_STORE, 'readwrite');
	 	const objectStore = transaction.objectStore(NAVIGATION_STORE);
		console.log("WRITING TO DATABASE");
		results.forEach(result => {
			const putData = objectStore.put(result);
			putData.onerror = function (error) {
			    console.log('DB PUT ERROR!!!!!!!!!!');
			    reject(error);
			};
		});
		transaction.oncomplete = function(evt) {
			console.log("DB PUT COMPLETED");
			resolve();
		}
	});
}
/**
 * Get data from data source
 * @param  {object} db database
 * @return {promise}  
 */
function dbGet(db) {
	return new Promise((resolve, reject) => {
	    const transaction = db.transaction(NAVIGATION_STORE, 'readonly');
	    const store = transaction.objectStore(NAVIGATION_STORE);
	    const items = [];
	 
	    var cursorRequest = store.openCursor();
	 
	    cursorRequest.onerror = function(error) {
	        console.log('CURSOR ERROR', error);
	        reject(error);
	    };
	 
	    cursorRequest.onsuccess = function(evt) {                    
	        var cursor = evt.target.result;
	        if (cursor) {
	            items.push(cursor.value);
	            cursor.continue();
	        }
	    };

	    transaction.oncomplete = function(evt) { 
	    	resolve(items);
//	    	self.postMessage({origin: 'perf-worker', name:'exportPerfData', message: items});
	    };
	});
}

