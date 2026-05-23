import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// 您的 Firebase 專案設定，後續請填入真實 config
const firebaseConfig = {
  projectId: "etfstudy-65527",
  // 此為公開的唯讀資料庫，即使 apiKey 外流也不會影響安全性，因為我們有設定 firestore.rules
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
