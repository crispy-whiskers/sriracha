import { Flags } from './index';

export default class Row {
	id?: number | null;
	hm?: string | null;
	nh?: string | null;
	eh?: string | null;
	im?: string | null;
	title?: string | null;
	author?: string | null;
	note?: string | null;
	parody?: string | null;
	tier?: string | null;
	page?: number | null;
	misc?: string | null;
	siteTags?: string | null;
	img?: string | null;
	uid?: string | null;
	sheet?: number | null;
	tags?: (string | null | undefined)[];

	constructor(values: ((string | undefined)[]) | Flags | undefined, id = -1, sheet = -1) {
		if (typeof values === 'undefined') {
			values = ['', '', '', '', '', '', '', '', '', '', '', '', '', '', ''];
		}
		// @ts-expect-error values is not flags
		if (values?.length) {
			const vals = values as (string | undefined)[];
			const arr = vals.map((v) => {
				return v === '' ? undefined : v;
			});
			this.id = id;
			this.hm = arr[0];
			this.nh = arr[1];
			this.eh = arr[2];
			this.im = arr[3];
			this.title = arr[4];
			this.author = arr[5];
			this.note = arr[6];
			this.parody = arr[7];
			this.tier = arr[8];
			this.page = typeof arr[9] === 'undefined' ? -1 : +arr[9];
			this.misc = arr[10];
			this.siteTags = arr[11];
			this.img = arr[12];
			this.uid = arr[13];
			this.sheet = sheet;
			this.tags = arr.slice(14);

			//take command flags as constructor
		} else if (typeof values === 'object') {
			const flags = values as Flags;
			this.hm = flags.l1;
			this.nh = flags.l2;
			this.eh = flags.l3;
			this.im = flags.l4;
			this.title = flags.t;
			this.author = flags.a;
			this.note = flags.n;
			this.parody = flags.p;
			this.tier = flags.tr;
			this.img = flags.img;
			this.page = +(flags.pg === null ? 0 : (flags.pg ?? -1)); // what in the fuck
			// page is -1 usually, pass 0 or null to clear it (I guess)
		}
	}

	/**
	 * @returns {Array}
	 */
	toArray() {
		return [
			this.hm,
			this.nh,
			this.eh,
			this.im,
			this.title,
			this.author,
			this.note,
			this.parody,
			this.tier,
			this.page == -1 ? undefined : this.page,
			this.misc,
			this.siteTags,
			this.img,
			this.uid,
		]
			.concat(this.tags)
			.map((v) => (v === undefined || v === null ? '' : v)); //replace all undefined values with empty string
	}
	/**
	 * Takes in any object to change it. A change-all setter method.
	 * Push "null" to a value to clear it.
	 * @param {Object} target
	 */
	update(target: Row) {
		this.hm = typeof target.hm === 'undefined' || target.hm == '' ? this.hm : target.hm;
		this.nh = typeof target.nh === 'undefined' || target.nh == '' ? this.nh : target.nh;
		this.eh = typeof target.eh === 'undefined' || target.eh == '' ? this.eh : target.eh;
		this.im = typeof target.im === 'undefined' || target.im == '' ? this.im : target.im;
		this.title = typeof target.title === 'undefined' || target.title == '' ? this.title : target.title;
		this.author = typeof target.author === 'undefined' || target.author == '' ? this.author : target.author;
		this.note = typeof target.note === 'undefined' || target.note == '' ? this.note : target.note;
		this.parody = typeof target.parody === 'undefined' || target.parody == '' ? this.parody : target.parody;
		this.tier = typeof target.tier === 'undefined' || target.tier == '' ? this.tier : target.tier;
		this.page = target.page == -1 ? this.page : (target.page == 0 ? -1 : target.page); // oh god fucking why
		this.tags = !target.tags ? this.tags : target.tags;
		this.img = typeof target.img === 'undefined' || target.img == '' ? this.img : target.img;
		this.misc = typeof target.misc === 'undefined' || target.misc == '' ? this.misc : target.misc;
		this.siteTags = typeof target.siteTags === 'undefined' || target.siteTags == '' ? this.siteTags : target.siteTags;
	}
	/**
	 *
	 * @param {String} e
	 * @returns {Boolean} returns true if valid, false if not.
	 */
	atag(e: string) {
		if (this.tags?.includes(e)) {
			return false;
		}
		this.tags?.push(e);

		return true;
	}
	/**
	 *
	 * @param {String} e
	 * @returns {Boolean} returns true if valid, false if not.
	 */
	rtag(e: string) {
		if (this.tags?.includes(e)) {
			const a = this.tags.indexOf(e);
			this.tags.splice(a, 1);
			this.tags.push(''); // Push empty value to ensure overwrite and avoid duplicates

			return true;
		}
		return false;
	}
	/**
	 * @returns {Boolean}
	 */
	hasTag() {
		let a = false;
		this.tags?.forEach((e) => {
			if (e != '') a = true;
		});
		return a;
	}
}
