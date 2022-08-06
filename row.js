module.exports = class Row {
	/**
	 * @param {*} values
	 * @param {Number} id
	 * @param {Number} sheet
	 */
	constructor(values, id = -1, sheet = -1) {
		if (typeof values === 'undefined') {
			values = ['', '', '', '', '', '', '', '', '', '',''];
		}
		if (values?.length) {
			
			values = values.map((v)=>{
				return (v === '' ? undefined : v)
			});
			this.id = id;
			this.hm = values[0];
			this.nh = values[1];
			this.eh = values[2];
			this.im = values[3];
			this.title = values[4];
			this.author = values[5];
			this.note = values[6];
			this.parody = values[7];
			this.tier = values[8];
			this.page = (typeof values[9] === 'undefined') ? -1 : +values[9];
			this.misc = values[10];
			this.img = values[11];
			this.uid = values[12];
			this.sheet = sheet;
			this.tags = values.slice(13);


		//take command flags as constructor
		} else if(typeof values === 'object'){ 
			this.hm = values.l1;
			this.nh = values.l; //TODO whne the migration happens, change this to l2
			this.eh = values.l3;
			this.im = values.l4
			this.title = values.t;
			this.author = values.a;
			this.note = values.n;
			this.parody = values.p;
			this.tier = values.tr;
			this.img = values.img;
			this.page = +values.pg ?? -1;
			
		}
	}

	/**
	 * @returns {Array}
	 */
	toArray() {
		return [this.hm, this.nh, this.eh, this.im, this.title, this.author, this.note, this.parody, this.tier, 
			this.page == 0 ? undefined : this.page, this.misc, this.img, this.uid ]
			.concat(this.tags)
			.map((v) => (v === undefined || v === null ? '' : v)); //replace all undefined values with empty string
	}
	/**
	 * Takes in any object to change it. A change-all setter method.
	 * Push "null" to a value to clear it.
	 * @param {Object} target
	 */
	update(target) {
		this.hm = typeof target.hm === 'undefined' || target.hm == '' ? this.hm : target.hm;
		this.nh = typeof target.nh === 'undefined' || target.nh == '' ? this.nh : target.nh;
		this.eh = typeof target.eh === 'undefined' || target.eh == '' ? this.eh : target.eh;
		this.im = typeof target.im === 'undefined' || target.im == '' ? this.im : target.im;
		this.title = typeof target.title === 'undefined' || target.title == '' ? this.title : target.title;
		this.author = typeof target.author === 'undefined' || target.author == '' ? this.author : target.author;
		this.note = typeof target.note === 'undefined' || target.note == '' ? this.note : target.note;
		this.parody = typeof target.parody === 'undefined' || target.parody == '' ? this.parody : target.parody;
		this.tier = typeof target.tier === 'undefined' || target.tier == '' ? this.tier : target.tier;
		this.page = target.page == 0 ? this.page : target.page;
		this.tags = typeof target.tags === 'undefined' || target.tags == '' ? this.tags : target.tags;
		this.img = typeof target.img === 'undefined' || target.img == '' ? this.img : target.img;
		this.misc = typeof target.misc === 'undefined' || target.misc == '' ? this.misc : target.misc;
	}
	/**
	 *
	 * @param {String} e
	 * @returns {Boolean} returns true if valid, false if not.
	 */
	atag(e) {
		if (!/^([A-Z][a-zA-Z]*\s*)+$/.test(e)) return false;
		if (this.tags.includes(e)) {
			return null;
		}
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

			//leave empty space, so the overwrite gets pushed to the sheets
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
