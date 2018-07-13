/**
 * @namespace BackgroundUtils
 */
export const NAVIGATION = 'NAVIGATION';
/**
 * Set the start mark
 * @param  {string} name name of the mark, should be unique
 */
export function perfBegin(name) {
	//console.log(`BEGIN MARK FOR ${name} IS SET`);
	window.performance.mark(`BEGIN_${name}`);
}
/**
 * Set the end mark and measure the duration.
 * @param  {string} name name of the mark
 * @return {number}      duration
 */
export function perfEnd(name, data) {
	let entry = {name: `BEGIN_${name}`, startTime: 0, duration: 0};
	const p = window.performance.getEntriesByName(`BEGIN_${name}`, 'mark') || [];
	if (p && p.length) {
		window.performance.mark(`END_${name}`);
		//console.log(`END MARK FOR ${name} IS SET`);
		window.performance.measure(name, `BEGIN_${name}`, `END_${name}`);

		const measures = window.performance.getEntriesByName(name, 'measure') || [];
		if (measures && measures.length) {
			entry = measures[0];
			if(entry && data) {
				data.handler = name;
				Reporter.report(entry, data);
			} 
		} else {
			console.log("BAD MEASURE");
		}
	} else {
		console.log("BEGIN MARK WAS NOT FOUND FOR", name);
	}
	window.performance.clearMarks(`BEGIN_${name}`);
	window.performance.clearMarks(`END_${name}`);

	window.performance.clearMeasures(name);
	return entry;
}
