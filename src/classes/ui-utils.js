import {ref, nextTick} from 'vue'
import {QSpinnerGears} from 'quasar'

/**scroll, dialog, notify, local download/upload*/
export default class UiUtils{
	/**@type {Readonly<import('quasar').RippleValue>}*/
	static RIPPLE = Object.freeze({early: true, center: false})

	/**@type {import('quasar').QVueGlobals}*/
	static $q

	static loading$ = ref(false)

	static async scrollTo({y = Number.MAX_SAFE_INTEGER, x = 0} = {}, element = document.documentElement){
		await nextTick()
		await new Promise(setTimeout)
		element.scrollTo({top: y, left: x, behavior: 'instant'})
		await new Promise(setTimeout)
	}

	/**@param {string} title
	@param {string} message
	@param {Optional<{class: string, model: unknown, type: string, persistent: boolean, confirm: boolean}> | undefined}
	@returns {{result: Promise<unknown>, hide: () => void,
	update: (options: Omit<import('node_modules/quasar/dist/types').QDialogOptions, 'component'>) => void}}*/
	static dialog(title, message, {class: cssClass, model, type, persistent, confirm} = {}){
		let hide, update
		const result = new Promise(resolve => ({hide, update} = this.$q.dialog({
			class: cssClass,
			title,
			message,
			prompt: model === undefined ? undefined : {model, type, autofocus: false, outlined: true},
			ok: {flat: true, rounded: true, 'text-color': 'text', ripple: this.RIPPLE},
			cancel: confirm ? {'no-caps': true, flat: true, rounded: true, 'text-color': 'negative', ripple: this.RIPPLE} : false,
			color: 'primary',
			persistent,
			noRouteDismiss: true,
			transitionShow: 'fade',
			transitionHide: 'fade'
		})
			.onOk(value => resolve(confirm ? true : value))
			.onCancel(() => resolve(confirm ? false : undefined))))
		return {result, hide, update}
	}

	/**@param {string} message
	@param {'error' | 'loading' | undefined} type*/
	static notify(message, type){
		const
			isError = type === 'error',
			isLoading = type === 'loading'
		return this.$q.notify({
			color: isError ? 'negative' : 'text',
			textColor: 'background',
			message,
			icon: isError ? 'mdi-alert-circle' : 'mdi-bell-ring',
			spinner: isLoading ? QSpinnerGears : false,
			position: 'top-right',
			badgeColor: 'background',
			badgeTextColor: 'text',
			badgePosition: 'top-right',
			progress: true,
			timeout: isLoading ? 0 : 3_000
		})
	}

	/**@param {string} message*/
	static loading(message, delay = 0, delayAfter = 0){
		this.loading$.value = true
		let update
		setTimeout(() => update ??= this.notify(message, 'loading'), delay)
		const afterPromise = new Promise(resolve => setTimeout(resolve, delay + delayAfter))
		return async props => {
			if(!props){
				this.loading$.value = false
				update ??= false
			}
			if(!props && update)
				await afterPromise
			if(typeof update === 'function')
				update(props)
		}
	}

	/**@param {Blob} blob
	@param {string | undefined} filename*/
	static async download(blob, filename){
		const url = URL.createObjectURL(blob)
		Object.assign(document.getElementById('download'), {download: filename, href: url, type: blob.type ?? ''}).click()
		await new Promise(setTimeout)
		URL.revokeObjectURL(url)
	}

	/**@returns {Promise<File[]>}*/
	static async upload(accept = '', multiple = false){
		const
			upload = document.getElementById('upload'),
			filesPromise = new Promise(resolve => {
				upload.oncancel = () => resolve([])
				upload.oninput = () => resolve([...upload.files])
			})
		Object.assign(upload, {accept, multiple}).click()
		return [...await filesPromise]
	}
}
