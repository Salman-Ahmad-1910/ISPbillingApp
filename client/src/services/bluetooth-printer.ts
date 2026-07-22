import type { BluetoothDevice, BluetoothRemoteGATTServer, BluetoothRemoteGATTService, BluetoothRemoteGATTCharacteristic } from '@/types/web-bluetooth';

export interface BluetoothPrinter {
  id: string;
  name: string;
  language: 'esc-pos' | 'star-prnt';
  codepageMapping: string;
  connected: boolean;
}

export interface PrintOptions {
  copies?: number;
  cut?: boolean;
  buzz?: boolean;
}

export class BluetoothPrinterService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private service: BluetoothRemoteGATTService | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private printerInfo: BluetoothPrinter | null = null;

  private readonly PRINTER_SERVICE_UUID = '00001101-0000-1000-8000-00805f9b34fb'; // Serial Port Profile
  private readonly PRINTER_CHARACTERISTIC_UUID = '00001101-0000-1000-8000-00805f9b34fb';

  async connect(): Promise<BluetoothPrinter> {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API is not available in this browser');
    }

    try {
      // Request Bluetooth device
      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [this.PRINTER_SERVICE_UUID]
      });

      // Connect to GATT server
      const gattServer = this.device.gatt;
      if (!gattServer) {
        throw new Error('GATT server not available');
      }
      this.server = await gattServer.connect();
      if (!this.server) {
        throw new Error('Failed to connect to GATT server');
      }

      // Get the service
      this.service = await this.server.getPrimaryService(this.PRINTER_SERVICE_UUID);
      
      // Get the characteristic for writing
      this.characteristic = await this.service.getCharacteristic(this.PRINTER_CHARACTERISTIC_UUID);

      // Store printer info
      this.printerInfo = {
        id: this.device.id,
        name: this.device.name || 'Unknown Printer',
        language: 'esc-pos', // Default to ESC/POS
        codepageMapping: 'pc437', // Default codepage
        connected: true
      };

      return this.printerInfo;
    } catch (error) {
      console.error('Bluetooth connection failed:', error);
      throw new Error(`Failed to connect to printer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async reconnect(printerId: string): Promise<BluetoothPrinter | null> {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API is not available in this browser');
    }

    try {
      const devices = await navigator.bluetooth.getDevices();
      const device = devices.find((d: BluetoothDevice) => d.id === printerId);
      
      if (!device) {
        return null;
      }

      this.device = device;
      const gattServer = this.device.gatt;
      if (!gattServer) {
        throw new Error('GATT server not available');
      }
      this.server = await gattServer.connect();
      
      if (!this.server) {
        throw new Error('Failed to connect to GATT server');
      }

      this.service = await this.server.getPrimaryService(this.PRINTER_SERVICE_UUID);
      this.characteristic = await this.service.getCharacteristic(this.PRINTER_CHARACTERISTIC_UUID);

      this.printerInfo = {
        id: this.device.id,
        name: this.device.name || 'Unknown Printer',
        language: 'esc-pos',
        codepageMapping: 'pc437',
        connected: true
      };

      return this.printerInfo;
    } catch (error) {
      console.error('Bluetooth reconnection failed:', error);
      return null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.server && this.server.connected) {
      this.server.disconnect();
    }
    
    this.device = null;
    this.server = null;
    this.service = null;
    this.characteristic = null;
    
    if (this.printerInfo) {
      this.printerInfo.connected = false;
    }
  }

  async print(data: Uint8Array, options: PrintOptions = {}): Promise<void> {
    if (!this.characteristic || !this.printerInfo?.connected) {
      throw new Error('Printer not connected');
    }

    try {
      // Send data in chunks if needed (Bluetooth has MTU limits)
      const chunkSize = 20; // Safe chunk size for most Bluetooth devices
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await this.characteristic.writeValue(chunk);
      }

      // Add cut command if requested
      if (options.cut) {
        const cutCommand = new Uint8Array([0x1D, 0x56, 0x00]); // GS V 0 - Full cut
        await this.characteristic.writeValue(cutCommand);
      }

      // Add buzz command if requested
      if (options.buzz) {
        const buzzCommand = new Uint8Array([0x1B, 0x42]); // ESC B - Buzz
        await this.characteristic.writeValue(buzzCommand);
      }

    } catch (error) {
      console.error('Print failed:', error);
      throw new Error(`Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isConnected(): boolean {
    return this.printerInfo?.connected || false;
  }

  getPrinterInfo(): BluetoothPrinter | null {
    return this.printerInfo;
  }

  async getAvailablePrinters(): Promise<BluetoothPrinter[]> {
    if (!navigator.bluetooth) {
      return [];
    }

    try {
      const devices = await navigator.bluetooth.getDevices();
      return devices.map((device: BluetoothDevice) => ({
        id: device.id,
        name: device.name || 'Unknown Printer',
        language: 'esc-pos' as const,
        codepageMapping: 'pc437',
        connected: this.printerInfo?.id === device.id && this.printerInfo?.connected || false
      }));
    } catch (error) {
      console.error('Failed to get available printers:', error);
      return [];
    }
  }

  // Check if Web Bluetooth API is supported
  static isSupported(): boolean {
    return 'bluetooth' in navigator;
  }
}

// Singleton instance
export const bluetoothPrinterService = new BluetoothPrinterService();
