import { useState, useEffect, useRef } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Cat,
  PawPrint,
  Trash2,
  LayersIcon,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Save, Upload, Share2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function TabbyExtension() {
  const [tabGroups, setTabGroups] = useState<
    { domain: string; tabs: chrome.tabs.Tab[] }[]
  >([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [isAIMenuOpen, setIsAIMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recency');
  const [sortOrder, setSortOrder] = useState('desc');

  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const aiMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTabs();
    chrome.tabs.onUpdated.addListener(loadTabs);
    chrome.tabs.onRemoved.addListener(loadTabs);
    return () => {
      chrome.tabs.onUpdated.removeListener(loadTabs);
      chrome.tabs.onRemoved.removeListener(loadTabs);
    };
  }, []);

  const loadTabs = () => {
    chrome.tabs.query({}, (tabs) => {
      const groups: Record<string, chrome.tabs.Tab[]> = tabs
        .filter((tab) => tab.title !== 'New Tab' && tab.url)
        .reduce((acc: Record<string, chrome.tabs.Tab[]>, tab) => {
          const groupTitle = getMainDomainTitle(tab.url!, tab.title!);
          if (!acc[groupTitle]) acc[groupTitle] = [];
          acc[groupTitle].push(tab);
          return acc;
        }, {});

      const allDomains = Object.keys(groups);

      setTabGroups(
        Object.entries(groups).map(([groupTitle, tabs]) => ({
          domain: groupTitle,
          tabs,
        }))
      );

      setExpandedGroups(allDomains);
    });
  };

  const toggleGroup = (domain: string) => {
    setExpandedGroups((prev) =>
      prev.includes(domain)
        ? prev.filter((d) => d !== domain)
        : [...prev, domain]
    );
  };

  const switchToTab = (tabId: number | undefined) => {
    if (tabId !== undefined) {
      chrome.tabs.update(tabId, { active: true });
    }
  };

  const closeTab = (tabId: number | undefined) => {
    if (tabId !== undefined) {
      chrome.tabs.remove(tabId, loadTabs);
    }
  };

  const purgeTabs = () => {
    chrome.tabs.query({ active: false }, (tabs) => {
      const tabIds = tabs
        .map((tab) => tab.id)
        .filter((id): id is number => id !== undefined);
      chrome.tabs.remove(tabIds, loadTabs);
    });
  };

  const autoGroupTabs = () => {
    chrome.runtime.sendMessage({ action: 'autoGroupTabs' }, (response) => {
      if (response.success) {
        console.log('Auto-grouping initiated');
        setTimeout(() => {
          loadTabs();
        }, 1000);
      }
    });
  };

  const toggleSort = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedGroups = tabGroups
    .map((group) => ({
      ...group,
      tabs: group.tabs.filter(
        (tab) =>
          (tab.title ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (tab.url ?? '').toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter((group) => group.tabs.length > 0)
    .sort((a, b) => {
      if (sortBy === 'alphabet') {
        return sortOrder === 'asc'
          ? a.domain.localeCompare(b.domain)
          : b.domain.localeCompare(a.domain);
      } else if (sortBy === 'recency') {
        return sortOrder === 'asc'
          ? (a.tabs[0]?.id ?? 0) - (b.tabs[0]?.id ?? 0)
          : (b.tabs[0]?.id ?? 0) - (a.tabs[0]?.id ?? 0);
      }
      // TODO: sort by relevance
      return 0;
    });

  const getMainDomainTitle = (url: string, title: string): string => {
    const hostname = new URL(url).hostname;
    const parts = hostname.split('.');
    const cleanParts = parts.filter(
      (part) => !['www', 'com', 'org', 'net', 'edu'].includes(part)
    );
    const titleWords = title.split(/[\s-]+/);
    const potentialNames = titleWords.filter(
      (word) =>
        word.length > 1 &&
        !['the', 'and', 'or', 'of', 'in', 'on', 'at', 'to'].includes(
          word.toLowerCase()
        )
    );
    for (const part of cleanParts) {
      const matchingName = potentialNames.find((name) =>
        name.toLowerCase().includes(part.toLowerCase())
      );
      if (matchingName) return matchingName;
    }
    if (cleanParts.length > 0) {
      return cleanParts[0].charAt(0).toUpperCase() + cleanParts[0].slice(1);
    }
    return hostname;
  };

  const saveTabList = () => {
    const tabList = tabGroups.map((group) => ({
      domain: group.domain,
      tabs: group.tabs.map((tab) => ({ url: tab.url, title: tab.title })),
    }));

    chrome.runtime.sendMessage(
      { action: 'saveTabList', tabList },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
        } else if (!response.success) {
          console.error('Error saving tabs:', response.error);
        }
      }
    );
  };

  const importTabList = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          try {
            const importedTabList = JSON.parse(content);
            // process and open imported tabs
            importedTabList.forEach(
              (group: {
                domain: string;
                tabs: { url: string; title: string }[];
              }) => {
                group.tabs.forEach((tab) => {
                  chrome.tabs.create({ url: tab.url });
                });
              }
            );
          } catch (error) {
            console.error('Error parsing imported file:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const shareTabList = () => {
    chrome.runtime.sendMessage({ action: 'showShareAlert' });
  };

  const expandAllGroups = () => {
    const allDomains = tabGroups.map((group) => group.domain);
    setExpandedGroups(allDomains);
  };

  const collapseAllGroups = () => {
    setExpandedGroups([]);
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        aiMenuRef.current &&
        !aiMenuRef.current.contains(event.target as Node)
      ) {
        setIsAIMenuOpen(false);
      }
    };

    if (isAIMenuOpen) {
      document.addEventListener('click', handleOutsideClick);
    } else {
      document.removeEventListener('click', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [isAIMenuOpen]);

  return (
    <div
      className={`w-96 h-[600px] bg-primary flex flex-col p-4 shadow-lg relative overflow-hidden ${
        isAIMenuOpen ? 'backdrop-filter backdrop-blur-sm' : ''
      }`}
    >
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-5">
        <div className="absolute top-4 left-4 transform -rotate-12">
          <PawPrint className="text-orange-400" size={64} />
        </div>
        <div className="absolute bottom-4 right-4 transform rotate-12">
          <PawPrint className="text-orange-400" size={64} />
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center">
          <img src="../tabby.png" alt="logo" className="mr-2 w-10 h-10" />
          <h1 className="text-2xl font-bold text-secondary-foreground">
            Tabby
          </h1>
        </div>

        <div className="flex space-x-2">
          <div className="relative">
            <Button
              onClick={saveTabList}
              className="p-2"
              onMouseEnter={() => setHoveredButton('save')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <Save size={18} />
            </Button>
            {hoveredButton === 'save' && (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 p-1 bg-gray-700 text-white text-xs rounded shadow-lg z-50 w-16 text-center">
                Save Tab List
              </div>
            )}
          </div>

          <div className="relative">
            <Button
              onClick={importTabList}
              className="p-2"
              onMouseEnter={() => setHoveredButton('import')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <Upload size={18} />
            </Button>
            {hoveredButton === 'import' && (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 p-1 bg-gray-700 text-white text-xs rounded shadow-lg z-50 w-16 text-center">
                Import Tab List
              </div>
            )}
          </div>

          <div className="relative">
            <Button
              onClick={shareTabList}
              className="p-2"
              onMouseEnter={() => setHoveredButton('share')}
              onMouseLeave={() => setHoveredButton(null)}
            >
              <Share2 size={18} />
            </Button>
            {hoveredButton === 'share' && (
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 p-1 bg-gray-700 text-white text-xs rounded shadow-lg z-50 w-16 text-center">
                Share Tab List
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <div className="relative flex-grow">
          <Search
            className="absolute left-2 top-1/2 transform -translate-y-1/2 text-orange-400"
            size={18}
          />
          <Input
            type="text"
            placeholder="Search tabs..."
            className="pl-8 border-orange-200 focus:ring-orange-400 focus:border-orange-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className=" flex flex-row gap-2 justify-start mb-2">
        <Button
          className={`px-1 py-0.5 text-xs bg-gradient-to-br border-none outline-none focus:outline-none`}
          onClick={expandAllGroups}
        >
          Expand All
        </Button>
        <Button
          className={`px-1 py-0.5 text-xs bg-gradient-to-br border-none outline-none focus:outline-none`}
          onClick={collapseAllGroups}
        >
          Collapse All
        </Button>
      </div>

      <div className="flex justify-start mb-2 gap-3 w-fit">
        <Button
          className={`px-2 py-0.5 text-xs bg-gradient-to-br from-orange-300 to-red-400 hover:from-orange-500 hover:to-red-600 border-none outline-none focus:outline-none ${
            sortBy === 'recency' ? 'bg-orange-200' : 'bg-white'
          }`}
          onClick={() => toggleSort('recency')}
        >
          Time
          {sortBy === 'recency' && (
            <span className="ml-1">
              {sortOrder === 'asc' ? (
                <ArrowUp size={12} />
              ) : (
                <ArrowDown size={12} />
              )}
            </span>
          )}
        </Button>
        <Button
          className={`px-2 py-0.5 text-xs bg-gradient-to-br from-orange-300 to-red-400 hover:from-orange-500 hover:to-red-600 border-none outline-none focus:outline-none ${
            sortBy === 'alphabet' ? 'bg-orange-200' : 'bg-white'
          }`}
          onClick={() => toggleSort('alphabet')}
        >
          A-Z
          {sortBy === 'alphabet' && (
            <span className="ml-1">
              {sortOrder === 'asc' ? (
                <ArrowUp size={12} />
              ) : (
                <ArrowDown size={12} />
              )}
            </span>
          )}
        </Button>
        <Button
          className={`px-2 py-1 text-xs bg-gradient-to-br from-orange-300 to-red-400 hover:from-orange-500 hover:to-red-600 border-none outline-none focus:outline-none ${
            sortBy === 'relevance' ? 'bg-orange-200' : 'bg-white'
          }`}
          onClick={() => toggleSort('relevance')}
        >
          Relevance
          {sortBy === 'relevance' && (
            <span className="ml-1">
              {sortOrder === 'asc' ? (
                <ArrowUp size={12} />
              ) : (
                <ArrowDown size={12} />
              )}
            </span>
          )}
        </Button>
      </div>

      <div className="flex-grow overflow-y-auto space-y-2 pr-2 scrollbar-hide">
        {tabGroups.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <h2 className="text-xl text-secondary-foreground font-bold bg-clip-text hover:scale-105 transition-transform text-center">
              No tabs opened. <br /> <br />
              Enjoy The Silence!
            </h2>
          </div>
        ) : searchTerm ? (
          <div className="space-y-2">
            {filteredAndSortedGroups.flatMap((group) =>
              group.tabs.map((tab) => (
                <div
                  key={tab.id}
                  className=" rounded-md shadow-md p-2 flex items-center space-x-2 group"
                >
                  <img src={tab.favIconUrl} alt="" className="w-4 h-4" />
                  <span
                    className="text-sm truncate text-gray-600 group-hover:text-orange-600 transition-colors cursor-pointer flex-grow"
                    onClick={() => switchToTab(tab.id)}
                  >
                    {tab.title}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => closeTab(tab.id)}
                  >
                    <Trash2 size={14} className=" bg-primary" />
                  </Button>
                </div>
              ))
            )}
          </div>
        ) : (
          filteredAndSortedGroups.map((group) => (
            <div
              key={group.domain}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <button
                className="w-full px-4 py-2 text-left font-medium flex justify-between items-center bg-secondary transition-colors border-none focus:outline-none"
                onClick={() => toggleGroup(group.domain)}
              >
                <span className="text-secondary-foreground">
                  {group.domain}
                </span>
                {expandedGroups.includes(group.domain) ? (
                  <ChevronUp size={18} className=" text-secondary-foreground" />
                ) : (
                  <ChevronDown
                    size={18}
                    className="text-secondary-foreground"
                  />
                )}
              </button>
              <div
                className={`transition-all duration-300 ease-in-out ${
                  expandedGroups.includes(group.domain)
                    ? 'max-h-[1000px] opacity-100'
                    : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-4 py-2 space-y-2">
                  {group.tabs.map((tab) => (
                    <div
                      key={tab.id}
                      className="flex items-center space-x-2 group rounded-md bg-primary py-0.5 px-1"
                    >
                      {/* <PawPrint className="w-4 h-4 text-orange-300 opacity-0 group-hover:opacity-100 transition-opacity" /> */}
                      <img src={tab.favIconUrl} alt="" className="w-4 h-4" />
                      <span
                        className="text-sm truncate text-gray-600 group-hover:text-orange-600 transition-colors cursor-pointer flex-grow"
                        onClick={() => switchToTab(tab.id)}
                      >
                        {tab.title}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity border-none focus:outline-none"
                        onClick={() => closeTab(tab.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="relative z-50" ref={aiMenuRef}>
        <Button
          className="absolute bottom-4 right-4 rounded-full w-14 h-14 bg-gradient-to-br from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 text-white shadow-xl transform transition-transform hover:scale-110 border-none focus:outline-none"
          onClick={() => setIsAIMenuOpen(!isAIMenuOpen)}
        >
          <Cat size={28} />
        </Button>

        {isAIMenuOpen && (
          <div className="absolute z-50 bottom-20 right-4 rounded-md shadow-2xl px-4 py-6 space-y-2 bg-white/20 border border-white/30 backdrop-filter backdrop-blur-lg">
            <Button
              className="w-full justify-start text-red-500 bg-white hover:bg-orange-50 hover:text-orange-700"
              onClick={purgeTabs}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Purrge Tabs
            </Button>
            <Button
              className="w-full justify-start text-white hover:bg-orange-50 hover:text-orange-700 bg-primary"
              onClick={autoGroupTabs}
            >
              <LayersIcon className="mr-2 h-4 w-4" /> Meow-nage Groups
            </Button>
          </div>
        )}
      </div>
      {isAIMenuOpen && (
        <div className="fixed inset-0 bg-black opacity-50 z-40"></div>
      )}
    </div>
  );
}
