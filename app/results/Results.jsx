/**
 * Software Licenses App
 *
 * Ghostery Browser Extension
 * https://www.ghostery.com/
 *
 * Copyright 2018 Ghostery, Inc. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0
 */
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import {sendMessageInPromise, formatDataEntry} from '../../src/utils';
import Result from './Result';
/**
 * @class Handles a list of results on internal results.html page
 * which displays results of the test.
 * @memberOf  ResultsClasses
 */
class Results extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			version: "VERSION",
			at: -1,
			ab: -1,
			sb: -1,
			gb: -1,
			gp: false,
			average: 0,
			resultsArray: [],
			expandedAll: false
		};
		this.toggleResults = this.toggleResults.bind(this);		
	}

	componentDidMount() {
		sendMessageInPromise("get_results")
		.then(data => { 
			console.log("DATA:", data);
			const {filename, version, at, ab, sb, gb, gp, average, content } = data;

			this.setState({ version, at, ab, sb, gb, gp, average, resultsArray: content});

			const contentStr = this._formatContent(version, at, ab, sb, gb, gp, average, content );
			this._exportFile(filename, contentStr);
		});
	}

	/**
	 * Toggle expansion of all results.
	 */
	toggleResults(evt) {
		this.setState({ expandedAll: !this.state.expandedAll });
	}

	_formatContent(version, at, ab, sb, gb, gp, average, content) {
		let result = `
	Version: ${version} AT: ${at} AB: ${ab} SB: ${sb} GB: ${gb} GP: ${gp}
	Page Average: ${average}
	`;	
		content.forEach(entry => {
			result += formatDataEntry(entry.page_url, entry.dataArray[ 0 ]);
		});

		return result;
	}

	_exportFile (filename, content) {
		const textFileAsBlob = new Blob([content], { type: 'text/plain' });
		const d = new Date();
		let url = '';
		if (window.URL) {
			url = window.URL.createObjectURL(textFileAsBlob);
		} else {
			url = window.webkitURL.createObjectURL(textFileAsBlob);
		}

		const link = document.createElement('a');
		link.href = url;
		link.setAttribute('download', filename);
		document.body.appendChild(link);
		link.click();
	};

	/**
	 * Create page footer element.
	 * Wrapper function for dangerouslySetInnerHTML. Provides extra security
	 * @return {Object}
	 */
	createFooterMarkup() {
		return { __html: 'FOOTER' };
	}
	/**
	 * Render page.
	 * @return {ReactComponent}   ReactComponent instance
	 */
	render() {
		const list = this.state.resultsArray.map((result, index) => (
			<Result index={index} key={result.page_url} result={result} expandedAll={this.state.expandedAll}/>
		));
		return (
			<div id="results-page">
				<div id="header" className="row padded-content expanded valign-middle">
					<div className="column medium-2">
						<img className="logo" src="/app/images/logo-title-white.svg" />
					</div>
					<div className="column" />
					<div className="column medium-6 text-right">
						<span style={{ fontSize: '18px', marginRight: '40px', cursor: 'pointer' }} onClick={this.toggleResults}>
							{ 'TOGGLE RESULTS' }
						</span>
					</div>
				</div>
				<div id="content">
					<div>{`Version:	${this.state.version} AT: ${this.state.at} AB: ${this.state.ab} SB: ${this.state.sb} GB: ${this.state.gb} GP: ${this.state.gp}`}</div>	
					<div>{`Page Average Latency: ${this.state.average.toFixed(2)}`}</div> 
					<div className="results-list">{ list }</div>
				</div>
				<div id="footer">
					<div className="columns copyright text-center" dangerouslySetInnerHTML={this.createFooterMarkup()} />
				</div>
			</div>
		);
	}
}

ReactDOM.render(
	<Results />,
	document.getElementById('root')
);
