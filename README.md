# AI Zoom

## プロジェクト概要

「AI Zoom」は、複数の写真を繋ぎ合わせて、無限にズームインし続けるような視覚効果（インフィニットズーム）を実現するWebアプリケーションです。
WebGL (React Three Fiber) を使用して、写真の中に次の写真が埋め込まれているような射影変換を施しながら、滑らかなズームアニメーションを描画します。

## 主な機能

- **インフィニットズーム表示**: 複数の写真をシームレスに繋ぎ、一定の速度でズームを行う。
- **フレームエディター**: ズームの目標地点となる「額縁」の4隅をGUI上で直感的に指定・微調整する開発用ツール。
    - ドラッグ＆ドロップによる座標の指定。
    - 画像境界外へのマーカー配置に対応（自由な構図調整が可能）。
- **レスポンシブ対応**: 画面サイズに合わせて自動的にアスペクト比を調整。

## 開発環境

- React / TypeScript
- Three.js / React Three Fiber
- Vite

## セットアップと起動

```bash
# パッケージのインストール
npm install

# ローカル開発サーバーの起動
npm run dev
```

## 使い方（エンジニア向け）

### 座標の調整
1. ブラウザでアプリを起動し、右上の 「Open Frame Editor」 をクリックします。
2. 4つの赤いハンドルをドラッグして、次の中に入れ込みたい写真の範囲を指定します。
3. 表示された JSON データをコピーし、`src/assets/data/frames.json` の該当するフレームの `points` を更新します。

## ドキュメント

- [設計書](file:///Users/tote/project/git/totetero/ai_zoom/docs/design_document.md)
- [FrameEditor 改善の記録](file:///Users/tote/project/git/totetero/ai_zoom/docs/FrameEditor_Redesign.md)
