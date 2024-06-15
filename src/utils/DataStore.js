const DEFAULT_ID = 'myid';
class DataStore {
  constructor(dbName, storeName) {
    this.dbName = dbName;
    this.storeName = storeName;
    this.dbPromise = this.initDB();
  }

  // Initialize the database
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        console.log('Database opened successfully');
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        console.error('Error opening database:', event.target.errorCode);
        reject(event.target.errorCode);
      };
    });
  }

  // Add entry to the database with a timestamp
  async add(entry) {
    if (typeof entry !== 'object' || entry === null) {
      entry = { value: entry };
    }
    entry.timestamp = new Date().toISOString();
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(entry);

      request.onsuccess = () => {
        console.log('Entry added successfully');
        resolve(request.result);
      };
      request.onerror = (event) => {
        console.error('Error adding entry:', event.target.errorCode);
        reject(event.target.errorCode);
      };
    });
  }

  async set(entry, id = DEFAULT_ID) {
    if (typeof entry !== 'object' || entry === null) {
      throw new Error('Entry must be an object');
    }

    entry.id = id;
    entry.timestamp = new Date().toISOString();

    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entry);

      request.onsuccess = () => {
        console.log('Entry set successfully');
        resolve(request.result);
      };
      request.onerror = (event) => {
        console.error('Error setting entry:', event.target.errorCode);
        reject(event.target.errorCode);
      };
    });
  }

  async get(id = DEFAULT_ID) {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          reject('No matching entry found');
        }
      };
      request.onerror = (event) => {
        console.error('Error fetching entry:', event.target.errorCode);
        reject(event.target.errorCode);
      };
    });
  }

  // Get all entries from the database sorted by timestamp in descending order
  async getAll() {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev'); // Open a cursor in reverse order

      const entries = [];
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          entries.push(cursor.value);
          cursor.continue();
        } else {
          resolve(entries);
        }
      };
      request.onerror = (event) => {
        console.error('Error fetching entries:', event.target.errorCode);
        reject(event.target.errorCode);
      };
    });
  }
}

export default DataStore;
