# デプロイ仕様書

## 概要
本プロジェクトは、GitHub Actions を利用して GitHub Pages に自動デプロイされるよう構成されています。

## デプロイフロー
1.  **トリガー**: `main` ブランチへのプッシュまたは手動実行（workflow_dispatch）。
2.  **ビルド**: GitHub Actions 上で `npm run build` を実行。
3.  **成果物**: ビルドされた `dist/` ディレクトリの内容が GitHub Pages にアップロードされます。

## 設定詳細

### Vite 設定
- **ファイル**: `vite.config.ts`
- **設定内容**: `base: '/ai_zoom/'`
    - GitHub Pages のサブディレクトリパスで正しくリソースを読み込むために必要です。

### GitHub Actions
- **ファイル**: `.github/workflows/deploy.yml`
- **権限**: `pages: write`, `id-token: write` が必要です。

## 注意事項
GitHub のリポジトリ設定（Settings > Pages）にて、**Build and deployment > Source** を **"GitHub Actions"** に設定する必要があります。

## 公開URL
https://totetero.github.io/ai_zoom/
