import chai from 'chai';
import { waffle } from 'hardhat';

import {
  DIMORegistry,
  Eip712Checker,
  Nodes,
  Manufacturer,
  ManufacturerId,
  Vehicle,
  VehicleId
} from '../../typechain';
import {
  initialize,
  setup,
  createSnapshot,
  revertToSnapshot,
  signMessage,
  C
} from '../../utils';

const { expect } = chai;
const provider = waffle.provider;

describe('Vehicle', function () {
  let snapshot: string;
  let dimoRegistryInstance: DIMORegistry;
  let eip712CheckerInstance: Eip712Checker;
  let nodesInstance: Nodes;
  let manufacturerInstance: Manufacturer;
  let vehicleInstance: Vehicle;
  let manufacturerIdInstance: ManufacturerId;
  let vehicleIdInstance: VehicleId;

  const [admin, nonAdmin, manufacturer1, user1, user2] = provider.getWallets();

  before(async () => {
    const deployments = await setup(admin, {
      modules: ['Eip712Checker', 'Nodes', 'Manufacturer', 'Vehicle'],
      nfts: ['ManufacturerId', 'VehicleId'],
      upgradeableContracts: []
    });

    dimoRegistryInstance = deployments.DIMORegistry;
    eip712CheckerInstance = deployments.Eip712Checker;
    nodesInstance = deployments.Nodes;
    manufacturerInstance = deployments.Manufacturer;
    vehicleInstance = deployments.Vehicle;
    manufacturerIdInstance = deployments.ManufacturerId;
    vehicleIdInstance = deployments.VehicleId;

    const MANUFACTURER_MINTER_ROLE = await manufacturerIdInstance.MINTER_ROLE();
    await manufacturerIdInstance
      .connect(admin)
      .grantRole(MANUFACTURER_MINTER_ROLE, dimoRegistryInstance.address);

    const VEHICLE_MINTER_ROLE = await vehicleIdInstance.MINTER_ROLE();
    await vehicleIdInstance
      .connect(admin)
      .grantRole(VEHICLE_MINTER_ROLE, dimoRegistryInstance.address);

    // Set NFT Proxies
    await manufacturerInstance
      .connect(admin)
      .setManufacturerIdProxyAddress(manufacturerIdInstance.address);
    await vehicleInstance
      .connect(admin)
      .setVehicleIdProxyAddress(vehicleIdInstance.address);

    // Initialize EIP-712
    await eip712CheckerInstance.initialize(
      C.defaultDomainName,
      C.defaultDomainVersion
    );

    // Whitelist Manufacturer attributes
    await manufacturerInstance
      .connect(admin)
      .addManufacturerAttribute(C.mockManufacturerAttribute1);
    await manufacturerInstance
      .connect(admin)
      .addManufacturerAttribute(C.mockManufacturerAttribute2);

    // Whitelist Vehicle attributes
    await vehicleInstance
      .connect(admin)
      .addVehicleAttribute(C.mockVehicleAttribute1);
    await vehicleInstance
      .connect(admin)
      .addVehicleAttribute(C.mockVehicleAttribute2);
  });

  beforeEach(async () => {
    snapshot = await createSnapshot();
  });

  afterEach(async () => {
    await revertToSnapshot(snapshot);
  });

  describe('setVehicleIdProxyAddress', () => {
    let localVehicleInstance: Vehicle;
    beforeEach(async () => {
      const deployments = await initialize(admin, 'Vehicle');
      localVehicleInstance = deployments.Vehicle;
    });

    context('Error handling', () => {
      it('Should revert if caller does not have admin role', async () => {
        await expect(
          localVehicleInstance
            .connect(nonAdmin)
            .setVehicleIdProxyAddress(localVehicleInstance.address)
        ).to.be.revertedWith(
          `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${
            C.DEFAULT_ADMIN_ROLE
          }`
        );
      });
      it('Should revert if proxy is zero address', async () => {
        await expect(
          localVehicleInstance
            .connect(admin)
            .setVehicleIdProxyAddress(C.ZERO_ADDRESS)
        ).to.be.revertedWith('Non zero address');
      });
    });

    context('Events', () => {
      it('Should emit VehicleIdProxySet event with correct params', async () => {
        await expect(
          localVehicleInstance
            .connect(admin)
            .setVehicleIdProxyAddress(localVehicleInstance.address)
        )
          .to.emit(localVehicleInstance, 'VehicleIdProxySet')
          .withArgs(localVehicleInstance.address);
      });
    });
  });

  describe('addVehicleAttribute', () => {
    context('Error handling', () => {
      it('Should revert if caller does not have admin role', async () => {
        await expect(
          vehicleInstance
            .connect(nonAdmin)
            .addVehicleAttribute(C.mockVehicleAttribute1)
        ).to.be.revertedWith(
          `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${
            C.DEFAULT_ADMIN_ROLE
          }`
        );
      });
      it('Should revert if attribute already exists', async () => {
        await expect(
          vehicleInstance
            .connect(admin)
            .addVehicleAttribute(C.mockVehicleAttribute1)
        ).to.be.revertedWith('Attribute already exists');
      });
    });

    context('Events', () => {
      it('Should emit VehicleAttributeAdded event with correct params', async () => {
        await expect(
          vehicleInstance
            .connect(admin)
            .addVehicleAttribute(C.mockVehicleAttribute3)
        )
          .to.emit(vehicleInstance, 'VehicleAttributeAdded')
          .withArgs(C.mockVehicleAttribute3);
      });
    });
  });

  describe('mintVehicle', () => {
    beforeEach(async () => {
      await manufacturerInstance
        .connect(admin)
        .mintManufacturer(
          manufacturer1.address,
          C.mockManufacturerNames[0],
          C.mockManufacturerAttributeInfoPairs
        );
    });

    context('Error handling', () => {
      it('Should revert if caller does not have admin role', async () => {
        await expect(
          vehicleInstance
            .connect(nonAdmin)
            .mintVehicle(1, user1.address, C.mockVehicleAttributeInfoPairs)
        ).to.be.revertedWith(
          `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${
            C.DEFAULT_ADMIN_ROLE
          }`
        );
      });
      it('Should revert if parent node is not a manufacturer node', async () => {
        await expect(
          vehicleInstance
            .connect(admin)
            .mintVehicle(99, user1.address, C.mockVehicleAttributeInfoPairs)
        ).to.be.revertedWith('Invalid parent node');
      });
      it('Should revert if attribute is not whitelisted', async () => {
        await expect(
          vehicleInstance
            .connect(admin)
            .mintVehicle(
              1,
              user1.address,
              C.mockVehicleAttributeInfoPairsNotWhitelisted
            )
        ).to.be.revertedWith('Not whitelisted');
      });
    });

    context('State', () => {
      it('Should correctly set parent node', async () => {
        await vehicleInstance
          .connect(admin)
          .mintVehicle(1, user1.address, C.mockVehicleAttributeInfoPairs);

        const parentNode = await nodesInstance.getParentNode(
          vehicleIdInstance.address,
          1
        );
        expect(parentNode).to.be.equal(1);
      });
      it('Should correctly set node owner', async () => {
        await vehicleInstance
          .connect(admin)
          .mintVehicle(1, user1.address, C.mockVehicleAttributeInfoPairs);

        expect(await vehicleIdInstance.ownerOf(1)).to.be.equal(user1.address);
      });
      it('Should correctly set infos', async () => {
        await vehicleInstance
          .connect(admin)
          .mintVehicle(1, user1.address, C.mockVehicleAttributeInfoPairs);

        expect(
          await nodesInstance.getInfo(
            vehicleIdInstance.address,
            1,
            C.mockVehicleAttribute1
          )
        ).to.be.equal(C.mockVehicleInfo1);
        expect(
          await nodesInstance.getInfo(
            vehicleIdInstance.address,
            1,
            C.mockVehicleAttribute2
          )
        ).to.be.equal(C.mockVehicleInfo2);
      });
    });

    context('Events', () => {
      it('Should emit VehicleNodeMinted event with correct params', async () => {
        await expect(
          vehicleInstance
            .connect(admin)
            .mintVehicle(1, user1.address, C.mockVehicleAttributeInfoPairs)
        )
          .to.emit(vehicleInstance, 'VehicleNodeMinted')
          .withArgs(1, user1.address);
      });
      it('Should emit VehicleAttributeSet events with correct params', async () => {
        await expect(
          vehicleInstance
            .connect(admin)
            .mintVehicle(1, user1.address, C.mockVehicleAttributeInfoPairs)
        )
          .to.emit(vehicleInstance, 'VehicleAttributeSet')
          .withArgs(
            1,
            C.mockVehicleAttributeInfoPairs[0].attribute,
            C.mockVehicleAttributeInfoPairs[0].info
          )
          .to.emit(vehicleInstance, 'VehicleAttributeSet')
          .withArgs(
            1,
            C.mockVehicleAttributeInfoPairs[1].attribute,
            C.mockVehicleAttributeInfoPairs[1].info
          );
      });
    });
  });

  describe('mintVehicleSign', () => {
    let signature: string;
    before(async () => {
      signature = await signMessage({
        _signer: user1,
        _primaryType: 'MintVehicleSign',
        _verifyingContract: vehicleInstance.address,
        message: {
          manufacturerNode: '1',
          owner: user1.address,
          attributes: C.mockVehicleAttributes,
          infos: C.mockVehicleInfos
        }
      });
    });

    beforeEach(async () => {
      await manufacturerInstance
        .connect(admin)
        .mintManufacturer(
          manufacturer1.address,
          C.mockManufacturerNames[0],
          C.mockManufacturerAttributeInfoPairs
        );
    });

    context('Error handling', () => {
      it('Should revert if caller does not have admin role', async () => {
        await expect(
          vehicleInstance
            .connect(nonAdmin)
            .mintVehicleSign(
              1,
              user1.address,
              C.mockVehicleAttributeInfoPairs,
              signature
            )
        ).to.be.revertedWith(
          `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${
            C.DEFAULT_ADMIN_ROLE
          }`
        );
      });
      it('Should revert if parent node is not a manufacturer node', async () => {
        await expect(
          vehicleInstance
            .connect(admin)
            .mintVehicleSign(
              99,
              user1.address,
              C.mockVehicleAttributeInfoPairs,
              signature
            )
        ).to.be.revertedWith('Invalid parent node');
      });
      it('Should revert if attribute is not whitelisted', async () => {
        await expect(
          vehicleInstance
            .connect(admin)
            .mintVehicleSign(
              1,
              user1.address,
              C.mockVehicleAttributeInfoPairsNotWhitelisted,
              signature
            )
        ).to.be.revertedWith('Not whitelisted');
      });

      context('Wrong signature', () => {
        it('Should revert if domain name is incorrect', async () => {
          const invalidSignature = await signMessage({
            _signer: user1,
            _domainName: 'Wrong domain',
            _primaryType: 'MintVehicleSign',
            _verifyingContract: vehicleInstance.address,
            message: {
              manufacturerNode: '1',
              owner: user1.address,
              attributes: C.mockVehicleAttributes,
              infos: C.mockVehicleInfos
            }
          });

          await expect(
            vehicleInstance
              .connect(admin)
              .mintVehicleSign(
                1,
                user1.address,
                C.mockVehicleAttributeInfoPairs,
                invalidSignature
              )
          ).to.be.revertedWith('Invalid signature');
        });
        it('Should revert if domain version is incorrect', async () => {
          const invalidSignature = await signMessage({
            _signer: user1,
            _domainVersion: '99',
            _primaryType: 'MintVehicleSign',
            _verifyingContract: vehicleInstance.address,
            message: {
              manufacturerNode: '1',
              owner: user1.address,
              attributes: C.mockVehicleAttributes,
              infos: C.mockVehicleInfos
            }
          });

          await expect(
            vehicleInstance
              .connect(admin)
              .mintVehicleSign(
                1,
                user1.address,
                C.mockVehicleAttributeInfoPairs,
                invalidSignature
              )
          ).to.be.revertedWith('Invalid signature');
        });
        it('Should revert if domain chain ID is incorrect', async () => {
          const invalidSignature = await signMessage({
            _signer: user1,
            _chainId: 99,
            _primaryType: 'MintVehicleSign',
            _verifyingContract: vehicleInstance.address,
            message: {
              manufacturerNode: '1',
              owner: user1.address,
              attributes: C.mockVehicleAttributes,
              infos: C.mockVehicleInfos
            }
          });

          await expect(
            vehicleInstance
              .connect(admin)
              .mintVehicleSign(
                1,
                user1.address,
                C.mockVehicleAttributeInfoPairs,
                invalidSignature
              )
          ).to.be.revertedWith('Invalid signature');
        });
        it('Should revert if manufactuer node is incorrect', async () => {
          const invalidSignature = await signMessage({
            _signer: user1,
            _primaryType: 'MintVehicleSign',
            _verifyingContract: vehicleInstance.address,
            message: {
              manufacturerNode: '99',
              owner: user1.address,
              attributes: C.mockVehicleAttributes,
              infos: C.mockVehicleInfos
            }
          });

          await expect(
            vehicleInstance
              .connect(admin)
              .mintVehicleSign(
                1,
                user1.address,
                C.mockVehicleAttributeInfoPairs,
                invalidSignature
              )
          ).to.be.revertedWith('Invalid signature');
        });
        it('Should revert if attributes are incorrect', async () => {
          const invalidSignature = await signMessage({
            _signer: user1,
            _primaryType: 'MintVehicleSign',
            _verifyingContract: vehicleInstance.address,
            message: {
              manufacturerNode: '1',
              owner: user1.address,
              attributes: C.mockVehicleAttributes.slice(1),
              infos: C.mockVehicleInfos
            }
          });

          await expect(
            vehicleInstance
              .connect(admin)
              .mintVehicleSign(
                1,
                user1.address,
                C.mockVehicleAttributeInfoPairs,
                invalidSignature
              )
          ).to.be.revertedWith('Invalid signature');
        });
        it('Should revert if infos are incorrect', async () => {
          const invalidSignature = await signMessage({
            _signer: user1,
            _primaryType: 'MintVehicleSign',
            _verifyingContract: vehicleInstance.address,
            message: {
              manufacturerNode: '1',
              owner: user1.address,
              attributes: C.mockVehicleAttributes,
              infos: C.mockVehicleInfosWrongSize
            }
          });

          await expect(
            vehicleInstance
              .connect(admin)
              .mintVehicleSign(
                1,
                user1.address,
                C.mockVehicleAttributeInfoPairs,
                invalidSignature
              )
          ).to.be.revertedWith('Invalid signature');
        });
        it('Should revert if owner does not match signer', async () => {
          const invalidSignature = await signMessage({
            _signer: user1,
            _primaryType: 'MintVehicleSign',
            _verifyingContract: vehicleInstance.address,
            message: {
              manufacturerNode: '1',
              owner: user2.address,
              attributes: C.mockVehicleAttributes,
              infos: C.mockVehicleInfos
            }
          });

          await expect(
            vehicleInstance
              .connect(admin)
              .mintVehicleSign(
                1,
                user1.address,
                C.mockVehicleAttributeInfoPairs,
                invalidSignature
              )
          ).to.be.revertedWith('Invalid signature');
        });
      });
    });

    context('State', () => {
      it('Should correctly set parent node', async () => {
        await vehicleInstance
          .connect(admin)
          .mintVehicleSign(
            1,
            user1.address,
            C.mockVehicleAttributeInfoPairs,
            signature
          );

        const parentNode = await nodesInstance.getParentNode(
          vehicleIdInstance.address,
          1
        );
        expect(parentNode).to.be.equal(1);
      });
      it('Should correctly set node owner', async () => {
        await vehicleInstance
          .connect(admin)
          .mintVehicleSign(
            1,
            user1.address,
            C.mockVehicleAttributeInfoPairs,
            signature
          );

        expect(await vehicleIdInstance.ownerOf(1)).to.be.equal(user1.address);
      });
      it('Should correctly set infos', async () => {
        await vehicleInstance
          .connect(admin)
          .mintVehicleSign(
            1,
            user1.address,
            C.mockVehicleAttributeInfoPairs,
            signature
          );

        expect(
          await nodesInstance.getInfo(
            vehicleIdInstance.address,
            1,
            C.mockVehicleAttribute1
          )
        ).to.be.equal(C.mockVehicleInfo1);
        expect(
          await nodesInstance.getInfo(
            vehicleIdInstance.address,
            1,
            C.mockVehicleAttribute2
          )
        ).to.be.equal(C.mockVehicleInfo2);
      });
    });

    context('Events', () => {
      it('Should emit VehicleNodeMinted event with correct params', async () => {
        await expect(
          vehicleInstance
            .connect(admin)
            .mintVehicleSign(
              1,
              user1.address,
              C.mockVehicleAttributeInfoPairs,
              signature
            )
        )
          .to.emit(vehicleInstance, 'VehicleNodeMinted')
          .withArgs(1, user1.address);
      });
      it('Should emit VehicleAttributeSet events with correct params', async () => {
        await expect(
          vehicleInstance
            .connect(admin)
            .mintVehicleSign(
              1,
              user1.address,
              C.mockVehicleAttributeInfoPairs,
              signature
            )
        )
          .to.emit(vehicleInstance, 'VehicleAttributeSet')
          .withArgs(
            1,
            C.mockVehicleAttributeInfoPairs[0].attribute,
            C.mockVehicleAttributeInfoPairs[0].info
          )
          .to.emit(vehicleInstance, 'VehicleAttributeSet')
          .withArgs(
            1,
            C.mockVehicleAttributeInfoPairs[1].attribute,
            C.mockVehicleAttributeInfoPairs[1].info
          );
      });
    });
  });

  describe('setVehicleInfo', () => {
    beforeEach(async () => {
      await manufacturerInstance
        .connect(admin)
        .mintManufacturer(
          manufacturer1.address,
          C.mockManufacturerNames[0],
          C.mockManufacturerAttributeInfoPairs
        );
      await vehicleInstance
        .connect(admin)
        .mintVehicle(1, user1.address, C.mockVehicleAttributeInfoPairs);
    });

    context('Error handling', () => {
      it('Should revert if caller does not have admin role', async () => {
        await expect(
          vehicleInstance
            .connect(nonAdmin)
            .setVehicleInfo(1, C.mockVehicleAttributeInfoPairs)
        ).to.be.revertedWith(
          `AccessControl: account ${nonAdmin.address.toLowerCase()} is missing role ${
            C.DEFAULT_ADMIN_ROLE
          }`
        );
      });
      it('Should revert if node is not a vehicle', async () => {
        await expect(
          vehicleInstance
            .connect(admin)
            .setVehicleInfo(99, C.mockVehicleAttributeInfoPairs)
        ).to.be.revertedWith('Invalid vehicle node');
      });
      it('Should revert if attribute is not whitelisted', async () => {
        await expect(
          vehicleInstance
            .connect(admin)
            .setVehicleInfo(1, C.mockVehicleAttributeInfoPairsNotWhitelisted)
        ).to.be.revertedWith('Not whitelisted');
      });
    });

    context('State', () => {
      it('Should correctly set infos', async () => {
        const localNewAttributeInfoPairs = JSON.parse(
          JSON.stringify(C.mockVehicleAttributeInfoPairs)
        );
        localNewAttributeInfoPairs[0].info = 'New Info 0';
        localNewAttributeInfoPairs[1].info = 'New Info 1';

        expect(
          await nodesInstance.getInfo(
            vehicleIdInstance.address,
            1,
            C.mockVehicleAttribute1
          )
        ).to.be.equal(C.mockVehicleInfo1);
        expect(
          await nodesInstance.getInfo(
            vehicleIdInstance.address,
            1,
            C.mockVehicleAttribute2
          )
        ).to.be.equal(C.mockVehicleInfo2);

        await vehicleInstance
          .connect(admin)
          .setVehicleInfo(1, localNewAttributeInfoPairs);

        expect(
          await nodesInstance.getInfo(
            vehicleIdInstance.address,
            1,
            C.mockVehicleAttribute1
          )
        ).to.be.equal(localNewAttributeInfoPairs[0].info);
        expect(
          await nodesInstance.getInfo(
            vehicleIdInstance.address,
            1,
            C.mockVehicleAttribute2
          )
        ).to.be.equal(localNewAttributeInfoPairs[1].info);
      });
    });

    context('Events', () => {
      it('Should emit VehicleAttributeSet events with correct params', async () => {
        const localNewAttributeInfoPairs = JSON.parse(
          JSON.stringify(C.mockVehicleAttributeInfoPairs)
        );
        localNewAttributeInfoPairs[0].info = 'New Info 0';
        localNewAttributeInfoPairs[1].info = 'New Info 1';

        await expect(
          vehicleInstance
            .connect(admin)
            .setVehicleInfo(1, localNewAttributeInfoPairs)
        )
          .to.emit(vehicleInstance, 'VehicleAttributeSet')
          .withArgs(
            1,
            localNewAttributeInfoPairs[0].attribute,
            localNewAttributeInfoPairs[0].info
          )
          .to.emit(vehicleInstance, 'VehicleAttributeSet')
          .withArgs(
            1,
            localNewAttributeInfoPairs[1].attribute,
            localNewAttributeInfoPairs[1].info
          );
      });
    });
  });
});
