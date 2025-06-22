<template>
	<q-layout :inert="loading$" view="lHr lpR lFr">
		<q-drawer class="non-selectable" side="left" overlay behavior="mobile"
		v-model="drawer$" bordered @keydown.passive.esc="drawer$ = false">
			<div class="max-width-screen min-height-screen max-height-screen relative-position">
				<div class="fit overflow-auto">
					<q-list padding @pointerdown.passive.stop @mousedown.passive.stop>
						<q-item-label class="relative-position" header>
							Chats ({{chats$.length}})
							<div class="absolute-full q-px-sm row justify-end items-start no-pointer-events">
								<q-btn class="all-pointer-events" icon="mdi-dots-horizontal" flat :ripple="RIPPLE" round>
									<q-menu class="non-selectable" anchor="bottom right" self="top right">
										<q-list padding>
											<menu-item icon="mdi-file-export" label="Backup"
											caption="Export keys and chats" @click.passive="Chats.backup()"/>
											<menu-item icon="mdi-file-restore" label="Restore"
											caption="Import keys and chats" @click.passive="Chats.restore()"/>
											<menu-item :active="Chats.incognito" icon="mdi-incognito-circle" label="Incognito"
											caption="Do not save changes" @click.passive="Chats.toggleIncognito()"/>
											<menu-item :disable="!chatContent$.length" icon="mdi-broom" label="Clear history"
											caption="Delete chat messages" @click.passive="Chats.clearChat(chat$)"/>
										</q-list>
									</q-menu>
								</q-btn>
							</div>
						</q-item-label>
						<q-item v-for="(chat, index) in Utils.sort(chats$, 'timestamp')" :key="(chat.uuid ?? '') + index"
						:active="chat$ === chat" clickable v-ripple="RIPPLE"
						@click.passive="$event.shiftKey ? Chats.deleteChat(chat) : openChat(chat)">
							<q-item-section avatar>
								<q-avatar :color="chat$ === chat ? 'primary' : 'text'" text-color="background">
									{{Utils.letter(chat.name)}}
								</q-avatar>
							</q-item-section>
							<q-item-section>
								<q-item-label lines="2">{{chat.name}}</q-item-label>
								<q-item-label lines="1" caption>
									{{Utils.formatTimestamp(chat.timestamp)}} ({{chat.count}})
								</q-item-label>
							</q-item-section>
							<q-item-section side>
								<q-icon name="mdi-delete-forever" @click.passive.stop="Chats.deleteChat(chat)"/>
							</q-item-section>
						</q-item>
					</q-list>
				</div>
				<div class="absolute-full q-pa-md no-pointer-events">
					<div class="fit relative-position">
						<q-btn class="all-pointer-events" fab icon="mdi-forum-plus" unelevated
						color="primary" text-color="background" :ripple="RIPPLE" @pointerdown.passive.stop
						@mousedown.passive.stop @click.passive="Chats.createChat().then(chat => drawer$ = !chat)"/>
					</div>
				</div>
			</div>
		</q-drawer>
		<div class="min-height-screen column no-wrap" :inert="drawer$">
			<main class="grow">
				<div class="fit q-pa-md">
					<div class="fit max-width-sm">
						<q-chat-message v-for="content in chatContent$" :key="content.cipher + content.timestamp"
						:sent="!content.recrypt" :stamp="Utils.formatTimestamp(content.timestamp)"
						:bg-color="content.text ? 'text' : 'secondary'" text-color="background">
							<span v-if="content.text">{{content.text}}</span>
							<q-spinner-dots v-else v-intersection="decryptContent(content)"/>
						</q-chat-message>
					</div>
				</div>
			</main>
			<footer class="no-shrink">
				<q-separator/>
				<q-toolbar class="fit bg-background">
					<div class="fit grow q-py-sm row no-wrap items-end">
						<div class="no-shrink row no-wrap">
							<q-btn icon="mdi-forum" flat :ripple="RIPPLE" round @click.passive="drawer$ = true"/>
							<q-separator spaced inset vertical/>
						</div>
						<div class="fit grow q-pl-sm row no-wrap items-end gap-sm">
							<q-input accesskey="m" class="grow" placeholder="Message to encrypt" autogrow
							v-model="textToEncrypt$" :disable="!chat$" dense @keydown.shift.enter.prevent="Chats.encryptText()"/>
							<q-btn icon="mdi-send-lock" :disable="!chat$ || !textToEncrypt$"
							flat :ripple="RIPPLE" round @click.passive="Chats.encryptText()"/>
						</div>
						<div class="no-shrink row no-wrap">
							<q-separator spaced inset vertical/>
							<q-btn icon="mdi-content-paste" :disable="!chat$" flat
							:ripple="RIPPLE" round @click.passive="Chats.decryptText()"/>
						</div>
					</div>
				</q-toolbar>
			</footer>
		</div>
	</q-layout>
	<div class="fullscreen" v-if="loading$"></div>
	<div class="hidden" data-ui-utils>
		<a id="download" target="_blank"></a>
		<form>
			<input id="upload" name="upload" type="file">
		</form>
	</div>
</template>

<script setup>
import {ref, onErrorCaptured} from 'vue'
import {useQuasar} from 'quasar'
import Utils from 'src/classes/utils'
import UiUtils from 'src/classes/ui-utils'
import Chats from 'src/classes/chats'
import MenuItem from 'src/components/MenuItem.vue'

const
	{RIPPLE, loading$} = Object.assign(UiUtils, {$q: useQuasar()}),
	{chats$, chat$, chatContent$, textToEncrypt$} = Chats,
	drawer$ = ref(true)

let chatOpening = false

onErrorCaptured(
	/**https://vuejs.org/api/options-lifecycle.html#errorcaptured*/
	(error, _component, info) => {
		console.error(info, error)
		return false
	}
)
document.documentElement.ondragstart ??= event => event.preventDefault()
Chats.init()

async function openChat(chat){
	drawer$.value = false
	chatOpening = true
	try{
		await Chats.openChat(chat)
		chatOpening = false
	}
	catch(error){
		chatOpening = false
		throw error
	}
}

function decryptContent(content){
	return () => {
		if(!chatOpening){
			Chats.decryptContent(content)
			return false
		}
	}
}
</script>
