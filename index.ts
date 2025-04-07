#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const SCRAPI_API_KEY = process.env.SCRAPI_API_KEY || "00000000-0000-0000-0000-000000000000";
const SCRAPI_SERVER_NAME = "ScrAPI MCP Server";
const SCRAPI_SERVER_VERSION = "0.0.1";

const server = new McpServer({
  name: SCRAPI_SERVER_NAME,
  version: SCRAPI_SERVER_VERSION,
});

server.tool(
  "scrape_url_html",
  "Use a URL to scrape a website using the ScrAPI service and retrieve the result as HTML. " +
  "Use this for scraping website content that is difficult to access because of bot detection, captchas or even geolocation restrictions. " +
  "The result will be in HTML which is preferable if advanced parsing is required.",
  { url: z.string().url({ message: "Invalid URL" }) },
  async ({ url }) => await scrapeUrl(url, "HTML")
);

server.tool(
  "scrape_url_markdown",
  "Use a URL to scrape a website using the ScrAPI service and retrieve the result as Markdown. " +
  "Use this for scraping website content that is difficult to access because of bot detection, captchas or even geolocation restrictions. " +
  "The result will be in Markdown which is preferable if the text content of the webpage is important and not the structural information of the page.",
  { url: z.string().url({ message: "Invalid URL" }) },
  async ({ url }) => await scrapeUrl(url, "Markdown")
);

async function scrapeUrl(
  url: string,
  format: "HTML" | "Markdown"
): Promise<CallToolResult> {
  var body = {
    url: url,
    useBrowser: true,
    solveCaptchas: true,
    acceptDialogs: true,
    proxyType: "Residential",
    responseFormat: format,
  };

  try {
    const response = await fetch("https://api.scrapi.tech/v1/scrape", {
      method: "POST",
      headers: {
        "User-Agent": `${SCRAPI_SERVER_NAME} - ${SCRAPI_SERVER_VERSION}`,
        "Content-Type": "application/json",
        "X-API-KEY": SCRAPI_API_KEY,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    const data = await response.text();

    if (response.ok) {
      return {
        content: [
          {
            type: "text",
            mimeType: `text/${format.toLowerCase()}`,
            text: data,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: data,
        },
      ],
      isError: true,
    };
  } catch (error) {
    console.error("Error calling API:", error);
  }

  const response = await fetch("https://api.scrapi.tech/v1/scrape", {
    method: "POST",
    headers: {
      "User-Agent": `${SCRAPI_SERVER_NAME} - ${SCRAPI_SERVER_VERSION}`,
      "Content-Type": "application/json",
      "X-API-KEY": SCRAPI_API_KEY,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  const data = await response.text();

  return {
    content: [
      {
        type: "text",
        mimeType: `text/${format.toLowerCase()}`,
        text: data,
      },
    ],
  };
}

try {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${SCRAPI_SERVER_NAME} running on stdio.`);
} catch (error) {
  console.error("Fatal error running server:", error);
  process.exit(1);
}
