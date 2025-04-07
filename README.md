
# ScrAPI MCP Server

MCP server for using ScrAPI to scrape web pages.

ScrAPI is your ultimate web scraping solution, offering powerful, reliable, and easy-to-use features to extract data from any website effortlessly.

## Tools

1. `scrape_url_html`
   - Use a URL to scrape a website using the ScrAPI service and retrieve the result as HTML.
     Use this for scraping website content that is difficult to access because of bot detection, captchas or even geolocation restrictions.
     The result will be in HTML which is preferable if advanced parsing is required.
   - Input: `url` (string)
   - Returns: HTML content of the URL

2. `scrape_url_markdown`
   - Use a URL to scrape a website using the ScrAPI service and retrieve the result as Markdown.
     Use this for scraping website content that is difficult to access because of bot detection, captchas or even geolocation restrictions.
     The result will be in Markdown which is preferable if the text content of the webpage is important and not the structural information of the page.
   - Input: `url` (string)
   - Returns: Markdown content of the URL

## Setup

### API Key (optional)

Optionally get an API key from the [ScrAPI website](https://scrapi.tech).

Without an API key you will be limited to one concurrent call and twenty free calls per day with minimal queuing capabilities.

### Usage with Claude Desktop

Add the following to your `claude_desktop_config.json`:

#### Docker

```json
{
  "mcpServers": {
    "scrapi": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "SCRAPI_API_KEY",
        "deventerprisesoftware/scrapi-mcp"
      ],
      "env": {
        "SCRAPI_API_KEY": "<YOUR_API_KEY>"
      }
    }
  }
}
```

### NPX

```json
{
  "mcpServers": {
    "scrapi": {
      "command": "npx",
      "args": [
        "-y",
        "@deventerprisesoftware/scrapi-mcp"
      ],
      "env": {
        "SCRAPI_API_KEY": "<YOUR_API_KEY>"
      }
    }
  }
}
```

## Build

Docker build:

```bash
docker build -t deventerprisesoftware/scrapi-mcp -f Dockerfile .
```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
