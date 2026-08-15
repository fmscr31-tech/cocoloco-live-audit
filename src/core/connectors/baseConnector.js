/**
 * Base Connector: Abstract interface defining common contract for all streaming platform connectors.
 */
export class BaseConnector {
  constructor(name = "BaseConnector") {
    this.name = name;
    this.status = "DISCONNECTED"; // DISCONNECTED, CONNECTING, CONNECTED, ERROR
  }

  async connect(options = {}) {
    throw new Error("Method connect() must be implemented by subclass.");
  }

  async disconnect() {
    throw new Error("Method disconnect() must be implemented by subclass.");
  }

  getStatus() {
    return {
      name: this.name,
      status: this.status
    };
  }

  sendEvent(event) {
    throw new Error("Method sendEvent() must be implemented by subclass.");
  }
}
