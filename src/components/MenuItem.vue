<template>
	<q-item :disable="disable" clickable v-ripple="disable ? false : UiUtils.RIPPLE" v-close-popup>
		<q-item-section avatar>
			<q-icon :name="icon"/>
		</q-item-section>
		<q-item-section>
			<q-item-label lines="1">{{label}}</q-item-label>
			<q-item-label v-if="caption" lines="1" caption>{{caption}}</q-item-label>
		</q-item-section>
		<slot></slot>
	</q-item>
</template>

<script setup>
import UiUtils from 'src/classes/ui-utils'

/**@type {import('quasar').QItemProps}*/
const props$ = defineProps({
	disable: Boolean,
	icon: {type: String, required: true},
	label: {type: String, required: true},
	caption: String
})
</script>
