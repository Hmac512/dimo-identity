//SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.13;

import "./interfaces/IDimoRegistry.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";

error ZeroAddress();
error InvalidLink(
    address idProxySource,
    address idProxyTraget,
    uint256 sourceId,
    uint256 targetId
);
error TransferFailed(address idProxy, uint256 id, string errorMessage);

contract DimoForwarder is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    IDimoRegistry public dimoRegistry;
    address public vehicleIdProxyAddress;
    address public adIdProxyAddress;

    // 0x42842e0e is the selector of safeTransferFrom(address,address,uint256)
    bytes4 public constant SAFE_TRANSFER_FROM = 0x42842e0e;
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address dimoRegistry_,
        address vehicleIdProxyAddress_,
        address adIdProxyAddress_
    ) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        dimoRegistry = IDimoRegistry(dimoRegistry_);
        vehicleIdProxyAddress = vehicleIdProxyAddress_;
        adIdProxyAddress = adIdProxyAddress_;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
    }

    /// @notice Sets the DIMO Registry address
    /// @dev Only an admin can set the DIMO Registry address
    /// @param dimoRegistry_ The address to be set
    function setDimoRegistryAddress(address dimoRegistry_)
        external
        onlyRole(ADMIN_ROLE)
    {
        if (dimoRegistry_ == address(0)) revert ZeroAddress();
        dimoRegistry = IDimoRegistry(dimoRegistry_);
    }

    /// @notice Sets the Vehicle ID proxy address
    /// @dev Only an admin can set the Vehicle ID proxy address
    /// @param vehicleIdProxyAddress_ The address to be set
    function setVehicleIdProxyAddress(address vehicleIdProxyAddress_)
        external
        onlyRole(ADMIN_ROLE)
    {
        vehicleIdProxyAddress = vehicleIdProxyAddress_;
    }

    /// @notice Sets the Aftermarket Device ID proxy address
    /// @dev Only an admin can set the Aftermarket Device ID proxy address
    /// @param adIdProxyAddress_ The address to be set
    function setAftermarketDeviceIdProxyAddress(address adIdProxyAddress_)
        external
        onlyRole(ADMIN_ROLE)
    {
        adIdProxyAddress = adIdProxyAddress_;
    }

    /// @notice Tranfers both Vehicle and Aftermarket Device Ids
    /// @dev Vehicle Id and Aftermarket Device Id must be paired
    /// @dev For the purpose of this contract, all requests must succeed
    /// @param vehicleId Vehicle Id to be transferred
    /// @param aftermarketDeviceId Aftermarket Device Id to be transferred
    /// @param to New Ids owner
    function transferVehicleAndAftermarketDeviceIds(
        uint256 vehicleId,
        uint256 aftermarketDeviceId,
        address to
    ) external {
        if (
            dimoRegistry.getLink(vehicleIdProxyAddress, vehicleId) !=
            aftermarketDeviceId
        )
            revert InvalidLink(
                vehicleIdProxyAddress,
                adIdProxyAddress,
                vehicleId,
                aftermarketDeviceId
            );

        _execTransfer(vehicleIdProxyAddress, to, vehicleId);
        _execTransfer(adIdProxyAddress, to, aftermarketDeviceId);
    }

    /// @notice Internal function to authorize contract upgrade
    /// @dev Caller must have the upgrader role
    /// @param newImplementation New contract implementation address
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}

    /**
     * @dev Executes a call encoding a safeTransferFrom from a ERC-721 proxy
     * @param proxy The proxy address that will call the function
     * @param to The address to send the token
     * @param id The token id
     */
    function _execTransfer(
        address proxy,
        address to,
        uint256 id
    ) private {
        (bool success, bytes memory data) = proxy.call(
            abi.encodePacked(
                abi.encodeWithSelector(SAFE_TRANSFER_FROM, msg.sender, to, id),
                msg.sender
            )
        );

        if (!success) {
            // Decodes the error message from bytes to string
            assembly {
                data := add(data, 0x04)
            }
            revert TransferFailed(proxy, id, abi.decode(data, (string)));
        }
    }
}
