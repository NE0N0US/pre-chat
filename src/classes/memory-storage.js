/**interchangeable with https://developer.mozilla.org/en-US/docs/Web/API/Storage except event*/
export default class MemoryStorage{
	/**@type {Map<string, string>}*/
	#data = new Map()

	/**@type {string[] | undefined}*/
	#keys

	get length(){
		return this.#data.size
	}

	/**@param {number} index*/
	key(index){
		this.#keys ??= [...this.#data.keys()]
		return this.#keys[index] ?? null
	}

	/**@param {string} key*/
	getItem(key){
		return this.#data.has(key) ? this.#data.get(key) : null
	}

	/**@param {string} key
	@param {string} value*/
	setItem(key, value){
		if(!this.#data.has(key))
			this.#keys = undefined
		this.#data.set(key, value)
	}

	/**@param {string} key*/
	removeItem(key){
		this.#keys = undefined
		this.#data.delete(key)
	}

	clear(){
		this.#keys = undefined
		this.#data.clear()
	}
}
