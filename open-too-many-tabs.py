import webbrowser
import random

# list of safe sites with varied pages
safe_sites = [
    # wikipedia pages
    "https://en.wikipedia.org/wiki/Python_(programming_language)",
    "https://en.wikipedia.org/wiki/Artificial_intelligence",
    "https://en.wikipedia.org/wiki/Space_exploration",
    
    # bbc news articles
    "https://www.bbc.com/news/technology-56858025",
    "https://www.bbc.com/news/science-environment-56837908",
    "https://www.bbc.com/news/world-us-canada-56857249",
    
    # stack overflow questions
    "https://stackoverflow.com/questions/231767/what-does-the-yield-keyword-do",
    "https://stackoverflow.com/questions/415511/how-to-get-the-current-time-in-python",
    
    # other unique domains
    "https://www.github.com",
    "https://www.nationalgeographic.com",
    "https://www.medium.com",
    "https://www.khanacademy.org",
    "https://www.reddit.com",
    "https://www.ted.com",
    "https://www.weather.com",
    "https://www.cnn.com",
    "https://www.bloomberg.com",
    "https://www.theguardian.com",
    "https://www.nytimes.com",
    "https://www.nasa.gov",
    "https://www.imdb.com",
    "https://www.mit.edu",
    "https://www.mozilla.org",
    "https://www.quora.com",
    "https://www.sciencedaily.com",
    "https://www.espn.com",
    "https://www.techcrunch.com",
    "https://www.forbes.com",
    "https://www.adobe.com",
    "https://www.coursera.org",
    "https://www.edx.org",
    "https://www.linkedin.com",
    "https://www.yale.edu",
    "https://www.spotify.com",
]

# shuffle and select random links
random_sites = random.sample(safe_sites, 30)

# open each site in a new tab
for site in random_sites:
    webbrowser.open_new_tab(site)
