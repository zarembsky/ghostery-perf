/**
 * Ghostery Page Performance
 *
 * This file generates page-level metrics using the
 * Web Performance API. Installed through manifest.json
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/Window/performance
 *
 * Ghostery-Perf Extension
 *
 * Copyright 2018 Ghostery, Inc. All rights reserved.
 *
 */

/**
 * Use to call init to initialize functionality
 * @var  {Object} initialized to an object with init method as its property
 */
const PageInfo = (function (window, document) {
	/**
	 * Initialize functionality of this script.
	 * @memberOf PagePerformanceContentScript
	 * @package
	 */
	const _initialize = function () {
		const firstContentfulPaint = performance.getEntriesByType('paint').find(entry => { return (entry.name === 'first-contentful-paint')});
		if(firstContentfulPaint) {
			chrome.runtime.sendMessage(
			{
				name: 'recordPageInfo',
				message: {
					duration: firstContentfulPaint.startTime
				}
			});
		} else {
			function perf_observer(list, observer) { 
				const firstMeaningfulPaint = list.getEntries().find(entry => { return (entry.name === 'first-contentful-paint')});
				if(firstMeaningfulPaint) {
					chrome.runtime.sendMessage(
					{
						name: 'recordPageInfo',
						message: {
							duration: firstMeaningfulPaint.startTime
						}
					});
				} 
			}
			var observer2 = new PerformanceObserver(perf_observer); 
			observer2.observe({entryTypes: ["paint"]});	
		}	
	};

	/**
	 * Calculate page domain and latency. Send pageInfo to background.js.
	 * @memberOf PagePerformanceContentScript
	 * @package
	 */
	// const analyzePageInfo = function () {
	// 	// const { host, pathname, protocol } = document.location;
	// 	const pTime = (performance.timing.domContentLoadedEventEnd - performance.timing.requestStart);
	// 	const duration = pTime || 0;
	// 	console.log("HERE*************");
	// 	chrome.runtime.sendMessage(
	// 	{
	// 		name: 'recordPageInfo',
	// 		message: {
	// 			duration: duration
	// 		}
	// 	});
	// };


	/**
	 * Initialize functionality of this script.
	 * @memberOf PagePerformanceContentScript
	 * @package
	 */
	// const _initialize = function () {
	// 	// manually check to see if the onLoad event has fired, since this script runs at document_idle
	// 	// and does not guarantee that onLoad has triggered
	// 	if (document.readyState !== 'complete') {
	// 		document.onreadystatechange = function () {
	// 			if (document.readyState === 'complete') {
	// 				analyzePageInfo();
	// 			}
	// 		};
	// 	} else {
	// 		analyzePageInfo();
	// 	}
	// };

	return {
		/**
		 * Initialize functionality of this script.
		 * @public
		 */
		init() {
			_initialize();
		}
	};
}(window, document));

PageInfo.init();
