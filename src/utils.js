import url from 'url';
/**
 * Helper called by openNewTab.
 * @memberOf BackgroundUtils
 * @private
 *
 * @param  {Object} data 	info about the new tab
 */
function _openNewTab(data) {
	getActiveTab((tab) => {
		if (tab) {
			chrome.tabs.create({
				url: data.url,
				active: data.become_active || false,
				openerTabId: tab.id,
				index: tab.index + 1
			});
		} else {
			chrome.tabs.create({
				url: data.url,
				active: data.become_active || false
			});
		}
	});
}
/**
 * Open a new browser tab.
 * @memberOf BackgroundUtils
 *
 * @param  {Object} data 	info about the new tab
 */
export function openNewTab(data) {
	if (false/*IS_FIREFOX*/) {
		chrome.tabs.create({
			url: data.url,
			active: data.become_active || false
		});
	} else if (data.tab_id) {
		chrome.tabs.get(data.tab_id, (tab) => {
			if (tab) {
				chrome.tabs.create({
					url: data.url,
					active: data.become_active || false,
					openerTabId: tab.id,
					index: tab.index + 1,
					windowId: tab.windowId
				});
			} else {
				_openNewTab(data);
			}
		});
	} else {
		_openNewTab(data);
	}
}

export function getActiveTab(callback) {
	chrome.tabs.query({
		active: true,
		currentWindow: true //The current window is the window that contains the code that is currently executing
	}, function(tabs) {
		callback(tabs[0]);
	});
}

/**
 * Process URLs to remove query strings, hashes, schemes, etc.
 * @memberOf BackgroundUtils
 *
 * @param  {string} src 	the source url
 * @return {Object} 		contains url parts as properties
 */
export function processUrl(src) {
	if (!src) {
		return {};
	}
	const res = url.parse(src);
	const index = res.href ? res.href.indexOf('?') : -1;

	return {
		protocol: res.protocol ? res.protocol.substr(0, res.protocol.length - 1) : '',
		host: res.hostname || '',
		path: res.pathname ? res.pathname.substr(1) : '',
		host_with_path: (res.host || '') + (res.pathname || ''),
		anchor: res.hash ? res.hash.substr(1) : '',
	};
}

export function isValidUrl(parsedURL) {
	if (parsedURL.protocol.startsWith('http') && parsedURL.host.includes('.') && /[A-Za-z]/.test(parsedURL.host) && !parsedURL.path.includes('_/chrome/newtab')) {
		return true;
	}

	return false;
}

export function injectScript(tabId, scriptfile, cssfile, runAt) {
	return new Promise((resolve, reject) => {
		chrome.tabs.executeScript(tabId, { file: scriptfile, runAt }, (result) => {
			if (chrome.runtime.lastError) {
				console.log('injectScript error', chrome.runtime.lastError);
				reject(new Error(chrome.runtime.lastError));
				return;
			}

			if (cssfile) {
				chrome.tabs.insertCSS(tabId, { file: cssfile, runAt }, () => {
					if (chrome.runtime.lastError) {
						console.log('insertCSS error', chrome.runtime.lastError);
						reject(new Error(chrome.runtime.lastError));
						return;
					}
					resolve();
				});
			} else {
				resolve();
			}
		});
	});
}

export function sendMessage(name, message, callback = function () {}) {
	chrome.tabs.sendMessage({
		name,
		message
	}, callback);
}

export function sendMessageInPromise(name, message) {
	return new Promise(((resolve, reject) => {
		chrome.runtime.sendMessage({
			name,
			message,
		}, (response) => {
			if (chrome.runtime.lastError) {
				log(chrome.runtime.lastError, name, message);
				resolve(null);
			}
			resolve(response);
		});
	}));
}

export function formatDataEntry(url, entry) {
	const { PAGE_TOTAL_GH, GH_TOP, PAGE_TOTAL_AD, AD_TOP, PAGE_TOTAL_AT, AT_TOP } = entry;
	const INCREASE = ((PAGE_TOTAL_GH + PAGE_TOTAL_AD + PAGE_TOTAL_AT)/PAGE_TOTAL_GH).toFixed(2);
	return `
	PAGE: ${url}
	GH_LATENCY: ${entry.PAGE_TOTAL_GH.toFixed(2)}
	GH_TOP: ${entry.GH_TOP.duration.toFixed(2)}, ${entry.GH_TOP.handler}, ${entry.GH_TOP.url}
	AD_LATENCY: ${entry.PAGE_TOTAL_AD.toFixed(2)}
	AD_TOP: ${AD_TOP.duration.toFixed(2)}, ${AD_TOP.handler}, ${AD_TOP.url}
	AT_LATENCY: ${PAGE_TOTAL_AT.toFixed(2)}
	AT_TOP: ${AT_TOP.duration.toFixed(2)}, ${AT_TOP.handler}, ${AT_TOP.url}

	Increase: ${INCREASE} times
	`;
}

