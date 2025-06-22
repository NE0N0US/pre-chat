import {ref, nextTick, toRaw} from 'vue'
import Utils from 'src/classes/utils'
import UiUtils from 'src/classes/ui-utils'
import ConvertUtils from 'src/classes/convert-utils'
import MemoryStorage from 'src/classes/memory-storage'
import RecryptFacade from 'src/classes/recrypt-facade'

/**crud*/
export default class Chats{
	static #MESSAGE_MINHEIGHT_PX = 60

	static #STORAGE_KEY = Object.freeze({
		privateBase64: 'private',
		publicBase64: 'public',
		chats: 'chats',
		chatPrefix: 'chat_'
	})

	static #MEMORY_STORAGE = new MemoryStorage()

	/**@type {Map<string, string>}*/
	static #textCache = new Map()

	/**@type {Map<string, import('@ironcorelabs/recrypt-wasm-binding').TransformKey>}*/
	static #transformKeyCache = new Map()

	static get incognito(){
		return this.#storage === this.#MEMORY_STORAGE
	}

	/**@type {import('vue').Ref<{uuid: string, transform: string,
	name: string, timestamp: number, count: number}[]>}*/
	static chats$ = ref([])

	/**@type {import('vue').Ref<{uuid: string, transform: string,
	name: string, timestamp: number, count: number} | undefined>}*/
	static chat$ = ref()

	/**@type {import('vue').Ref<{recrypt?: boolean, text?: string, cipher: string, timestamp: number}[]>}*/
	static chatContent$ = ref([])

	static textToEncrypt$ = ref('')

	static #storage = localStorage

	/**@type {string}*/
	static #privateBase64

	/**@type {string}*/
	static #publicBase64

	/**@type {Uint8Array}*/
	static #privateBytes

	/**@type {Uint8Array}*/
	static #publicXyBytes

	static async init(){
		try{
			this.#privateBase64 = this.#storage.getItem(this.#STORAGE_KEY.privateBase64)
			this.#publicBase64 = this.#storage.getItem(this.#STORAGE_KEY.publicBase64)
			const keysBytes = await Promise.all([
				ConvertUtils.unzipBase64(this.#privateBase64),
				ConvertUtils.unzipBase64(this.#publicBase64)
			])
			this.#privateBytes = keysBytes[0]
			this.#publicXyBytes = {x: keysBytes[1].slice(0, 32), y: keysBytes[1].slice(32, 64)}
			this.chats$.value = JSON.parse(this.#storage.getItem(this.#STORAGE_KEY.chats) ?? '[]')
		}
		catch{
			this.#storage.clear()
			;({privateKey: this.#privateBytes, publicKey: this.#publicXyBytes} = RecryptFacade.keys())
			;[this.#privateBase64, this.#publicBase64] = await Promise.all([
				ConvertUtils.zipBase64(this.#privateBytes),
				ConvertUtils.zipBase64(new Uint8Array([...this.#publicXyBytes.x, ...this.#publicXyBytes.y]))
			])
			this.#storage.setItem(this.#STORAGE_KEY.privateBase64, this.#privateBase64)
			this.#storage.setItem(this.#STORAGE_KEY.publicBase64, this.#publicBase64)
			UiUtils.notify('Keys generated')
		}
	}

	static async createChat(open = true){
		try{
			const chatPublicBase64 = await UiUtils.dialog('Exchange Public Keys', this.#publicBase64,
				{class: 'text-break-all dialog-select', model: ''}
			).result
			if(!chatPublicBase64)
				return undefined
			const
				chatPublicBytes = await ConvertUtils.unzipBase64(chatPublicBase64),
				chatPublicXyBytes = {x: chatPublicBytes.slice(0, 32), y: chatPublicBytes.slice(32, 64)},
				transformKeyBytes = RecryptFacade.transformKeyBytes(this.#privateBytes, chatPublicXyBytes),
				transformKeyBase64 = await ConvertUtils.zipBase64(transformKeyBytes),
				chatTransformKeyBase64 = await UiUtils.dialog('Exchange Transform Keys', transformKeyBase64,
					{class: 'text-break-all dialog-select', model: ''}
				).result
			if(!chatTransformKeyBase64)
				return undefined
			const
				_chatTransformKeyBytes = await ConvertUtils.unzipBase64(chatTransformKeyBase64),
				chatName = (await UiUtils.dialog('Chat Name', '', {model: ''}).result) || 'Chat',
				chats = this.chats$.value,
				chat = {
					uuid: Utils.uuid(chats.map(({uuid}) => uuid)),
					transform: chatTransformKeyBase64,
					name: chatName,
					timestamp: Date.now(),
					count: 0
				}
			this.#storage.setItem(this.#STORAGE_KEY.chats, JSON.stringify(chats.concat(chat)))
			this.#storage.setItem(this.#STORAGE_KEY.chatPrefix + chat.uuid, '[]')
			chats.push(chat)
			UiUtils.notify('Chat created')
			if(open)
				await this.openChat(chat)
			return chat
		}
		catch(error){
			UiUtils.notify('Error creating chat', 'error')
			throw error
		}
	}

	static async deleteChat(chat){
		if(!await UiUtils.dialog('Delete Chat', chat.name, {confirm: true}).result)
			return undefined
		try{
			const
				chats = this.chats$.value,
				chatIndex = chats.indexOf(chat),
				chatsClone = chats.map(toRaw)
			chatsClone.splice(chatIndex, 1)
			this.#storage.setItem(this.#STORAGE_KEY.chats, JSON.stringify(chatsClone))
			this.#storage.removeItem(this.#STORAGE_KEY.chatPrefix + chat.uuid)
			chats.splice(chatIndex, 1)
			if(this.chat$.value === chat)
				await this.openChat(undefined)
			UiUtils.notify('Chat deleted')
			return true
		}
		catch(error){
			UiUtils.notify('Error deleting chat', 'error')
			throw error
		}
	}

	static async openChat(chat, forceUpdate){
		if(chat){
			const actualChat = this.chats$.value.find(({uuid}) => uuid === chat.uuid)
			if(!actualChat)
				return undefined
			chat = actualChat
		}
		const
			update = this.chat$.value !== chat || forceUpdate,
			updateLoading = UiUtils.loading('Decrypting', update && chat?.count ? 0 : 150, 1_500)
		await nextTick()
		try{
			if(update){
				const
					chatContentBase64 = JSON.parse(this.#storage.getItem(this.#STORAGE_KEY.chatPrefix + chat?.uuid) ?? '[]'),
					decryptContentFirstCount = Math.ceil(window.innerHeight / this.#MESSAGE_MINHEIGHT_PX),
					chatContent = [
						...chatContentBase64.slice(0, -decryptContentFirstCount),
						...await Promise.all(chatContentBase64.slice(-decryptContentFirstCount)
							.map(content => this.decryptContent(content, chat)))
					]
				this.chat$.value = chat
				this.chatContent$.value = chatContent
				this.textToEncrypt$.value = undefined
			}
			updateLoading()
			await UiUtils.scrollTo()
		}
		catch(error){
			updateLoading()
			UiUtils.notify('Error opening chat', 'error')
			throw error
		}
	}

	static async decryptContent(content, chat = this.chat$.value){
		content.text ??= await this.#decipherText(content.cipher, content.recrypt ? chat.transform : undefined)
		return content
	}

	static async encryptText(){
		try{
			const text = this.textToEncrypt$.value
			if(text){
				const
					bytes = ConvertUtils.fromUtf16(text),
					{bytes: cipherBytes, padding} = RecryptFacade.encrypt(bytes, this.#publicXyBytes),
					cipher = padding + '.' + await ConvertUtils.zipBase64(cipherBytes)
				this.#addChatContent({cipher, text})
				this.textToEncrypt$.value = undefined
				if(navigator.clipboard){
					await navigator.clipboard.writeText(cipher)
					UiUtils.notify('Encrypted message copied to clipboard')
				}
				else
					this.textToEncrypt$.value = cipher
				await UiUtils.scrollTo()
			}
		}
		catch(error){
			UiUtils.notify('Error encrypting message', 'error')
			throw error
		}
	}

	static async decryptText(){
		try{
			const
				cipher = navigator.clipboard ? await navigator.clipboard.readText() : this.textToEncrypt$.value,
				text = await this.#decipherText(cipher, this.chat$.value.transform)
			this.#addChatContent({recrypt: true, cipher, text})
			if(navigator.clipboard){
				await navigator.clipboard.writeText('')
				UiUtils.notify('Decrypted message pasted from clipboard')
			}
			else
				this.textToEncrypt$.value = ''
			await UiUtils.scrollTo()
		}
		catch(error){
			UiUtils.notify('Error decrypting message', 'error')
			throw error
		}
	}

	/**@param {string} cipher
	@param {string} transform*/
	static async #decipherText(cipher, transform){
		const cacheKey = JSON.stringify([cipher, transform])
		if(this.#textCache.has(cacheKey))
			return this.#textCache.get(cacheKey)
		const
			[padding, cipherBase64] = cipher.split('.'),
			cipherBytes = await ConvertUtils.unzipBase64(cipherBase64),
			transformKey = transform ? await this.#unpackTransformKey(transform) : undefined,
			bytes = RecryptFacade.decrypt(cipherBytes, padding, this.#privateBytes, transformKey),
			text = ConvertUtils.toUtf16(bytes)
		this.#textCache.set(cacheKey, text)
		return text
	}

	/**@param {string} transform*/
	static async #unpackTransformKey(transform){
		if(this.#transformKeyCache.has(transform))
			return this.#transformKeyCache.get(transform)
		const
			transformKeyBytes = await ConvertUtils.unzipBase64(transform),
			transformKey = RecryptFacade.transformKey(transformKeyBytes, this.#publicXyBytes)
		this.#transformKeyCache.set(transform, transformKey)
		return transformKey
	}

	static #addChatContent(content){
		const
			chat = this.chat$.value,
			{uuid, timestamp, count} = chat,
			chatContent = this.chatContent$.value
		try{
			chat.timestamp = content.timestamp = Date.now()
			chat.count = chatContent.length + 1
			const chatContentClone = chatContent.concat(content)
				.map(({recrypt, cipher, timestamp}) => ({recrypt, cipher, timestamp}))
			this.#storage.setItem(this.#STORAGE_KEY.chats, JSON.stringify(this.chats$.value.map(toRaw)))
			this.#storage.setItem(this.#STORAGE_KEY.chatPrefix + uuid, JSON.stringify(chatContentClone))
			chatContent.push(content)
		}
		catch(error){
			Object.assign(chat, {timestamp, count})
			throw error
		}
	}

	static async backup(){
		try{
			await UiUtils.download(
				new Blob([JSON.stringify(ConvertUtils.fromStorage(this.#storage), null, '\t')], {type: 'application/json'}),
				`pre-chat_${Utils.formatDate('YYYY-MM-DD_HH-mm')}.json`
			)
			UiUtils.notify('Export succeed')
		}
		catch(error){
			UiUtils.notify('Error exporting', 'error')
			throw error
		}
	}

	static async restore(){
		try{
			const [file] = await UiUtils.upload('.json')
			if(file){
				const
					backup = JSON.parse(await file.text()),
					append = backup[this.#STORAGE_KEY.privateBase64] === this.#privateBase64 &&
						backup[this.#STORAGE_KEY.publicBase64] === this.#publicBase64
				if(append){
					const chats = Utils.unique(Utils.sort([
						...JSON.parse(this.#storage.getItem(this.#STORAGE_KEY.chats) ?? '[]')
							.map(chat => Object.assign(chat, {local: true})),
						...JSON.parse(backup[this.#STORAGE_KEY.chats] ?? '[]')
					], 'timestamp').reverse(), 'uuid')
					chats.forEach(chat => {
						if(chat.local){
							delete chat.local
							delete backup[this.#STORAGE_KEY.chatPrefix + chat.uuid]
						}
					})
					backup[this.#STORAGE_KEY.chats] = JSON.stringify(chats)
				}
				ConvertUtils.toStorage(this.#storage, backup, !append)
				await this.init()
				await this.openChat(this.chat$.value, true)
				UiUtils.notify('Import succeed')
			}
		}
		catch(error){
			UiUtils.notify('Error importing', 'error')
			throw error
		}
	}

	static async toggleIncognito(){
		try{
			const incognito = this.incognito
			if(incognito){
				this.#MEMORY_STORAGE.clear()
				this.#storage = localStorage
				await this.init()
				await this.openChat(this.chat$.value, true)
			}
			else{
				ConvertUtils.toStorage(this.#MEMORY_STORAGE, ConvertUtils.fromStorage(localStorage), true)
				this.#storage = this.#MEMORY_STORAGE
			}
			UiUtils.notify(incognito ? 'Incognito disabled' : 'Incognito enabled')
		}
		catch(error){
			UiUtils.notify('Error toggling incognito', 'error')
			throw error
		}
	}

	static clearChat(chat){
		const {uuid, timestamp, count} = chat
		if(!this.chatContent$.value.length)
			return undefined
		try{
			Object.assign(chat, {timestamp: Date.now(), count: 0})
			this.#storage.setItem(this.#STORAGE_KEY.chats, JSON.stringify(this.chats$.value.map(toRaw)))
			this.#storage.setItem(this.#STORAGE_KEY.chatPrefix + uuid, '[]')
			this.chatContent$.value = []
			UiUtils.notify('History cleared')
		}
		catch(error){
			UiUtils.notify('Error clearing history', 'error')
			Object.assign(chat, {timestamp, count})
			throw error
		}
	}
}
