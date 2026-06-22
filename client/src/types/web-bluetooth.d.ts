// Web Bluetooth API Type Definitions
// These types are not included in the default TypeScript library

export interface BluetoothDevice {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer | null;
  forget(): Promise<void>;
}

export interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
}

export interface BluetoothRemoteGATTService {
  uuid: string;
  getCharacteristic(characteristic: BluetoothCharacteristicUUID): Promise<BluetoothRemoteGATTCharacteristic>;
}

export interface BluetoothRemoteGATTCharacteristic {
  uuid: string;
  value?: DataView | null;
  writeValue(data: BufferSource): Promise<void>;
  startNotifications(): Promise<void>;
  stopNotifications(): Promise<void>;
  addEventListener(
    type: 'characteristicvaluechanged',
    listener: (event: Event) => void
  ): void;
}

export type BluetoothServiceUUID = string | BluetoothLEScanFilter['services'];
export type BluetoothCharacteristicUUID = string;

export interface BluetoothLEScanFilter {
  services?: BluetoothServiceUUID[];
  name?: string;
  namePrefix?: string;
}

export interface RequestDeviceOptions {
  acceptAllDevices?: boolean;
  filters?: BluetoothLEScanFilter[];
  optionalServices?: BluetoothServiceUUID[];
}

export interface Navigator {
  bluetooth?: {
    getDevices(): Promise<BluetoothDevice[]>;
    requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
    referrerDevice?: BluetoothDevice;
  };
}

declare global {
  interface Navigator {
    bluetooth?: {
      getDevices(): Promise<BluetoothDevice[]>;
      requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
      referrerDevice?: BluetoothDevice;
    };
  }
}
