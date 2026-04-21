# Multiple Subject Support (複数被写体対応)

このドキュメントでは、複数の被写体（子供など）を切り替えてインフィニットズームを表示・編集するための仕組みについて解説します。

## 1. 概要
当初は一人の被写体のみを想定していましたが、複数の子供や異なるプロジェクトを同一のアプリケーションで管理できるように拡張されました。これにより、個別の画像セットと、それに対応する各ステップの座標データ（frames.json）を動的に切り替えることが可能です。

## 2. データ構造

### 2.1. subjects.json
全ての被写体のリストを定義する中心的なファイルです。
`src/assets/data/subjects.json` に配置されます。

```json
[
  {
    "id": "child1",           // 内部ID
    "name": "一人目の子",     // 表示名
    "imageDir": "/img/child1/", // 画像が格納されているディレクトリ (public からの相対パス)
    "framesPath": "frames_child1.json" // 対応するフレーム定義ファイルの名前
  },
  {
    "id": "child2",
    "name": "二人目の子",
    "imageDir": "/img/child2/",
    "framesPath": "frames_child2.json"
  }
]
```

### 2.2. 分割された Frame Data
各被写体に対応する座標データは、`subjects.json` の `framesPath` で指定された名前で `src/assets/data/` ディレクトリ配下に保存します。これにより、被写体ごとに独立したズーム設定を持つことができます。

## 3. 実装の仕組み

### 3.1. App.tsx での管理
`App.tsx` では `subjects.json` を読み込み、現在選択されている被写体の ID を `localStorage` で保持します。
選択された被写体に応じて、以下のリソースを動的に決定します。
- **画像群**: `usePreloadImages` に渡される `imageDir`。
- **フレームデータ**: 各 JSON ファイルからインポートされたデータをマップで参照。

### 3.2. ツールへの情報注入
`FrameEditor` および `RecursiveProcessor` は、現在選択されている `subject` オブジェクトをプロパティとして受け取ります。これにより：
- `FrameEditor` は保存すべき正しいファイル名（例: `frames_child2.json`）を提示できます。
- `RecursiveProcessor` は正しい画像保存先パス（例: `public/img/child2/`）を表示できます。

## 4. 被写体の追加手順
1. `public/img/` 配下に新しいディレクトリを作成し、画像を配置します。
2. `src/assets/data/` に新しいフレーム定義 JSON（空の配列 `[]` から開始可能）を作成します。
3. `src/assets/data/subjects.json` に新しい被写体の定義を追加します。
4. `src/App.tsx` の `framesMap` に新しい JSON データのインポートとマッピングを追加します。
