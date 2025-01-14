import { ethers } from 'hardhat';

export const DEFAULT_ADMIN_ROLE =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
export const ADMIN_ROLE = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes('ADMIN_ROLE')
);
export const MINTER_ROLE = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes('MINTER_ROLE')
);
export const TRANSFERER_ROLE = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes('TRANSFERER_ROLE')
);

export const dimoRegistryName = 'DIMORegistry';

export const eip712Name = 'DIMO';
export const eip712Version = '1';
export const adMintCost = ethers.utils.parseEther('50');

export const MANUFACTURER_NFT_NAME = 'Dimo Manufacturer ID';
export const MANUFACTURER_NFT_SYMBOL = 'DIMO/MANUFACTURER';
export const MANUFACTURER_NFT_URI =
  'https://devices-api.dimo.zone/v1/manufacturer/';
export const VEHICLE_NFT_NAME = 'Dimo Vehicle ID';
export const VEHICLE_NFT_SYMBOL = 'DIMO/VEHICLE';
export const VEHICLE_NFT_URI = 'https://devices-api.dimo.zone/v1/vehicle/';
export const AD_NFT_NAME = 'Dimo Aftermarket Device ID';
export const AD_NFT_SYMBOL = 'DIMO/AFTERMARKET/DEVICE';
export const AD_NFT_URI =
  'https://devices-api.dimo.zone/v1/aftermarket/device/';

export const vehicleAttributes = ['Make', 'Model', 'Year'];
export const adAttributes = ['Serial', 'IMEI'];

export const manufacturerIdArgs = {
  name: 'ManufacturerId',
  args: [MANUFACTURER_NFT_NAME, MANUFACTURER_NFT_SYMBOL, MANUFACTURER_NFT_URI]
};
export const vehicleIdArgs = {
  name: 'VehicleId',
  args: [VEHICLE_NFT_NAME, VEHICLE_NFT_SYMBOL, VEHICLE_NFT_URI]
};
export const adIdArgs = {
  name: 'AftermarketDeviceId',
  args: [AD_NFT_NAME, AD_NFT_SYMBOL, AD_NFT_URI]
};
