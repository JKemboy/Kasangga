export const MAX_SCHEDULE_FILE_SIZE = 10 * 1024 * 1024;
const allowedTypes = new Set(["image/png", "image/jpeg", "application/pdf"]);
const databaseName = "campustutor-schedule-uploads";
const storeName = "files";

export function scheduleFileError(file) {
  if (!file) return "Choose a PNG, JPEG, or PDF file.";
  if (!allowedTypes.has(file.type)) return "Use a PNG, JPEG, or PDF file.";
  if (!Number.isFinite(file.size) || file.size <= 0)
    return "This file is empty. Choose a file with your class schedule.";
  if (file.size > MAX_SCHEDULE_FILE_SIZE)
    return "The file is too large. Choose a file of 10 MB or less.";
  return "";
}

export function scheduleFileSize(size) {
  if (!Number.isFinite(size) || size < 0) return "Size unavailable";
  return size >= 1024 * 1024
    ? `${(size / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.ceil(size / 1024))} KB`;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("File storage is unavailable in this browser."));
      return;
    }
    let settled = false;
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName))
        request.result.createObjectStore(storeName);
    };
    request.onerror = () => {
      settled = true;
      reject(new Error("Could not open file storage on this browser."));
    };
    request.onblocked = () => {
      settled = true;
      reject(new Error("Close other CampusTutor tabs and try again."));
    };
    request.onsuccess = () => {
      const database = request.result;
      if (settled) {
        database.close();
        return;
      }
      database.onversionchange = () => database.close();
      resolve(database);
    };
  });
}

async function withFileStore(mode, action) {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    let transaction;
    let request;
    try {
      transaction = database.transaction(storeName, mode);
      request = action(transaction.objectStore(storeName));
    } catch (error) {
      database.close();
      reject(error);
      return;
    }
    // A successful request alone does not guarantee the transaction committed.
    transaction.oncomplete = () => {
      database.close();
      resolve(request.result);
    };
    transaction.onabort = () => {
      database.close();
      reject(new Error("Could not save or read the file on this browser."));
    };
    transaction.onerror = () => {
      // The transaction's abort event reports a failed commit to the caller.
    };
  });
}

export const scheduleFileStore = {
  save: (id, file) =>
    withFileStore("readwrite", (store) => store.put(file, id)),
  load: (id) => withFileStore("readonly", (store) => store.get(id)),
  remove: (id) => withFileStore("readwrite", (store) => store.delete(id)),
};

export async function saveScheduleDraft(
  file,
  update,
  {
    storage = scheduleFileStore,
    id = crypto.randomUUID(),
    created = new Date().toISOString(),
    isCancelled = () => false,
  } = {},
) {
  const validation = scheduleFileError(file);
  if (validation) throw new Error(validation);
  const metadata = {
    id,
    name: file.name,
    size: file.size,
    type: file.type,
    created,
    status: "Draft",
  };
  await storage.save(id, file);
  try {
    if (isCancelled()) {
      await storage.remove(id);
      return null;
    }
    const saved = update((data) => ({
      ...data,
      uploads: [...(data.uploads || []), metadata],
    }));
    if (saved !== true)
      throw new Error("Could not save the upload details. Please try again.");
    return metadata;
  } catch (error) {
    // Do not leave a new file behind when its metadata could not be saved.
    await storage.remove(id).catch(() => {});
    throw error;
  }
}
