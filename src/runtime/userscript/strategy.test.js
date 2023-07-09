import { test } from "../../../test/test.js"
import { createMessagesWrapperElement } from "../../../test/virtual-instagram.js"
import { UnsendThreadMessagesBatchStrategy } from "./strategy.js"
import IDMU from "../../idmu/idmu.js"

test.beforeEach(t => {
	t.context.mountElement.append(createMessagesWrapperElement(t.context.document))
	t.context.idmu = new IDMU(t.context.window)
})

test("UnsendThreadMessagesBatchStrategy isRunning", t => {
	const strategy = new UnsendThreadMessagesBatchStrategy(t.context.idmu)
	t.is(strategy._running, false)
	t.is(strategy._stopped, false)
	t.is(strategy.isRunning(), false)
	strategy.run(1)
	t.is(strategy._running, true)
	t.is(strategy._stopped, false)
	t.is(strategy.isRunning(), true)
})

test("UnsendThreadMessagesBatchStrategy stop", t => {
	const strategy = new UnsendThreadMessagesBatchStrategy(t.context.idmu)
	t.is(strategy._running, false)
	t.is(strategy._stopped, false)
	t.is(strategy.isRunning(), false)
	strategy.run(1)
	strategy.stop()
	t.is(strategy._running, true)
	t.is(strategy._stopped, true)
	t.is(strategy.isRunning(), false)
})

