let downloadId = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'saveTabList') {
    const jsonString = JSON.stringify(request.tabList, null, 2);
    const dataUrl =
      'data:application/json;charset=utf-8,' + encodeURIComponent(jsonString);

    chrome.downloads.download(
      {
        url: dataUrl,
        filename: 'tabby_tabs.json',
        saveAs: true,
      },
      (id) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            success: false,
            error: chrome.runtime.lastError.message,
          });
        } else {
          downloadId = id;
          sendResponse({ success: true });
        }
      }
    );

    return true;
  } else if (request.action === 'showShareAlert') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: './tabby.png',
      title: 'Tabby Share',
      message: 'Share functionality coming soon!',
    });
    sendResponse({ success: true });
    return false;
  } else if (request.action === 'autoGroupTabs') {
    autoGroupTabs();
    sendResponse({ success: true });
    return false;
  }
});

chrome.downloads.onChanged.addListener((delta) => {
  if (
    delta.id === downloadId &&
    delta.state &&
    delta.state.current === 'complete'
  ) {
    showCloseTabsPrompt();
    downloadId = null;
  }
});

function showCloseTabsPrompt() {
  chrome.notifications.create(
    {
      type: 'basic',
      iconUrl: './tabby.png',
      title: 'Tabs Saved',
      message: 'Your tabs have been saved. Do you want to close all tabs?',
      buttons: [{ title: 'Yes' }, { title: 'No' }],
    },
    (notificationId) => {
      chrome.notifications.onButtonClicked.addListener(function listener(
        clickedId,
        buttonIndex
      ) {
        if (clickedId === notificationId) {
          chrome.notifications.onButtonClicked.removeListener(listener);
          if (buttonIndex === 0) {
            closeAllTabsAndOpenNew();
          }
        }
      });
    }
  );
}

function autoGroupTabs() {
  chrome.tabs.query({}, (tabs) => {
    const groups = {};
    tabs.forEach((tab) => {
      if (tab.title === 'New Tab') return;
      const domain = tab.url ? new URL(tab.url).hostname : 'unknown';
      if (!groups[domain]) groups[domain] = [];
      if (tab.id !== undefined) {
        groups[domain].push(tab.id);
      }
    });

    const sortedDomains = Object.entries(groups).sort(
      (a, b) => b[1].length - a[1].length
    );

    let currentIndex = 0;
    sortedDomains.forEach(([domain, groupTabs]) => {
      if (groupTabs.length > 1) {
        const groupName = getDomainName(domain);
        chrome.tabs.group({ tabIds: groupTabs }, (groupId) => {
          if (groupId !== undefined) {
            chrome.tabGroups.update(
              groupId,
              { title: groupName, collapsed: true },
              () => {
                chrome.tabGroups.move(groupId, { index: currentIndex }, () => {
                  console.log(
                    `Group ${groupName} created, collapsed, and moved to index ${currentIndex}`
                  );
                  currentIndex += groupTabs.length;
                });
              }
            );
          }
        });
      } else {
        currentIndex += groupTabs.length;
      }
    });
  });
}

function getDomainName(domain) {
  const parts = domain.split('.');
  if (parts.length > 2) {
    return (
      parts[parts.length - 2].charAt(0).toUpperCase() +
      parts[parts.length - 2].slice(1)
    );
  }
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

function closeAllTabsAndOpenNew() {
  chrome.tabs.create({ url: 'chrome://newtab' }, (newTab) => {
    chrome.tabs.query({}, (tabs) => {
      const tabIdsToClose = tabs
        .filter((tab) => tab.id !== newTab.id)
        .map((tab) => tab.id);

      chrome.tabs.remove(tabIdsToClose);
    });
  });
}
