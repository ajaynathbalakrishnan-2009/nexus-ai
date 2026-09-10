const ruleIds = [1, 2, 3, 4, 5, 6]

function isQuietHours() {
  const hour = new Date().getHours()
  return hour >= 23 || hour < 5
}

async function refreshProtection() {
  const { lockUntil = 0, protectionEnabled = true } = await chrome.storage.local.get(['lockUntil', 'protectionEnabled'])
  const shouldBlock = protectionEnabled && (isQuietHours() || lockUntil > Date.now())
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: shouldBlock ? ['social_rules'] : [],
    disableRulesetIds: shouldBlock ? [] : ['social_rules'],
  })
  await chrome.storage.local.set({ blockingActive: shouldBlock, lastCheckedAt: Date.now() })
}

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.storage.local.set({ protectionEnabled: true, lockUntil: 0 })
  await chrome.alarms.create('nexus-policy-check', { periodInMinutes: 1 })
  await refreshProtection()
})

chrome.runtime.onStartup.addListener(refreshProtection)
chrome.alarms.onAlarm.addListener(refreshProtection)
chrome.storage.onChanged.addListener(refreshProtection)

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'LOCK_FOR_THREE_HOURS') {
    chrome.storage.local.set({ lockUntil: Date.now() + 3 * 60 * 60 * 1000 }).then(refreshProtection).then(() => sendResponse({ ok: true }))
    return true
  }
  if (message.type === 'SET_PROTECTION') {
    chrome.storage.local.set({ protectionEnabled: Boolean(message.enabled) }).then(refreshProtection).then(() => sendResponse({ ok: true }))
    return true
  }
})
