/**
 * Offline Queue Manager
 * Queues operations when offline and processes them when back online
 */

class OfflineQueueManager {
  constructor() {
    this.queue = this.loadQueue();
    this.isOnline = navigator.onLine;
    this.listeners = [];
    this.processing = false;

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  /**
   * Load queue from localStorage
   */
  loadQueue() {
    try {
      const stored = localStorage.getItem('offlineQueue');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      return [];
    }
  }

  /**
   * Save queue to localStorage
   */
  saveQueue() {
    try {
      localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Add operation to queue
   */
  enqueue(operation) {
    const queueItem = {
      id: Date.now() + Math.random(),
      operation,
      timestamp: new Date().toISOString(),
      retries: 0,
      maxRetries: 3,
    };

    this.queue.push(queueItem);
    this.saveQueue();
    this.notifyListeners('enqueue', queueItem);

    return queueItem.id;
  }

  /**
   * Remove operation from queue
   */
  dequeue(id) {
    this.queue = this.queue.filter((item) => item.id !== id);
    this.saveQueue();
    this.notifyListeners('dequeue', id);
  }

  /**
   * Get queue size
   */
  size() {
    return this.queue.length;
  }

  /**
   * Clear entire queue
   */
  clear() {
    this.queue = [];
    this.saveQueue();
    this.notifyListeners('clear');
  }

  /**
   * Process queue when online
   */
  async processQueue() {
    if (this.processing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    this.notifyListeners('processing', true);

    const itemsToProcess = [...this.queue];

    for (const item of itemsToProcess) {
      try {
        // Execute the operation
        await item.operation.execute();

        // Remove from queue on success
        this.dequeue(item.id);
        this.notifyListeners('success', item);
      } catch (error) {
        console.error('Failed to process queued operation:', error);

        // Increment retry count
        item.retries++;

        if (item.retries >= item.maxRetries) {
          // Remove from queue if max retries reached
          this.dequeue(item.id);
          this.notifyListeners('failed', { item, error });
        } else {
          // Update queue with new retry count
          this.saveQueue();
          this.notifyListeners('retry', item);
        }
      }
    }

    this.processing = false;
    this.notifyListeners('processing', false);
  }

  /**
   * Handle online event
   */
  handleOnline() {
    this.isOnline = true;
    this.notifyListeners('online');
    this.processQueue();
  }

  /**
   * Handle offline event
   */
  handleOffline() {
    this.isOnline = false;
    this.notifyListeners('offline');
  }

  /**
   * Subscribe to queue events
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event, data) {
    this.listeners.forEach((listener) => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Error in queue listener:', error);
      }
    });
  }

  /**
   * Get current online status
   */
  getOnlineStatus() {
    return this.isOnline;
  }

  /**
   * Get all queued items
   */
  getQueue() {
    return [...this.queue];
  }
}

// Create singleton instance
const offlineQueue = new OfflineQueueManager();

export default offlineQueue;

/**
 * Hook for React components to use offline queue
 */
export const useOfflineQueue = () => {
  return {
    enqueue: (operation) => offlineQueue.enqueue(operation),
    dequeue: (id) => offlineQueue.dequeue(id),
    size: () => offlineQueue.size(),
    clear: () => offlineQueue.clear(),
    isOnline: () => offlineQueue.getOnlineStatus(),
    getQueue: () => offlineQueue.getQueue(),
    subscribe: (listener) => offlineQueue.subscribe(listener),
  };
};
