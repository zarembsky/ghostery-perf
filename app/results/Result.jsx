/**
 * Software Result Component
 *
 * Ghostery Performance Extension
 * https://www.ghostery.com/
 *
 * Copyright 2018 Ghostery, Inc. All rights reserved.
 *
 */
/**
 * @namespace ResultsClasses
 */
import React, { Component } from 'react';
/**
 * @class Handles result entry on internal Results.html page
 * which displays results for all pages in the test
 * @memberOf  ResultsClasses
 */
class Result extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			expanded: false
		};
		this.toggleResult = this.toggleResult.bind(this);
	}

	/**
	 * Lifecycle event
	 */
	componentWillReceiveProps(nextProps) {
		this.setState({ expanded: nextProps.expandedAll });
	}

	/**
	 * Toggle expansion of result.
	 */
	toggleResult(evt) {
		this.setState({ expanded: !this.state.expanded });
	}

	/**
	 * Render single result entry.
	 * @return {ReactComponent}   ReactComponent instance
	 */
	render() {
		const { result } = this.props;
		const { PAGE_TOTAL_GH, GH_TOP, PAGE_TOTAL_AD, AD_TOP, PAGE_TOTAL_AT, AT_TOP } = result.dataArray[ 0 ];
		const INCREASE = (PAGE_TOTAL_GH + PAGE_TOTAL_AD + PAGE_TOTAL_AT)/PAGE_TOTAL_GH;
		return (
			<div className="result">
				<div style={{ cursor: 'pointer', fontWeight: '700' }} onClick={this.toggleResult}>
					{`${result.page_url}`}
					{
						(this.state.expanded) &&
						<div className="result-text">
							<div>{`GH_LATENCY: ${PAGE_TOTAL_GH.toFixed(2)}`}</div>
							<div>{`GH_TOP: ${GH_TOP.duration.toFixed(2)}, ${GH_TOP.handler}, ${GH_TOP.url}`}</div>
							<div>{`AD_LATENCY: ${PAGE_TOTAL_AD.toFixed(2)}`}</div>
							<div>{`AD_TOP: ${AD_TOP.duration.toFixed(2)}, ${AD_TOP.handler}, ${AD_TOP.url}`}</div>
							<div>{`AT_LATENCY: ${PAGE_TOTAL_AT.toFixed(2)}`}</div>
							<div>{`AT_TOP: ${AT_TOP.duration.toFixed(2)}, ${AT_TOP.handler}, ${AT_TOP.url}`}</div>
							<div>{`Increase: ${INCREASE.toFixed(2)} times`}</div>
						</div>
					}
				</div>
			</div>		
		);
	}
}

export default Result;
