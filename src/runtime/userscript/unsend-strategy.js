/** @module unsend-strategy Various strategies for unsending messages */

// eslint-disable-next-line no-unused-vars
import IDMU from "../../idmu/idmu.js"

class UnsendStrategy {

	/**
	 *
	 * @param {IDMU} idmu
	 */
	constructor(idmu) {
		this._idmu = idmu
	}

	/**
	 *
	 * @abstract
	 * @returns {boolean}
	 */
	isRunning() {
	}

	/**
	 *
	 * @abstract
	 */
	stop() {
	}

	/**
	 *
	 * @abstract
	 * @param {number} batchSize
	 */
	run() {
	}

	/**
	 * @readonly
	 * @type {IDMU}
	 */
	get idmu() {
		return this._idmu
	}

}


class BatchUnsendStrategy extends UnsendStrategy {

	static DEFAULT_BATCH_SIZE = 5

	#onUnsuccessfulWorkflows
	#finishedWorkflows


	/**
	 * @callback onUnsuccessfulWorkflows
	 * @param {IDMU} idmu
	 * @param {onUnsuccessfulWorkflows} onUnsuccessfulWorkflows
	 */
	constructor(idmu, onUnsuccessfulWorkflows=null) {
		super(idmu)
		this._running = false
		this._stopped = false
		this.#finishedWorkflows = []
		this.#onUnsuccessfulWorkflows = onUnsuccessfulWorkflows
	}

	/**
	 *
	 * @returns {boolean}
	 */
	isRunning() {
		return this._running && !this._stopped
	}

	stop() {
		console.debug("BatchUnsendStrategy stop")
		this._stopped = true
	}

	/**
	 *
	 * @param {number} batchSize
	 * @returns {Promise}
	 */
	run(batchSize) {
		console.debug("BatchUnsendStrategy.run()", batchSize)
		this._running = true
		this._stopped = false
		return this.#processBatches(batchSize)
	}

	#done() {
		this._running = false
		console.debug("BatchUnsendStrategy done")
	}

	#unsuccessfulWorkflowAlert() {
		console.debug("BatchUnsendStrategy unsuccessfulWorkflowAlert")
		if(!this._running) {
			clearInterval(this.interval)
		}
		console.debug("BatchUnsendStrategy finishedWorkflows", this.#finishedWorkflows)
		const unsuccessfulWorkflows = this.#finishedWorkflows.filter(uipiMessage => this.idmu.window.document.contains(uipiMessage.uiMessage.root))
		console.debug("BatchUnsendStrategy unsuccessfulWorkflows", unsuccessfulWorkflows)
		if(unsuccessfulWorkflows.length >= 1) {
			unsuccessfulWorkflows.forEach(failedWorkflow => this.#finishedWorkflows.splice(this.#finishedWorkflows.indexOf(failedWorkflow), 1))
			this.#onUnsuccessfulWorkflows(unsuccessfulWorkflows)
		}
	}

	async #processBatches(batchSize) {
		console.debug("BatchUnsendStrategy processBatches")
		let done = false
		for(let i = 0; i < batchSize;i++) {
			if(this._stopped) {
				break
			}
			done = await this.idmu.fetchAndRenderThreadNextMessagePage()
			console.debug("done fetchAndRenderThreadNextMessagePage ?", done)
			if(done) {
				break
			} else {
				console.debug("Waiting IDMU_NEXT_MESSAGE_PAGE_DELAY")
				await new Promise(resolve => setTimeout(resolve, 1000)) // IDMU_NEXT_MESSAGE_PAGE_DELAY
			}
		}
		try {
			for(const uipiMessage of await this.idmu.createUIPIMessages()) {
				if(this._stopped) {
					break
				}
				try {
					await uipiMessage.unsend()
					this.#finishedWorkflows.push(uipiMessage)
					await new Promise(resolve => setTimeout(resolve, 1000)) // IDMU_MESSAGE_QUEUE_DELAY
				} catch(result) {
					console.error(result)
				}
			}
		} catch(ex) {
			console.error(ex)
		}
		if(!this.interval && this.#onUnsuccessfulWorkflows) {
			this.interval = setInterval(() => this.#unsuccessfulWorkflowAlert(), 5000) // IDMU_UNSUCESSFUL_WORKFLOW_ALERT_INTERVAL
		}
		if(done) {
			this.#done()
		} else if(!this._stopped) {
			return this.#processBatches(batchSize)
		}
	}

}

export { UnsendStrategy, BatchUnsendStrategy }
