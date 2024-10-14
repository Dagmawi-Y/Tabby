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

    return true; // Indicates that the response is sent asynchronously
  } else if (request.action === 'showShareAlert') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'path/to/your/icon.png',
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
      iconUrl: 'path/to/your/icon.png',
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
  chrome.tabs.query({}, (tabs) => {
    const tabIds = tabs.map((tab) => tab.id).filter((id) => id !== undefined);
    chrome.tabs.remove(tabIds, () => {
      chrome.tabs.create({});
    });
  });
}
