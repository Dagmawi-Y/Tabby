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
