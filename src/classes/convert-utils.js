/**zipBase64, utf16, storage*/
export default class ConvertUtils{
	/**@param {Uint8Array} bytes*/
	static async zipBase64(bytes){
		return await this.#toBase64(await this.#zipPipe(false, bytes))
	}

	/**@param {string} string*/
	static unzipBase64(string){
		return this.#zipPipe(true, this.#fromBase64(string))
	}

	/**@param {Uint8Array} bytes
	@param {CompressionFormat} format*/
	static async #zipPipe(unzip = false, bytes, format = 'deflate-raw'){
		return new Uint8Array(await new Response(
			new Blob([bytes]).stream().pipeThrough(
				unzip ? new DecompressionStream(format) : new CompressionStream(format)
			)
		).arrayBuffer())
	}

	/**@param {Uint8Array} bytes
	@returns {Promise<string>}*/
	static async #toBase64(bytes, url = true){
		const
			reader = new FileReader(),
			readPromise = new Promise((onload, onerror) => Object.assign(reader, {onload, onerror}))
		reader.readAsDataURL(new Blob([bytes]))
		await readPromise
		const base64 = reader.result.split(',')[1]
		return url ? base64.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '') : base64
	}

	/**@param {string} string*/
	static #fromBase64(string){
		const
			byteString = atob(string.replaceAll('-', '+').replaceAll('_', '/')),
			bytes = new Uint8Array(byteString.length)
		for(let c = 0; c < byteString.length; c++)
			bytes[c] = byteString.charCodeAt(c)
		return bytes
	}

	/**@param {string} string*/
	static fromUtf16(string){
		return new Uint8Array(string.split('').flatMap(char => {
			const word = char.charCodeAt(0)
			return [word >> 8 & 0xFF, word & 0xFF]
		}))
	}

	/**@param {Uint8Array} bytes*/
	static toUtf16(bytes){
		return [...bytes].map((byte, index, bytes) =>
			index % 2 ? '' : String.fromCharCode((byte << 8) + bytes[index + 1])
		).join('')
	}

	/**@param {Storage} storage
	@returns {Record<string, string>}*/
	static fromStorage(storage){
		const record = {}
		for(let c = 0; c < storage.length; c++){
			const key = storage.key(c)
			record[key] = storage.getItem(key)
		}
		return record
	}

	/**@param {Storage} storage
	@param {Record<string, string>} record*/
	static toStorage(storage, record, clear = false){
		if(clear)
			storage.clear()
		Object.entries(record).forEach(([key, value]) => storage.setItem(key, value))
	}
}
