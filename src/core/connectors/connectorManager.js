import { tikTokConnector } from "./tiktokConnector";

/**
 * Connector Manager: Registry and lifecycle coordinator for external streaming platform connectors.
 */
class ConnectorManager {
  constructor() {
    this.connectors = new Map();
    // Register default connectors
    this.register("tiktok", tikTokConnector);
  }

  register(name, connectorInstance) {
    if (!name || !connectorInstance) return;
    this.connectors.set(name, connectorInstance);
  }

  unregister(name) {
    this.connectors.delete(name);
  }

  async connectAll(config = {}) {
    const results = {};
    for (const [name, connector] of this.connectors.entries()) {
      try {
        await connector.connect(config);
        results[name] = "SUCCESS";
      } catch (error) {
        results[name] = `ERROR: ${error.message}`;
      }
    }
    return results;
  }

  async disconnectAll() {
    for (const [name, connector] of this.connectors.entries()) {
      try {
        await connector.disconnect();
      } catch (error) {
        console.error(`Error disconnecting [${name}]:`, error);
      }
    }
  }

  getStatusAll() {
    const statuses = {};
    for (const [name, connector] of this.connectors.entries()) {
      statuses[name] = connector.getStatus();
    }
    return statuses;
  }

  getConnector(name) {
    return this.connectors.get(name) || null;
  }
}

export const connectorManager = new ConnectorManager();
