import {uid, date} from 'quasar'
const {formatDate} = date

/**array, string, uuid, date*/
export default class Utils{
	/**@type {<T>(array: T[], key: string) => T[]}*/
	static sort(array, key){
		return [...array].sort((a, b) => b[key] - a[key])
	}

	/**@type {<T>(array: T[], by?: string | (item: T) => any) => T[]}*/
	static unique(array, by){
		if(typeof by === 'string'){
			const key = by
			by = item => item[key]
		}
		return by === undefined ? [...new Set(array)] :
			[...new Map(
				array.map(item => [by(item), item])
			)].map(([_key, value]) => value)
	}

	/**@returns {string}*/
	static letter(string = ''){
		let letter
		for({segment: letter} of new Intl.Segmenter().segment(string.normalize('NFC')))
			break
		return letter ?? ''
	}

	static uuid(exclude = []){
		while(true){
			const uuid = uid()
			if(!exclude.includes(uuid))
				return uuid
		}
	}

	static formatDate(format, date = Date.now(), ...args){
		return formatDate(date, format, ...args)
	}

	static formatTimestamp(timestamp){
		return this.formatDate('YYYY-MM-DD, HH:mm', timestamp)
	}
}
