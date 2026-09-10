const status = document.querySelector('#status')
const lockButton = document.querySelector('#lock')

async function render() {
  const { blockingActive = false, lockUntil = 0 } = await chrome.storage.local.get(['blockingActive', 'lockUntil'])
  const remaining = Math.max(0, Math.ceil((lockUntil - Date.now()) / 3600000))
  status.textContent = blockingActive ? remaining ? `Protection active. Lock ends in about ${remaining}h.` : 'Protection active for quiet hours.' : 'Protection is paused.'
}

lockButton.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'LOCK_FOR_THREE_HOURS' })
  await render()
})
render()
