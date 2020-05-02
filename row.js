module.exports = class Row {
	/**
	 * @param {*} values
	 * @param {Number} id
	 * @param {Number} sheet
	 */
	constructor(array, id = -1, sheet = -1) {
		if (typeof array === 'undefined') {
			array = ['', '', '', '', '', '', ''];
		}
		if (array?.length) {
			let values = array;
			
			this.link = values[0] ?? '';
			this.title = values[1] ?? '';
			this.author = values[2] ?? '';
			this.warning = values[3] ?? '';
			this.parody = values[4] ?? '';
			this.tier = values[5] ?? '';
			this.page = +values[6] ?? -1;
			this.id = id;
			this.sheet = sheet;
			this.tags = values.slice(7);
		} else if(typeof array === 'object'){
			this.link = array.l ?? '';
			this.title = array.t ?? '';
			this.author = array.a ?? '';
			this.warning = array.w ?? '';
			this.parody = array.p ?? '';
			this.tier = array.tr ?? '';
			this.page = +array.pg ?? -1;
		}
	}

	/**
	 * @returns {Array}
	 */
	toArray() {
		return [this.link, this.title, this.author, this.warning, this.parody, this.tier, this.page == 0 ? undefined : this.page]
			.concat(this.tags)
			.map((v) => (v === undefined ? '' : v)); //replace all undefined values with empty string
	}
	/**
	 * Takes in any object to change it. A change-all setter method
	 * @param {Object} target
	 */
	update(target) {
		this.link = typeof target.link === 'undefined' || target.link == '' ? this.link : target.link;
		this.title = typeof target.title === 'undefined' || target.title == '' ? this.title : target.title;
		this.author = typeof target.author === 'undefined' || target.author == '' ? this.author : target.author;
		this.warning = typeof target.warning === 'undefined' || target.warning == '' ? this.warning : target.warning;
		this.parody = typeof target.parody === 'undefined' || target.parody == '' ? this.parody : target.parody;
		this.tier = typeof target.tier === 'undefined' || target.tier == '' ? this.tier : target.tier;
		this.page = target.page == 0 ? this.page : target.page;
		this.tags = typeof target.tags === 'undefined' || target.tags == '' ? this.tags : target.tags;
	}
	/**
	 *
	 * @param {String} e
	 * @returns {Boolean} returns true if valid, false if not.
	 */
	atag(e) {
		if (!/^([A-Z][a-zA-Z]*\s*)+$/.test(e)) return false;
		this.tags.push(e);

		return true;
	}
	/**
	 *
	 * @param {String} e
	 * @returns {Boolean} returns true if valid, false if not.
	 */
	rtag(e) {
		if (this.tags.includes(e)) {
			let a = this.tags.indexOf(e);
			this.tags[a] = '';
			//now move a to the end of the
			this.tags.splice(a, 1);
			this.tags.push('');

			//leave empty space, so it gets pushed to the sheets
			return true;
		}
		return false;
	}
	/**
	 * @returns {Boolean}
	 */
	hasTag() {
		let a = false;
		this.tags.forEach((e) => {
			if (e != '') a = true;
		});
		return a;
	}
};
