#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  SubsidyListResponse,
  SubsidyDetailResponse,
  SubsidyDetailSummary,
} from "./types.js";

const API_BASE_URL = "https://api.jgrants-portal.go.jp/exp/v1/public";

// Tool schema definitions
const ListSubsidiesSchema = z.object({
  keyword: z.string().default("補助金"),
});

const GetSubsidyDetailSchema = z.object({
  subsidy_id: z.string(),
});

const DownloadAttachmentSchema = z.object({
  subsidy_id: z.string(),
  category: z.enum([
    "application_guidelines",
    "outline_of_grant",
    "application_form",
  ]),
  index: z.number().int().min(0),
});

// Initialize MCP server
const server = new Server(
  {
    name: "jgrants-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_subsidies",
        description:
          "Search for subsidies currently accepting applications using the specified keyword. Default is '補助金' (subsidy).",
        inputSchema: {
          type: "object",
          properties: {
            keyword: {
              type: "string",
              description: "Search keyword",
              default: "補助金",
            },
          },
        },
      },
      {
        name: "get_subsidy_detail",
        description:
          "Get detailed information about a specific subsidy. Use the subsidy ID, not the title.",
        inputSchema: {
          type: "object",
          properties: {
            subsidy_id: {
              type: "string",
              description: "Subsidy ID",
            },
          },
          required: ["subsidy_id"],
        },
      },
      {
        name: "download_attachment",
        description:
          "Download a subsidy's attachment document. Returns the file data in base64 encoding along with metadata. First call get_subsidy_detail to see the attachments array for each category (application_guidelines, outline_of_grant, application_form), then use the 'index' from attachments[n].index to download the specific file.",
        inputSchema: {
          type: "object",
          properties: {
            subsidy_id: {
              type: "string",
              description: "Subsidy ID",
            },
            category: {
              type: "string",
              enum: [
                "application_guidelines",
                "outline_of_grant",
                "application_form",
              ],
              description: "Attachment category",
            },
            index: {
              type: "integer",
              description: "Attachment index (starts from 0)",
              minimum: 0,
            },
          },
          required: ["subsidy_id", "category", "index"],
        },
      },
    ],
  };
});

// Execute tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "list_subsidies": {
      const args = ListSubsidiesSchema.parse(request.params.arguments ?? {});
      const params = new URLSearchParams({
        keyword: args.keyword,
        sort: "acceptance_end_datetime",
        order: "ASC",
        acceptance: "1",
      });

      try {
        const response = await fetch(`${API_BASE_URL}/subsidies?${params}`);
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`API error: ${response.status} - ${errorBody}`);
        }
        const data = (await response.json()) as SubsidyListResponse;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
          structuredContent: data,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error occurred: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            },
          ],
        };
      }
    }

    case "get_subsidy_detail": {
      const args = GetSubsidyDetailSchema.parse(request.params.arguments);

      try {
        const response = await fetch(
          `${API_BASE_URL}/subsidies/id/${args.subsidy_id}`
        );
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`API error: ${response.status} - ${errorBody}`);
        }
        const data = (await response.json()) as SubsidyDetailResponse;

        // Check result
        if (!data.result || data.result.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `Subsidy with ID ${args.subsidy_id} was not found.`,
              },
            ],
          };
        }

        const subsidyInfo = data.result[0];

        // 添付ファイルは軽量メタ情報（index, name, サイズ等）のみ返し、実データは download_attachment で取得
        // Base64 文字列長から概算バイトサイズを計算（デコードコストを回避）
        const calculateBase64Size = (base64: string): number => {
          // 改行などの空白文字を除去（API が 76 文字ごとの改行付きで返すケースに対応）
          const cleanBase64 = base64.replace(/\s+/g, "");
          const paddingCount = cleanBase64.endsWith("==")
            ? 2
            : cleanBase64.endsWith("=")
              ? 1
              : 0;
          return Math.floor((cleanBase64.length * 3) / 4) - paddingCount;
        };

        // 添付配列から軽量メタ情報を生成する共通ヘルパー
        const buildAttachmentList = (
          attachments?: Array<{ name: string; data: string }>
        ) =>
          attachments?.map((attachment, index) => ({
            index,
            name: attachment.name,
            sizeBytes: calculateBase64Size(attachment.data),
          })) ?? [];

        const applicationGuidelinesAttachments = buildAttachmentList(
          subsidyInfo.application_guidelines
        );
        const outlineOfGrantAttachments = buildAttachmentList(
          subsidyInfo.outline_of_grant
        );
        const applicationFormAttachments = buildAttachmentList(
          subsidyInfo.application_form
        );

        const subsidySummary: SubsidyDetailSummary = {
          ...subsidyInfo,
          application_guidelines: {
            count: applicationGuidelinesAttachments.length,
            hasAttachments: applicationGuidelinesAttachments.length > 0,
            attachments: applicationGuidelinesAttachments,
          },
          outline_of_grant: {
            count: outlineOfGrantAttachments.length,
            hasAttachments: outlineOfGrantAttachments.length > 0,
            attachments: outlineOfGrantAttachments,
          },
          application_form: {
            count: applicationFormAttachments.length,
            hasAttachments: applicationFormAttachments.length > 0,
            attachments: applicationFormAttachments,
          },
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(subsidySummary, null, 2),
            },
          ],
          structuredContent: subsidySummary,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error occurred: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            },
          ],
        };
      }
    }

    case "download_attachment": {
      const args = DownloadAttachmentSchema.parse(request.params.arguments);

      try {
        const response = await fetch(
          `${API_BASE_URL}/subsidies/id/${args.subsidy_id}`
        );
        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`API error: ${response.status} - ${errorBody}`);
        }
        const data = (await response.json()) as SubsidyDetailResponse;

        if (!data.result || data.result.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `Subsidy with ID ${args.subsidy_id} was not found.`,
              },
            ],
          };
        }

        const subsidyInfo = data.result[0];

        if (
          !subsidyInfo[args.category] ||
          !Array.isArray(subsidyInfo[args.category])
        ) {
          return {
            content: [
              {
                type: "text",
                text: `Attachment category '${args.category}' does not exist.`,
              },
            ],
          };
        }

        const attachments = subsidyInfo[args.category]!;
        if (args.index < 0 || args.index >= attachments.length) {
          return {
            content: [
              {
                type: "text",
                text: `Attachment index ${args.index} is invalid.`,
              },
            ],
          };
        }

        const attachment = attachments[args.index];
        const actualByteSize = Buffer.from(attachment.data, "base64").length;

        const output = {
          subsidy_id: subsidyInfo.id,
          subsidy_name: subsidyInfo.name,
          category: args.category,
          index: args.index,
          file_name: attachment.name,
          data: attachment.data,
          data_size_bytes: actualByteSize,
          encoding: "base64" as const,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  ...output,
                  data: `[Base64 data: ${actualByteSize} bytes]`,
                },
                null,
                2
              ),
            },
          ],
          structuredContent: output,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error occurred: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            },
          ],
        };
      }
    }

    default:
      throw new Error("Unknown tool");
  }
});

// Main function
async function main() {
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error("jGrants MCP server started");
}

// Error handling
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
