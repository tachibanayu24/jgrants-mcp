# jgrants-mcp

日本の補助金情報を検索するための MCP (Model Context Protocol) サーバー

## 概要

jgrants-mcp は、jGrants（デジタル庁が運営する補助金電子申請システム）の公開 API をラップした MCP サーバーです。LLM から MCP を経由して日本の補助金情報に簡単にアクセスできます。

## 機能

以下の3つのツールを提供します：

### 1. `list_subsidies`
指定したキーワードで公募中の補助金一覧を取得します。

**パラメータ:**
- `keyword` (文字列, オプション): 検索キーワード（デフォルト: "補助金"）

### 2. `get_subsidy_detail`
補助金の詳細情報を取得します。添付文書の base64 データは除去され、ダウンロード用 URL が付与されます。

**パラメータ:**
- `subsidy_id` (文字列, 必須): 補助金の ID（title ではなく id を指定）

### 3. `download_attachment`
指定した補助金の添付文書のダウンロード用 URL を返します。

**パラメータ:**
- `subsidy_id` (文字列, 必須): 補助金の ID
- `category` (文字列, 必須): 添付文書のカテゴリ
  - `application_guidelines`: 公募要領
  - `outline_of_grant`: 交付要綱
  - `application_form`: 申請様式
- `index` (整数, 必須): 添付文書のインデックス（0から開始）

## インストール

### npm 経由でグローバルインストール

```bash
npm install -g jgrants-mcp
```

### npx で直接実行

```bash
npx jgrants-mcp
```

### ローカル開発

```bash
git clone https://github.com/tachibanayu24/jgrants-mcp.git
cd jgrants-mcp
npm install
npm run build
```

## 使用方法

### Claude Desktop での設定

Claude Desktop の設定ファイル（`~/Library/Application Support/Claude/claude_desktop_config.json`）に以下を追加：

```json
{
  "mcpServers": {
    "jgrants": {
      "command": "npx",
      "args": ["jgrants-mcp"]
    }
  }
}
```

### 他の MCP クライアントでの使用

MCP に対応した任意のクライアントから利用可能です。

## 開発

### 必要な環境

- Node.js 18 以上
- npm または yarn

### ビルド

```bash
npm run build
```

### 開発モード

```bash
npm run dev
```

## API について

このツールは jGrants の公開 API（`https://api.jgrants-portal.go.jp/exp/v1/public`）を使用しています。API キーは不要です。

## 注意事項

- API のレート制限に配慮してください
- 添付文書の実際のダウンロード機能は提供していません（URL のみ返却）
- base64 データの除去によりレスポンスサイズを軽量化しています

## ライセンス

MIT

## 作者

tachibanayu24

## 貢献

Issue や Pull Request は歓迎します。

- Issue: [https://github.com/tachibanayu24/jgrants-mcp/issues](https://github.com/tachibanayu24/jgrants-mcp/issues)
- Pull Request: [https://github.com/tachibanayu24/jgrants-mcp/pulls](https://github.com/tachibanayu24/jgrants-mcp/pulls)