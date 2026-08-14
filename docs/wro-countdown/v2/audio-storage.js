const DATABASE_NAME = "wro-countdown-audio";
const DATABASE_VERSION = 1;
const STORE_NAME = "files";
const FILE_KEY = "custom-audio";

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("このブラウザでは音声ファイルを保存できません。"));
      return;
    }

    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAudioFile(file) {
  const database = await openDatabase();

  try {
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(file, FILE_KEY);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function loadAudioFile() {
  try {
    const database = await openDatabase();

    try {
      return await new Promise((resolve, reject) => {
        const request = database
          .transaction(STORE_NAME, "readonly")
          .objectStore(STORE_NAME)
          .get(FILE_KEY);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } finally {
      database.close();
    }
  } catch (error) {
    console.warn("Could not restore the custom timer audio.", error);
    return null;
  }
}

export async function deleteAudioFile() {
  try {
    const database = await openDatabase();

    try {
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).delete(FILE_KEY);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error);
      });
    } finally {
      database.close();
    }
  } catch (error) {
    console.warn("Could not delete the custom timer audio.", error);
  }
}
