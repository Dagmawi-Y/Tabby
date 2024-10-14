import { useState, useEffect } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Cat,
  PawPrint,
  Trash2,
  LayersIcon,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function TabbyExtension() {
  const [tabGroups, setTabGroups] = useState<
    { domain: string; tabs: chrome.tabs.Tab[] }[]
  >([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [isAIMenuOpen, setIsAIMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('recency');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    loadTabs();
    // Listen for tab updates
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
      setTabGroups(
        Object.entries(groups).map(([groupTitle, tabs]) => ({
          domain: groupTitle,
          tabs,
        }))
      );
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
    // Grouping by domain.
    chrome.tabs.query({}, (tabs) => {
      const groups: Record<string, number[]> = tabs.reduce<
        Record<string, number[]>
      >((acc, tab) => {
        const domain = tab.url ? new URL(tab.url).hostname : 'unknown';
        if (!acc[domain]) acc[domain] = [];
        if (tab.id !== undefined) {
          acc[domain].push(tab.id);
        }
        return acc;
      }, {});

      Object.values(groups).forEach((groupTabs) => {
        chrome.tabs.group({ tabIds: groupTabs }, () => loadTabs());
      });
    });
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
      }
      // Recency sort
      return sortOrder === 'asc'
        ? (a.tabs[0]?.id ?? 0) - (b.tabs[0]?.id ?? 0)
        : (b.tabs[0]?.id ?? 0) - (a.tabs[0]?.id ?? 0);
    });

  const getMainDomainTitle = (url: string, title: string): string => {
    const hostname = new URL(url).hostname;
    const parts = hostname.split('.');

    // Remove common prefixes and suffixes
    const cleanParts = parts.filter(
      (part) => !['www', 'com', 'org', 'net', 'edu'].includes(part)
    );

    // Try to extract a meaningful name from the title
    const titleWords = title.split(/[\s-]+/);
    const potentialNames = titleWords.filter(
      (word) =>
        word.length > 1 &&
        !['the', 'and', 'or', 'of', 'in', 'on', 'at', 'to'].includes(
          word.toLowerCase()
        )
    );

    // Check if any part of the hostname appears in the title
    for (const part of cleanParts) {
      const matchingName = potentialNames.find((name) =>
        name.toLowerCase().includes(part.toLowerCase())
      );
      if (matchingName) return matchingName;
    }

    // If no match found in title, use the most specific part of the hostname
    if (cleanParts.length > 0) {
      return cleanParts[0].charAt(0).toUpperCase() + cleanParts[0].slice(1);
    }

    // Fallback to the full hostname if all else fails
    return hostname;
  };

  return (
    <div className="w-96 h-[600px] bg-gradient-to-br from-[#CACF85] to-[#8CBA80] flex flex-col p-4 shadow-lg relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-5">
        <div className="absolute top-4 left-4 transform -rotate-12">
          <PawPrint className="text-orange-400" size={64} />
        </div>
        <div className="absolute bottom-4 right-4 transform rotate-12">
          <PawPrint className="text-orange-400" size={64} />
        </div>
      </div>

      <div className=" mb-4 flex items-center">
        <img src="../tabby.png" alt="logo" className="mr-2 w-10 h-10" />
        <h1 className="text-2xl font-bold text-primary">Tabby</h1>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="whitespace-nowrap bg-white border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              Sort by <ChevronDown className="ml-1" size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onClick={() => {
                setSortBy('recency');
                setSortOrder('desc');
              }}
            >
              Recency (Newest)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSortBy('recency');
                setSortOrder('asc');
              }}
            >
              Recency (Oldest)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSortBy('alphabet');
                setSortOrder('asc');
              }}
            >
              Alphabet (A-Z)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSortBy('alphabet');
                setSortOrder('desc');
              }}
            >
              Alphabet (Z-A)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex-grow overflow-y-auto space-y-2 pr-2">
        {searchTerm ? (
          <div className="space-y-2">
            {filteredAndSortedGroups.flatMap((group) =>
              group.tabs.map((tab) => (
                <div
                  key={tab.id}
                  className="bg-white rounded-md shadow-md p-2 flex items-center space-x-2 group"
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
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))
            )}
          </div>
        ) : (
          filteredAndSortedGroups.map((group) => (
            <div
              key={group.domain}
              className="bg-white rounded-md shadow-md overflow-hidden"
            >
              <button
                className="w-full px-4 py-2 text-left font-medium flex justify-between items-center hover:bg-orange-50 transition-colors"
                onClick={() => toggleGroup(group.domain)}
              >
                <span className="text-orange-600">{group.domain}</span>
                {expandedGroups.includes(group.domain) ? (
                  <ChevronUp size={18} className="text-orange-400" />
                ) : (
                  <ChevronDown size={18} className="text-orange-400" />
                )}
              </button>
              {expandedGroups.includes(group.domain) && (
                <div className="px-4 py-2 space-y-2">
                  {group.tabs.map((tab) => (
                    <div
                      key={tab.id}
                      className="flex items-center space-x-2 group"
                    >
                      <PawPrint className="w-4 h-4 text-orange-300 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      <div className="relative">
        <Button
          className="absolute bottom-4 right-4 rounded-full w-14 h-14 bg-gradient-to-br from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 text-white shadow-lg transform transition-transform hover:scale-110"
          onClick={() => setIsAIMenuOpen(!isAIMenuOpen)}
        >
          <Cat size={28} />
        </Button>
        {isAIMenuOpen && (
          <div className="absolute bottom-20 right-4 bg-white rounded-md shadow-lg p-2 space-y-2 animate-fadeIn">
            <Button
              variant="ghost"
              className="w-full justify-start text-orange-600 hover:bg-orange-50 hover:text-orange-700"
              onClick={purgeTabs}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Purrge Tabs
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-orange-600 hover:bg-orange-50 hover:text-orange-700"
              onClick={autoGroupTabs}
            >
              <LayersIcon className="mr-2 h-4 w-4" /> Meow-nage Groups
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
