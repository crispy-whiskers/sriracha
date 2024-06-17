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

	constructor(values: (string | undefined)[] | Flags | undefined, id = -1, sheet = -1) {
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
			this.page = +(flags.pg === null ? 0 : flags.pg ?? -1); // what in the fuck
			// page is -1 usually, pass 0 or null to clear it (I guess)
		}
	}

	toArray(): (string | number)[] {
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
			.map((v) => (v ??= '')); //replace all undefined values with empty string
	}

	/**
	 * Takes in any object to change it. A change-all setter method.
	 * Push "null" to a value to clear it.
	 */
	update(target: Row) {
		this.hm = target.hm === null || target.hm ? target.hm : this.hm;
		this.nh = target.nh === null || target.nh ? target.nh : this.nh;
		this.eh = target.eh === null || target.eh ? target.eh : this.eh;
		this.im = target.im === null || target.im ? target.im : this.im;
		this.title = target.title === null || target.title ? target.title : this.title;
		this.author = target.author === null || target.author ? target.author : this.author;
		this.note = target.note === null || target.note ? target.note : this.note;
		this.parody = target.parody === null || target.parody ? target.parody : this.parody;
		this.tier = target.tier === null || target.tier ? target.tier : this.tier;
		this.page = target.page == -1 ? this.page : target.page || -1; // oh god fucking why
		this.tags = target.tags ?? this.tags;
		this.img = target.img === null || target.img ? target.img : this.img;
		this.misc = target.misc === null || target.misc ? target.misc : this.misc;
		this.siteTags = target.siteTags === null || target.siteTags ? target.siteTags : this.siteTags;
	}

	atag(e: string): boolean {
		if (this.tags?.includes(e)) {
			return false;
		}
		this.tags?.push(e);

		return true;
	}

	rtag(e: string): boolean {
		if (this.tags?.includes(e)) {
			const a = this.tags.indexOf(e);
			this.tags.splice(a, 1);
			this.tags.push(''); // Push empty value to ensure overwrite and avoid duplicates

			return true;
		}

		return false;
	}

	hasTag(): boolean {
		let a = false;

		this.tags?.forEach((e) => {
			if (e) {
				a = true;
			}
		});

		return a;
	}

	/**
	 * Removes dummy values added to deal with Google's append function.
	 * See comment in add.ts for more information
	 */
	removeDummies() {
		for (const [key, value] of Object.entries(this)) {
			if (value == 'null') {
				delete this[key as keyof typeof this];
			}
		}
	}

	/**
	 * Checks if an entry contains a link from a licensor
	 */
	isLicensed(): boolean {
		if (this.nh?.match(/fakku|ebookrenta|irodoricomics/)) {
			return true;
		}

		return false;
	}
}
