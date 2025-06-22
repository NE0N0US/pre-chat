import * as Recrypt from '@ironcorelabs/recrypt-wasm-binding'

/**keys, recrypt*/
export default class RecryptFacade{
	/**new Recrypt.Api256().generateEd25519KeyPair()*/
	static #SIGNING_KEY = Object.freeze({
		privateKey: new Uint8Array([
			172, 230, 206, 189, 128, 39, 50, 249, 24, 72, 198, 73, 163, 222, 217, 165,
			117, 218, 61, 106, 142, 84, 248, 217, 204, 4, 132, 169, 89, 104, 20, 175,
			81, 240, 164, 108, 48, 6, 95, 249, 57, 175, 8, 245, 177, 27, 178, 73,
			156, 6, 210, 240, 91, 242, 8, 155, 0, 93, 11, 45, 86, 250, 222, 179
		]),
		publicKey: new Uint8Array([
			81, 240, 164, 108, 48, 6, 95, 249, 57, 175, 8, 245, 177, 27, 178, 73,
			156, 6, 210, 240, 91, 242, 8, 155, 0, 93, 11, 45, 86, 250, 222, 179
		])
	})

	static #recrypt = new Recrypt.Api256()

	static keys(){
		return this.#recrypt.generateKeyPair()
	}

	/**@param {Recrypt.PrivateKey} privateBytes
	@param {Recrypt.PublicKey} publicXyBytes*/
	static transformKeyBytes(privateBytes, publicXyBytes){
		const transformKey = this.#recrypt.generateTransformKey(privateBytes, publicXyBytes, this.#SIGNING_KEY.privateKey)
		return new Uint8Array([
			...transformKey.ephemeralPublicKey.x,
			...transformKey.ephemeralPublicKey.y,
			...transformKey.encryptedTempKey,
			...transformKey.hashedTempKey,
			...transformKey.signature
		])
	}

	/**@param {Uint8Array} bytes
	@param {Recrypt.PublicKey} publicXyBytes*/
	static transformKey(bytes, publicXyBytes){
		let c = 0
		return {
			ephemeralPublicKey: {x: bytes.slice(c, c += 32), y: bytes.slice(c, c += 32)},
			toPublicKey: publicXyBytes,
			encryptedTempKey: bytes.slice(c, c += 384),
			hashedTempKey: bytes.slice(c, c += 128),
			publicSigningKey: this.#SIGNING_KEY.publicKey,
			signature: bytes.slice(c, c += 64)
		}
	}

	/**@param {Uint8Array} bytes
	@param {Recrypt.PublicKey} publicXyBytes*/
	static encrypt(bytes, publicXyBytes){
		const
			BLOCK_SIZE = 384,
			BLOCK_SIZE_RESULT = 544,
			padding = BLOCK_SIZE - bytes.length % BLOCK_SIZE,
			paddedBytes = new Uint8Array(bytes.length + padding),
			result = new Uint8Array(paddedBytes.length / BLOCK_SIZE * BLOCK_SIZE_RESULT)
		paddedBytes.set(bytes)
		for(let c = 0; c * BLOCK_SIZE < paddedBytes.length; c++)
			result.set(this.#encryptBlock(
				paddedBytes.slice(c * BLOCK_SIZE, (c + 1) * BLOCK_SIZE),
			publicXyBytes), c * BLOCK_SIZE_RESULT)
		return {bytes: result, padding}
	}

	/**@param {Uint8Array} bytes384
	@param {Recrypt.PublicKey} publicXyBytes*/
	static #encryptBlock(bytes384, publicXyBytes){
		const encryptedValue = this.#recrypt.encrypt(bytes384, publicXyBytes, this.#SIGNING_KEY.privateKey)
		return new Uint8Array([
			...encryptedValue.ephemeralPublicKey.x,
			...encryptedValue.ephemeralPublicKey.y,
			...encryptedValue.encryptedMessage,
			...encryptedValue.authHash,
			...encryptedValue.signature
		])
	}

	/**@param {Uint8Array} bytes
	@param {number} padding
	@param {Recrypt.PrivateKey} privateBytes
	@param {Recrypt.TransformKey} transformKey*/
	static decrypt(bytes, padding, privateBytes, transformKey){
		const
			BLOCK_SIZE = 544,
			BLOCK_SIZE_RESULT = 384,
			result = new Uint8Array(bytes.length / BLOCK_SIZE * BLOCK_SIZE_RESULT)
		for(let c = 0; c * BLOCK_SIZE < bytes.length; c++)
			result.set(this.#decryptBlock(
				bytes.slice(c * BLOCK_SIZE, (c + 1) * BLOCK_SIZE),
			privateBytes, transformKey), c * BLOCK_SIZE_RESULT)
		return result.subarray(0, result.length - padding)
	}

	/**@param {Uint8Array} bytes544
	@param {Recrypt.PrivateKey} privateBytes
	@param {Recrypt.TransformKey} transformKey*/
	static #decryptBlock(bytes544, privateBytes, transformKey){
		let c = 0
		const encryptedValue = {
			ephemeralPublicKey: {x: bytes544.slice(c, c += 32), y: bytes544.slice(c, c += 32)},
			encryptedMessage: bytes544.slice(c, c += 384),
			authHash: bytes544.slice(c, c += 32),
			transformBlocks: [],
			publicSigningKey: this.#SIGNING_KEY.publicKey,
			signature: bytes544.slice(c, c += 64)
		}
		return this.#recrypt.decrypt(
			transformKey ? this.#recrypt.transform(encryptedValue, transformKey, this.#SIGNING_KEY.privateKey) : encryptedValue,
			privateBytes
		)
	}
}
