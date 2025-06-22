import {route} from 'quasar/wrappers'
import {defineComponent} from 'vue'
import {createRouter, createWebHistory} from 'vue-router'

export default route(() => createRouter({
	routes: [{
		path: '/:catchAll(.*)*',
		component: async () => defineComponent({})
	}],
	history: createWebHistory(process.env.VUE_ROUTER_BASE)
}))
