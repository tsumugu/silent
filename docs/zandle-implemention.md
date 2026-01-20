# **Zandle (Zustand \+ IPC) 実装指示書**

## **1\. 概要 (Why)**

### **背景**

SilentはElectronのマルチプロセスモデル（Main, UI Window, Hidden Window）を採用しており、音楽の再生状態、ユーザー設定、認証情報が複数のプロセスに分散している。これらを個別に ipcRenderer.on や send で同期すると、コードの断片化と不整合（状態のズレ）が発生する。

### **目的**

「状態（State）を更新すれば、物理的なプロセスの境界を越えて自動的に同期される」という**宣言的な同期基盤**を構築し、開発者が通信の詳細を意識しなくて済む環境（認知負荷の低減）を実現する。

## **2\. 現状と理想 (As-Is & To-Be)**

| 観点 | As-Is (現状) | To-Be (Zandle導入後) |
| :---- | :---- | :---- |
| **実装パラダイム** | **命令的 (Imperative)**: 状態変更のたびに明示的な通信コードが必要。 | **宣言的 (Declarative)**: Storeの値を変更するだけで通信が完結。 |
| **コードの場所** | コンポーネント内の useEffect や ipc.on に散乱。 | Zustandの **Middleware** 内部に隠蔽。 |
| **整合性保証** | 手動。同期し忘れによるUIの矛盾リスクが高い。 | 自動。Storeの更新とIPC送信がアトミックに実行。 |
| **開発体験 (DX)** | 通信路（IPCチャネル名）の管理が煩雑。 | 単一プロセスのWebアプリを書く感覚に近づく。 |

## **3\. 実装アプローチ (How)**

### **A. 通信プロトコルの定義**

全プロセスで共通利用するペイロードの型を定義します。

// src/shared/zandle/types.ts  
export interface ZandleSyncPayload {  
  storeName: string; // 同期対象のストア名 (例: 'player', 'settings')  
  key: string;       // 変更されたプロパティ名  
  value: any;        // 新しい値 (JSONシリアライズ可能であること)  
  originId: number;  // 発信元のwebContents ID (無限ループ防止用)  
}

### **B. Renderer側: Zandle Middleware**

Zustandの set 関数をフックし、変更をMainプロセスへ中継します。

// src/renderer/store/zandle.ts  
import { StateCreator } from 'zustand';

export const zandle \= (storeName: string) \=\> (config) \=\> (set, get, api) \=\> {  
  // 1\. 他プロセスからの同期リクエストを受信した際の処理  
  window.api.on(\`zandle:sync:${storeName}\`, (payload: ZandleSyncPayload) \=\> {  
    // 自分自身が発信源でない場合のみ、状態を反映する  
    set({ \[payload.key\]: payload.value });  
  });

  // 2\. Zustandのset関数を拡張して、変更をMainへ通知する  
  const zandleSet \= (partial, replace) \=\> {  
    const prevState \= get();  
    set(partial, replace); // ローカル状態を更新  
    const nextState \= get();

    // 差分（Shallow Compare）をチェックし、変更があればIPCで送信  
    Object.keys(partial as object).forEach(key \=\> {  
      if (prevState\[key\] \!== nextState\[key\]) {  
        window.api.send('zandle:request-sync', {  
          storeName,  
          key,  
          value: nextState\[key\],  
          originId: window.api.currentWindowId  
        });  
      }  
    });  
  };

  return config(zandleSet, get, api);  
};

### **C. Main側: Central Hub**

すべての通信の中継地点となり、ブロードキャストを制御します。

// src/main/services/ZandleHub.ts  
import { ipcMain, BrowserWindow } from 'electron';

export class ZandleHub {  
  static start() {  
    ipcMain.on('zandle:request-sync', (event, payload: ZandleSyncPayload) \=\> {  
      // 送信元のプロセス以外の全ウィンドウに対して同期をブロードキャスト  
      const allWindows \= BrowserWindow.getAllWindows();  
      allWindows.forEach(win \=\> {  
        if (win.webContents.id \!== event.sender.id) {  
          win.webContents.send(\`zandle:sync:${payload.storeName}\`, payload);  
        }  
      });  
        
      // 必要に応じてメインプロセスの永続化層（SettingsService等）とも自動連携可能  
    });  
  }  
}

## **4\. 重要な制約とガイドライン**

### **1\. 無限ループの防止**

Rendererが同期イベントを受けて set を呼び出した際、そこから再度 request-sync が飛ばないよう、originId または同期中フラグによるガードを徹底すること。

### **2\. シリアライズ可能なデータ**

IPCを通過させるため、Stateに含めるデータは以下のものに限定します。

* ❌ **不可**: Function, Map, Set, クラスのインスタンス。  
* ✅ **可能**: string, number, boolean, null, 平坦な Object, Array。

### **3\. 初期状態の同期 (Hydration)**

Rendererが起動した際、Mainプロセスが保持している「最新の真実」を一度取得する初期化フローを設けることで、起動時のUIのチラつきを防止します。

## **5\. 期待される効果**

この「Zandle」レイヤーの導入により、UIコンポーネントは **「Reactの標準的なState操作」** だけに集中でき、マルチプロセスというElectron特有の複雑さから解放されます。