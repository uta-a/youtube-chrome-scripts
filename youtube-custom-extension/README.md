# YouTube Custom Controls

YouTube向けのChrome拡張機能です。既存スクリプトのショートカット、タブアイコン変更、テーマ色変更を統合し、ポップアップから設定できます。

## 開発

```sh
npm install
npm run build:dev
```

Chromeの拡張機能画面で「パッケージ化されていない拡張機能を読み込む」から `dist/` を選びます。開発ビルドでは、既定でYouTube公式のfavicon URLを使ってタブアイコンとテーマ色を変更します。

## 本番ビルド

```sh
npm run build
```

本番ビルドの初期状態では、YouTube公式のfaviconとテーマ色を変更しません。ポップアップでONにした場合のみ、タブアイコンやテーマ色を変更します。

## 検証

```sh
npm run typecheck
npm test
```
