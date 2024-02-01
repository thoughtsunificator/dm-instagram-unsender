/** @module ui-message UI element representing a message */

import UIComponent from "../ui-component.js"

class UIMessage extends UIComponent {

	/**
	 * Run a partial workflow on a message in addition to the early filtering process in order to filter out any element that was wrongly picked up early on.
	 * @param {HTMLDivElement} element
	 * @param {AbortController} abortController
	 * @returns {Promise<boolean>}
	 */
	static async isMyOwnMessage(element, abortController) {
		console.debug("isMyOwnMessage", element)
		// close menu in case it was left open
		element.querySelector("[aria-label=More]")?.parentNode?.click()
		element.querySelector(`[aria-label="Close details and actions"]`)?.click()
		element.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }))
		const uiMessage = new UIMessage(element)
		const actionButton = await uiMessage.showActionsMenuButton(abortController)
		if(actionButton) {
			console.debug("isMyOwnMessage: actionButton found looking for unsend action in actionsMenu")
			const actionsMenuElement = await uiMessage.openActionsMenu(actionButton, abortController)
			if(actionsMenuElement) {
				await uiMessage.closeActionsMenu(actionButton, actionsMenuElement, abortController)
				await uiMessage.hideActionMenuButton(abortController)
				console.debug(`isMyOwnMessage:  ${actionsMenuElement}, ${actionsMenuElement.textContent}`)
				return true
			} else {
				console.debug("isMyOwnMessage: Did not find actionsMenuElement")
			}
		} else {
			console.debug("isMyOwnMessage: Did not find actionButton")
		}
		return false
	}

	/**
	 * @param {AbortController} abortController
	 * @returns {Promise<HTMLButtonElement>}
	 */
	async showActionsMenuButton(abortController) {
		console.debug("Workflow step 1 : showActionsMenuButton", this.root)
		this.root.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }))
		this.root.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }))
		this.root.dispatchEvent(new MouseEvent("mousenter", { bubbles: true }))
		const waitAbortController = new AbortController()
		let promiseTimeout
		let resolveTimeout
		const abortHandler = () => {
			waitAbortController.abort()
			clearTimeout(promiseTimeout)
			if(resolveTimeout) {
				resolveTimeout()
			}
		}
		abortController.signal.addEventListener("abort", abortHandler)
		const actionButton = await Promise.race([
			this.waitForElement(this.root, () => this.root.querySelector("[aria-label=More]")?.parentNode, waitAbortController),
			new Promise((resolve, reject) => {
				promiseTimeout = setTimeout(() => reject("Timeout showActionsMenuButton"), 200)
			})
		])
		waitAbortController.abort()
		clearTimeout(promiseTimeout)
		return actionButton
	}

	/**
	 * @param {AbortController} abortController
	 * @returns {Promise<boolean>}
	 */
	async hideActionMenuButton(abortController) { // FIXME
		console.debug("hideActionMenuButton", this.root)
		this.root.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }))
		this.root.dispatchEvent(new MouseEvent("mouseout", { bubbles: true }))
		this.root.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }))
		const waitAbortController = new AbortController()
		let promiseTimeout
		let resolveTimeout
		const abortHandler = () => {
			waitAbortController.abort()
			clearTimeout(promiseTimeout)
			if(resolveTimeout) {
				resolveTimeout()
			}
		}
		abortController.signal.addEventListener("abort", abortHandler)
		const result = await Promise.race([
			this.waitForElement(this.root, () => this.root.querySelector("[aria-label=More]") === null, waitAbortController),
			new Promise((resolve, reject) => {
				resolveTimeout = resolve
				promiseTimeout = setTimeout(() => reject("Timeout hideActionMenuButton"), 200)
			})
		])
		waitAbortController.abort()
		clearTimeout(promiseTimeout)
		return result
	}

	/**
	 *
	 * @param {HTMLButtonElement} actionButton
	 * @param {AbortController} abortController
	 * @returns {Promise}
	 */
	async openActionsMenu(actionButton, abortController) {
		console.debug("Workflow step 2 : Clicking actionButton and waiting for unsend menu item to appear", actionButton)
		const waitAbortController = new AbortController()
		let promiseTimeout
		let resolveTimeout
		const abortHandler = () => {
			waitAbortController.abort()
			clearTimeout(promiseTimeout)
			if(resolveTimeout) {
				resolveTimeout()
			}
		}
		abortController.signal.addEventListener("abort", abortHandler)
		const unsendButton = await Promise.race([
			this.clickElementAndWaitFor(
				actionButton,
				this.root.ownerDocument.body,
				(mutations) => {
					if(mutations) {
						const addedNodes = [ ...mutations.map(mutation => [...mutation.addedNodes]) ].flat().filter(node => node.nodeType === 1)
						console.debug("Workflow step 2 : ", addedNodes, addedNodes.find(node => node.textContent.trim().toLocaleLowerCase() === "unsend"))
						for(const addedNode of addedNodes) {
							const node = [...addedNode.querySelectorAll("span,div")].find(node => node.textContent.trim().toLocaleLowerCase() === "unsend" && node.firstChild?.nodeType === 3)
							return node
						}
					}
				},
				waitAbortController
			),
			new Promise((resolve, reject) => {
				promiseTimeout = setTimeout(() => reject("Timeout openActionsMenu"), 200)
			})
		])
		console.debug("Workflow step 2 : Found unsendButton", unsendButton)
		waitAbortController.abort()
		clearTimeout(promiseTimeout)
		return unsendButton
	}

	/**
	 *
	 * @param {HTMLButtonElement} actionButton
	 * @param {HTMLDivElement} actionsMenuElement
	 * @param {AbortController} abortController
	 * @returns {Promise<boolean>}
	 */
	closeActionsMenu(actionButton, actionsMenuElement, abortController) {
		console.debug("closeActionsMenu")
		return Promise.race([
			this.clickElementAndWaitFor(
				actionButton,
				this.root.ownerDocument.body,
				() => this.root.ownerDocument.body.contains(actionsMenuElement) === false,
				abortController
			),
			new Promise(resolve => setTimeout(resolve, 200))
		])

	}

	/**
	 * Click unsend button
	 * @param {HTMLSpanElement} unsendButton
	 * @param {AbortController} abortController
	 * @returns {Promise<HTMLButtonElement>|Promise<Error>}
	 */
	openConfirmUnsendModal(unsendButton, abortController) {
		console.debug("Workflow step 3 : Clicking unsendButton and waiting for dialog to appear...")
		return this.clickElementAndWaitFor(
			unsendButton,
			this.root.ownerDocument.body,
			() => this.root.ownerDocument.querySelector("[role=dialog] button"),
			abortController
		)
	}

	/**
	 * Click unsend confirm button
	 * @param {HTMLButtonElement} dialogButton
	 * @param {AbortController} abortController
	 * @returns {Promise}
	 */
	async confirmUnsend(dialogButton, abortController) {
		console.debug("Workflow final step : confirmUnsend", dialogButton)
		// wait until confirm button is removed
		await this.clickElementAndWaitFor(
			dialogButton,
			this.root.ownerDocument.body,
			() => this.root.ownerDocument.querySelector("[role=dialog] button") === null,
			abortController
		)
	}

}

export default UIMessage
